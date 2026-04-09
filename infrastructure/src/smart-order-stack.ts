// ============================================================
// AWS CDK Stack: Smart Order Processing System (FREE TIER)
// ============================================================
//
// This stack uses ONLY AWS Free Tier services:
//
// 1. Amazon Cognito     → User authentication (free: 50K MAU)
// 2. API Gateway        → REST API (free: 1M calls/month)
// 3. AWS Lambda         → Business logic (free: 1M requests/month)
// 4. Amazon DynamoDB    → NoSQL database (free: 25GB + 25 RCU/WCU)
// 5. Amazon SQS         → Async processing (free: 1M requests/month)
// 6. Amazon SNS         → Notifications (free: 1M publishes/month)
// 7. Amazon EventBridge → Scheduled jobs (free)
// 8. CloudWatch         → Monitoring (free: 10 alarms)
//
// ❌ REMOVED (costly):
//    - RDS MySQL       (~$15/month) → replaced by DynamoDB (free)
//    - ElastiCache Redis (~$12/month) → replaced by in-memory TTL cache
//    - VPC + NAT Gateway (~$32/month) → not needed without RDS/Redis
//
// 💰 Estimated cost: $0/month (within Free Tier limits)
// ============================================================

import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cloudwatchActions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import { Construct } from 'constructs';

