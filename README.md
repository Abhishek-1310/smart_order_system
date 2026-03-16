# 🚀 Smart Order Processing System — AWS Serverless (FREE TIER)

A full-stack serverless order processing system built with **React + TypeScript** (frontend) and **Node.js + TypeScript + AWS CDK** (backend/infra). Runs entirely on **AWS Free Tier ($0/month)**.

---

## 📁 Project Structure

```
smart-order-system/
│
├── backend/                    # Lambda Functions (Node.js + TypeScript)
│   ├── src/
│   │   ├── config/
│   │   │   └── environment.ts       # Environment variable loader
│   │   ├── handlers/
│   │   │   ├── createOrder.ts       # POST /orders → Lambda
│   │   │   ├── getOrders.ts         # GET /orders → Lambda
│   │   │   ├── orderWorker.ts       # SQS → Lambda (async processor)
│   │   │   └── dailySummary.ts      # EventBridge → Lambda (scheduled)
│   │   ├── services/
│   │   │   ├── database.ts          # DynamoDB service
│   │   │   ├── cache.ts             # In-memory cache (Map + TTL)
│   │   │   ├── queue.ts             # SQS service
│   │   │   └── notification.ts      # SNS service
│   │   ├── types/
│   │   │   └── index.ts             # Shared TypeScript types
│   │   └── utils/
│   │       ├── logger.ts            # Structured JSON logger
│   │       └── response.ts          # API response helpers
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                   # React SPA (Vite + Tailwind CSS)
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.tsx
│   │   │   ├── LoadingSpinner.tsx
│   │   │   ├── StatusBadge.tsx
│   │   │   └── ProtectedRoute.tsx
│   │   ├── context/
│   │   │   └── AuthContext.tsx       # Cognito auth state management
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── SignUpPage.tsx
│   │   │   ├── DashboardPage.tsx
│   │   │   └── OrdersPage.tsx
│   │   ├── services/
│   │   │   ├── auth.ts              # Cognito auth functions
│   │   │   └── api.ts               # Axios API client
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── config.ts
│   │   └── index.css
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── package.json
│
├── infrastructure/             # AWS CDK (IaC)
│   ├── src/
│   │   ├── app.ts                   # CDK app entry
│   │   └── smart-order-stack.ts     # Complete AWS stack definition
│   ├── cdk.json
│   ├── package.json
│   └── tsconfig.json
│
├── PROJECT_NOTES.md            # Detailed build notes
├── README.md                   # ← You are here
├── package.json                # Root workspace
└── .gitignore
```

---

## 🏗️ Architecture Diagram

```
                           ┌──────────────────────┐
                           │   React Frontend      │
                           │   (S3 + CloudFront)   │
                           └──────────┬───────────┘
                                      │ HTTPS
                           ┌──────────▼───────────┐
                           │   Amazon Cognito      │
                           │   (JWT Auth)          │
                           └──────────┬───────────┘
                                      │ JWT Token
                           ┌──────────▼───────────┐
                           │   API Gateway         │
                           │   (REST + Cognito     │
                           │    Authorizer)        │
                           └─────┬──────────┬──────┘
                                 │          │
                    POST /orders │          │ GET /orders
                                 │          │
                    ┌────────────▼──┐  ┌───▼─────────────┐
                    │ CreateOrder   │  │ GetOrders        │
                    │ Lambda        │  │ Lambda           │
                    └───┬───────┬──┘  └───┬──────────┬───┘
                        │       │         │          │
               ┌────────▼───┐ ┌─▼─────┐ ┌─▼──────┐ ┌▼──────────┐
               │ DynamoDB   │ │ SQS   │ │In-Mem  │ │ DynamoDB  │
               │ (PutItem)  │ │ Queue │ │Cache   │ │ (Query)   │
               └────────────┘ └───┬───┘ └────────┘ └───────────┘
                                  │
                        ┌─────────▼─────────┐
                        │ OrderWorker Lambda │
                        │ (SQS Consumer)    │
                        └──┬────────┬───────┘
                           │        │
                     ┌─────▼────┐ ┌─▼──────────┐
                     │ DynamoDB │ │ SNS Topic   │
                     │ UPDATE   │ │ (Notify)    │
                     └──────────┘ └──────┬──────┘
                                         │
                                  ┌──────▼──────┐
                                  │ Email (SES) │
                                  └─────────────┘

        ┌───────────────────┐          ┌────────────────────┐
        │ EventBridge       │          │ CloudWatch Alarms  │
        │ (Daily 8 PM)     │          │ • SQS Depth > 50   │
        └───────┬───────────┘          │ • Lambda Errors >5 │
                │                      │ • DLQ Messages > 0 │
        ┌───────▼───────────┐          └────────┬───────────┘
        │ DailySummary      │                   │
        │ Lambda            │          ┌────────▼───────────┐
        └───────┬───────────┘          │ SNS Alert          │
                │                      └────────────────────┘
        ┌───────▼───────────┐
        │ SNS (Summary)     │
        └───────────────────┘
```

---

## 🛠️ AWS Services Used (ALL FREE TIER)

