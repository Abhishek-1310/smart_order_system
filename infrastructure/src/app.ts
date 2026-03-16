// ============================================================
// CDK App Entry Point
// ============================================================

import * as cdk from 'aws-cdk-lib';
import { SmartOrderStack } from './smart-order-stack';

const app = new cdk.App();

new SmartOrderStack(app, 'SmartOrderStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'ap-south-1',
  },
  description: 'Smart Order Processing System - Complete AWS Serverless Stack',
});

app.synth();