export class SmartOrderStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ================================================================
    // 1. DynamoDB — Orders Table (FREE: 25GB + 25 RCU/WCU)
    // ================================================================
    // Replaces RDS MySQL. No VPC, no NAT Gateway needed!
    const ordersTable = new dynamodb.Table(this, 'OrdersTable', {
      tableName: 'smart-orders',
      partitionKey: { name: 'user_id', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      timeToLiveAttribute: 'ttl',
    });

    // GSI: Query orders by status (for daily summary)
    ordersTable.addGlobalSecondaryIndex({
      indexName: 'StatusDateIndex',
      partitionKey: { name: 'status', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'created_at', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // ================================================================
    // 2. Amazon Cognito — User Authentication (FREE: 50K MAU)
    // ================================================================
    const userPool = new cognito.UserPool(this, 'SmartOrderUserPool', {
      userPoolName: 'smart-order-user-pool',
      selfSignUpEnabled: true,
      signInAliases: {
        email: true,
        username: true,
      },
      autoVerify: {
        email: true,
      },
      standardAttributes: {
        email: {
          required: true,
          mutable: true,
        },
        fullname: {
          required: false,
          mutable: true,
        },
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const userPoolClient = new cognito.UserPoolClient(
      this,
      'SmartOrderUserPoolClient',
      {
        userPool,
        userPoolClientName: 'smart-order-web-client',
        authFlows: {
          userPassword: true,
          userSrp: true,
        },
        generateSecret: false,
        accessTokenValidity: cdk.Duration.hours(1),
        idTokenValidity: cdk.Duration.hours(1),
        refreshTokenValidity: cdk.Duration.days(30),
      }
    );

    // ================================================================
    // 3. Amazon SQS — Order Processing Queue + DLQ (FREE: 1M req/month)
    // ================================================================
    const orderDLQ = new sqs.Queue(this, 'OrderDLQ', {
      queueName: 'smart-order-dlq',
      retentionPeriod: cdk.Duration.days(14),
    });

    const orderQueue = new sqs.Queue(this, 'OrderQueue', {
      queueName: 'smart-order-queue',
      visibilityTimeout: cdk.Duration.seconds(60),
      retentionPeriod: cdk.Duration.days(4),
      deadLetterQueue: {
        queue: orderDLQ,
        maxReceiveCount: 3,
      },
    });

    // ================================================================
    // 4. Amazon SNS — Notifications (FREE: 1M publishes/month)
    // ================================================================
    const orderNotificationTopic = new sns.Topic(this, 'OrderNotificationTopic', {
      topicName: 'smart-order-notifications',
      displayName: 'Smart Order Notifications',
    });

    // ================================================================
    // 5. Lambda Functions (FREE: 1M requests + 400K GB-sec/month)
    // ================================================================
    // No VPC needed! DynamoDB is accessed via AWS SDK over internet.
    // This saves ~$32/month (NAT Gateway).

    const lambdaEnvironment: Record<string, string> = {
      ORDERS_TABLE_NAME: ordersTable.tableName,
      SQS_QUEUE_URL: orderQueue.queueUrl,
      SNS_TOPIC_ARN: orderNotificationTopic.topicArn,
      REGION: cdk.Stack.of(this).region || 'ap-south-1',
      CACHE_TTL_SECONDS: '300',
    };

    // ── Create Order Lambda ──────────────────────────────────
    const createOrderFn = new lambda.Function(this, 'CreateOrderFunction', {
      functionName: 'smart-order-create',
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'handlers/createOrder.handler',
      code: lambda.Code.fromAsset('../backend/dist'),
      memorySize: 128,
      timeout: cdk.Duration.seconds(15),
      environment: lambdaEnvironment,
      tracing: lambda.Tracing.ACTIVE,
    });

    // ── Get Orders Lambda ────────────────────────────────────
    const getOrdersFn = new lambda.Function(this, 'GetOrdersFunction', {
      functionName: 'smart-order-get',
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'handlers/getOrders.handler',
      code: lambda.Code.fromAsset('../backend/dist'),
      memorySize: 128,
      timeout: cdk.Duration.seconds(15),
      environment: lambdaEnvironment,
      tracing: lambda.Tracing.ACTIVE,
    });

    // ── Order Worker Lambda (SQS Consumer) ───────────────────
    const orderWorkerFn = new lambda.Function(this, 'OrderWorkerFunction', {
      functionName: 'smart-order-worker',
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'handlers/orderWorker.handler',
      code: lambda.Code.fromAsset('../backend/dist'),
      memorySize: 128,
      timeout: cdk.Duration.seconds(60),
      environment: lambdaEnvironment,
      tracing: lambda.Tracing.ACTIVE,
    });

    // SQS → Worker Lambda trigger
    orderWorkerFn.addEventSource(
      new lambdaEventSources.SqsEventSource(orderQueue, {
        batchSize: 5,
        maxBatchingWindow: cdk.Duration.seconds(10),
        reportBatchItemFailures: true,
      })
    );

    // ── Daily Summary Lambda (EventBridge) ───────────────────
    const dailySummaryFn = new lambda.Function(this, 'DailySummaryFunction', {
      functionName: 'smart-order-daily-summary',
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'handlers/dailySummary.handler',
      code: lambda.Code.fromAsset('../backend/dist'),
      memorySize: 128,
      timeout: cdk.Duration.seconds(60),
      environment: lambdaEnvironment,
      tracing: lambda.Tracing.ACTIVE,
    });

    // ================================================================
    // 6. IAM Permissions (Least Privilege)
    // ================================================================

    // Lambda → DynamoDB
    ordersTable.grantReadWriteData(createOrderFn);
    ordersTable.grantReadData(getOrdersFn);
    ordersTable.grantReadWriteData(orderWorkerFn);
    ordersTable.grantReadData(dailySummaryFn);

    // Lambda → SQS
    orderQueue.grantSendMessages(createOrderFn);
    orderQueue.grantConsumeMessages(orderWorkerFn);

    // Lambda → SNS
    orderNotificationTopic.grantPublish(orderWorkerFn);
    orderNotificationTopic.grantPublish(dailySummaryFn);

    // ================================================================
    // 7. API Gateway — REST API (FREE: 1M calls/month for 12 months)
    // ================================================================
    const api = new apigateway.RestApi(this, 'SmartOrderAPI', {
      restApiName: 'Smart Order API',
      description: 'REST API for Smart Order Processing System',
      deployOptions: {
        stageName: 'prod',
        tracingEnabled: true,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        metricsEnabled: true,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: [
          'Content-Type',
          'Authorization',
          'X-Amz-Date',
          'X-Api-Key',
          'X-Amz-Security-Token',
        ],
      },
    });

    // Cognito Authorizer
    const cognitoAuthorizer = new apigateway.CognitoUserPoolsAuthorizer(
      this,
      'CognitoAuthorizer',
      {
        cognitoUserPools: [userPool],
        authorizerName: 'SmartOrderCognitoAuth',
      }
    );

    // /orders resource
    const ordersResource = api.root.addResource('orders');

    // POST /orders
    ordersResource.addMethod(
      'POST',
      new apigateway.LambdaIntegration(createOrderFn),
      {
        authorizer: cognitoAuthorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      }
    );

    // GET /orders
    ordersResource.addMethod(
      'GET',
      new apigateway.LambdaIntegration(getOrdersFn),
      {
        authorizer: cognitoAuthorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      }
    );

    // ================================================================
    // 8. EventBridge — Scheduled Daily Summary (FREE)
    // ================================================================
    // ================================================================
    // 8. EventBridge — Scheduled Weekly Summary (FREE)
    // ================================================================
    const dailySummaryRule = new events.Rule(this, 'DailySummaryRule', {
      ruleName: 'smart-order-weekly-summary',
      description: 'Triggers weekly order summary every Sunday at 8 PM UTC',
      schedule: events.Schedule.cron({
        minute: '0',
        hour: '20',
        weekDay: '0', // 0 = Sunday
      }),
    });

    dailySummaryRule.addTarget(
      new targets.LambdaFunction(dailySummaryFn, {
        retryAttempts: 2,
      })
    );

    // ================================================================
    // 9. CloudWatch Alarms (FREE: 10 alarms)
    // ================================================================

    const sqsQueueLengthAlarm = new cloudwatch.Alarm(
      this,
      'SQSQueueLengthAlarm',
      {
        alarmName: 'smart-order-sqs-queue-length',
        alarmDescription: 'Alarm when SQS queue has more than 50 messages',
        metric: orderQueue.metricApproximateNumberOfMessagesVisible({
          period: cdk.Duration.minutes(5),
          statistic: 'Maximum',
        }),
        threshold: 50,
        evaluationPeriods: 2,
        comparisonOperator:
          cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      }
    );

    const lambdaErrorAlarm = new cloudwatch.Alarm(this, 'LambdaErrorAlarm', {
      alarmName: 'smart-order-lambda-errors',
      alarmDescription: 'Alarm when Lambda error count exceeds 5',
      metric: orderWorkerFn.metricErrors({
        period: cdk.Duration.minutes(5),
        statistic: 'Sum',
      }),
      threshold: 5,
      evaluationPeriods: 2,
      comparisonOperator:
        cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    const dlqAlarm = new cloudwatch.Alarm(this, 'DLQAlarm', {
      alarmName: 'smart-order-dlq-messages',
      alarmDescription: 'Alarm when messages appear in DLQ',
      metric: orderDLQ.metricApproximateNumberOfMessagesVisible({
        period: cdk.Duration.minutes(5),
        statistic: 'Maximum',
      }),
      threshold: 0,
      evaluationPeriods: 1,
      comparisonOperator:
        cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    const snsAction = new cloudwatchActions.SnsAction(orderNotificationTopic);
    sqsQueueLengthAlarm.addAlarmAction(snsAction);
    lambdaErrorAlarm.addAlarmAction(snsAction);
    dlqAlarm.addAlarmAction(snsAction);

    // ================================================================
    // Stack Outputs
    // ================================================================
    new cdk.CfnOutput(this, 'APIEndpoint', {
      value: api.url,
      description: 'API Gateway endpoint URL',
    });

    new cdk.CfnOutput(this, 'UserPoolId', {
      value: userPool.userPoolId,
      description: 'Cognito User Pool ID',
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID',
    });

    new cdk.CfnOutput(this, 'OrderQueueUrl', {
      value: orderQueue.queueUrl,
      description: 'SQS Order Queue URL',
    });

    new cdk.CfnOutput(this, 'SNSTopicArn', {
      value: orderNotificationTopic.topicArn,
      description: 'SNS Notification Topic ARN',
    });

    new cdk.CfnOutput(this, 'DynamoDBTableName', {
      value: ordersTable.tableName,
      description: 'DynamoDB Orders Table Name',
    });
  }
}