| Service | Purpose | Free Tier |
|---------|---------|-----------|
| **Amazon Cognito** | User sign-up/sign-in, JWT tokens | 50K MAU free |
| **API Gateway** | REST API + Cognito authorizer | 1M calls/month free |
| **AWS Lambda** | 4 functions (128 MB, no VPC) | 1M requests/month free |
| **Amazon DynamoDB** | Order storage (PAY_PER_REQUEST) | 25GB + 25 WCU/RCU free |
| **Amazon SQS** | Async order queue + DLQ | 1M requests/month free |
| **Amazon SNS** | Email notifications | 1M publishes/month free |
| **Amazon EventBridge** | Daily summary schedule | Free for AWS events |
| **Amazon CloudWatch** | Monitoring + alarms | 10 alarms free |
| **AWS CDK** | Infrastructure as Code | Free (tool) |

> **No VPC, no NAT Gateway, no RDS, no ElastiCache** → $0/month!

---

## 💻 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, React Router v6 |
| **Auth** | Amazon Cognito + `amazon-cognito-identity-js` |
| **API Client** | Axios with JWT interceptor |
| **Backend** | Node.js 18 (TypeScript), AWS Lambda (128 MB) |
| **Database** | Amazon DynamoDB (`@aws-sdk/client-dynamodb`) |
| **Cache** | In-memory Map with TTL (per Lambda instance) |
| **Queue** | AWS SDK v3 (`@aws-sdk/client-sqs`) |
| **Notifications** | AWS SDK v3 (`@aws-sdk/client-sns`) |
| **Infrastructure** | AWS CDK v2 (TypeScript) |

---

## 🚀 How to Run

### Prerequisites

1. **Node.js 18+** installed
2. **AWS CLI** configured with credentials (`aws configure`)
3. **AWS CDK** installed globally: `npm install -g aws-cdk`
4. **An AWS account** (Free Tier eligible)

### Step 1: Install Dependencies

```bash
cd smart-order-system

# Install all dependencies
npm run install:all

# Or manually:
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
cd infrastructure && npm install && cd ..
```

### Step 2: Build the Backend

```bash
cd backend
npm run build
```

### Step 3: Deploy Infrastructure to AWS

```bash
cd infrastructure

# Bootstrap CDK (first time only)
npx cdk bootstrap

# Deploy the full stack
npx cdk deploy SmartOrderStack
```

**CDK will provision:**
- DynamoDB table (PAY_PER_REQUEST)
- Cognito User Pool + App Client
- API Gateway + Lambda functions (no VPC)
- SQS Queue + DLQ
- SNS Topic
- EventBridge rule
- CloudWatch alarms

**After deploy, note the outputs:**
```
SmartOrderStack.APIEndpoint = https://xxxxx.execute-api.ap-south-1.amazonaws.com/prod/
SmartOrderStack.UserPoolId = ap-south-1_XXXXXXXXX
SmartOrderStack.UserPoolClientId = xxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Step 4: Configure Frontend Environment

```bash
cd frontend
cp .env.example .env
```

Edit `.env` with the values from CDK output:
```
VITE_API_URL=https://xxxxx.execute-api.ap-south-1.amazonaws.com/prod
VITE_COGNITO_USER_POOL_ID=ap-south-1_XXXXXXXXX
VITE_COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_AWS_REGION=ap-south-1
```

### Step 5: Run the Frontend

```bash
cd frontend
npm run dev
```

Open **http://localhost:3000** in your browser.

---

## 🧪 Testing the Flow

1. **Sign Up** → Creates user in Cognito → sends verification email
2. **Verify Email** → Enter the 6-digit code
3. **Sign In** → Gets JWT token
4. **Create Order** → `POST /orders` → DynamoDB (PENDING) → SQS → Worker Lambda → DynamoDB (COMPLETED) → SNS
5. **View Orders** → `GET /orders` → check in-memory cache → DynamoDB fallback → cache result
6. **Daily Summary** → EventBridge 8 PM → query DynamoDB → SNS email

---

## 🔐 Security Features

- **Cognito JWT validation** at API Gateway level
- **Least privilege IAM**: Each Lambda only has permissions it needs
- **No VPC needed**: DynamoDB/SQS/SNS are accessed via AWS SDK (HTTPS)
- **No hardcoded secrets** — all via environment variables
- **CORS** configured at API Gateway level

---

## 📊 Monitoring

### CloudWatch Alarms

| Alarm | Trigger | Action |
|-------|---------|--------|
| SQS Queue Length | > 50 messages for 10 min | SNS notification |
| Lambda Errors | > 5 errors in 10 min | SNS notification |
| DLQ Messages | > 0 messages | SNS notification |

---

## 💰 Cost Estimate

| Service | Monthly Cost |
|---------|-------------|
| Lambda | $0 (free tier) |
| API Gateway | $0 (free tier) |
| Cognito | $0 (free tier) |
| DynamoDB | $0 (free tier) |
| SQS | $0 (free tier) |
| SNS | $0 (free tier) |
| EventBridge | $0 |
| CloudWatch | $0 (free tier) |
| **Total** | **$0/month** |

---

## 🧹 Cleanup / Destroy

```bash
cd infrastructure
npx cdk destroy SmartOrderStack
```

This removes all AWS resources including the DynamoDB table and all data.

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Lambda timeout | Increase timeout in CDK (currently 30s) |
| 401 Unauthorized | JWT expired — sign in again; check Cognito User Pool ID |
| SQS messages in DLQ | Check CloudWatch logs for OrderWorker Lambda errors |
| CDK deploy fails | Run `cdk bootstrap` first; check IAM permissions |
| Frontend can't connect | Verify `.env` values match CDK output; check CORS |

---

## 🤝 Contributing

1. Fork the repo
2. Create a feature branch
3. Make changes
4. Build + test
5. Submit a PR
