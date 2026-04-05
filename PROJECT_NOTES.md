# 📒 PROJECT NOTES — Smart Order Processing System (FREE TIER)

> Detailed notes on how this project was built, architecture decisions,
> how each AWS service connects, and step-by-step instructions to run.
> **Runs entirely on AWS Free Tier ($0/month).**

---

## 🏗️ How the Project Was Built

### Phase 1: Backend Lambda Functions (`/backend`)

The backend is a collection of **4 AWS Lambda functions** written in **Node.js + TypeScript**:

#### 1. `createOrder.ts` — POST /orders
- Extracts `userId` from Cognito JWT claims (`event.requestContext.authorizer.claims.sub`)
- Validates the request body (amount must be > 0 and < 999,999.99)
- Generates a UUID for the order using the `uuid` package
- Inserts into DynamoDB with status `PENDING` (PK=user_id, SK=id)
- Sends an `OrderMessage` to SQS for async processing
- Invalidates the user's in-memory cache
- Returns the new order ID

#### 2. `getOrders.ts` — GET /orders
- Extracts `userId` from Cognito JWT
- **Cache-Aside Pattern**:
  - First checks in-memory cache (Map with TTL)
  - If cache HIT → returns immediately (fast!)
  - If cache MISS → queries DynamoDB by partition key (user_id)
  - Stores the result in cache with **TTL = 300 seconds** (5 min)
- The response includes a `source` field ("cache" or "database") so the frontend can show it

#### 3. `orderWorker.ts` — SQS Consumer
- Triggered automatically when messages arrive in the SQS queue
- Processes in batches (batch size = 5)
- For each order message:
  - Simulates payment processing (random 500-2000ms delay, 95% success rate)
  - On success: updates DynamoDB status → `COMPLETED`, publishes SNS notification, invalidates cache
  - On failure: throws error → SQS retries up to 3 times → then sends to DLQ
- Uses `Promise.allSettled` for batch processing with partial failure handling

#### 4. `dailySummary.ts` — EventBridge Scheduled
- Triggered by EventBridge rule at 8 PM UTC daily
- Queries DynamoDB GSI (StatusDateIndex) for today's order statistics
- Publishes formatted summary to SNS topic
- Subscribers receive daily email digest

### Phase 2: Shared Services (`/backend/src/services`)

#### `database.ts` — DynamoDB Service
- Uses `@aws-sdk/client-dynamodb` with `marshall`/`unmarshall` from `@aws-sdk/util-dynamodb`
- Client is created once and reused across Lambda warm starts (lazy singleton)
- **Table Design**:
  - PK: `user_id` (partition key) — groups all orders by user
  - SK: `id` (sort key) — order UUID for uniqueness
  - GSI: `StatusDateIndex` — PK: `status`, SK: `created_at` (for daily summary queries)
- Functions: `createOrder()` (PutItem), `getOrdersByUserId()` (Query by PK), `updateOrderStatus()` (UpdateItem), `getDailySummary()` (Query GSI)
- No `initializeDatabase()` needed — DynamoDB table is created by CDK

#### `cache.ts` — In-Memory Cache Service
- Simple `Map<string, CacheEntry>` with TTL expiration
- Works within a single Lambda execution context (warm starts benefit from cache)
- **No external dependencies** — replaces ElastiCache Redis at $0 cost
- Functions: `getCachedOrders()` (returns null on miss/expiry), `cacheOrders()` (stores with TTL), `invalidateOrdersCache()` (deletes entry)
- All functions are synchronous (no network calls)

#### `queue.ts` — SQS Service
- Uses `@aws-sdk/client-sqs` (AWS SDK v3)
- Sends `OrderMessage` as JSON string with message attributes (OrderId, UserId)

#### `notification.ts` — SNS Service
- Uses `@aws-sdk/client-sns` (AWS SDK v3)
- Three notification types: order completion, daily summary, alarm alerts
- Messages include formatted text with emojis for readability

### Phase 3: Infrastructure as Code (`/infrastructure`)

The entire AWS stack is defined in a **single CDK stack** (`smart-order-stack.ts`):

#### DynamoDB Table
- **Billing**: PAY_PER_REQUEST (on-demand) — free for low traffic
- **PK**: `user_id` (String), **SK**: `id` (String)
- **GSI**: `StatusDateIndex` (PK: `status`, SK: `created_at`) — for daily summary queries
- **TTL**: `ttl` attribute (optional, for auto-expiring old orders)
- Point-in-time recovery enabled

#### Lambda Functions (No VPC!)
- All 4 Lambdas run **outside VPC** — no NAT Gateway needed ($0)
- Memory: **128 MB** (minimum, cost-effective)
- Timeout: 30 seconds
- Runtime: Node.js 18
- DynamoDB/SQS/SNS accessed via AWS SDK over HTTPS (public endpoints)

#### Why These Design Choices?
| Decision | Reason |
|----------|--------|
| **DynamoDB instead of RDS** | Free tier (25GB + 25 WCU/RCU), no VPC needed, serverless |
| **In-memory cache instead of Redis** | $0 cost, works for Lambda warm starts, no ElastiCache |
| **No VPC** | Lambdas don't need VPC for DynamoDB/SQS/SNS → eliminates $32/mo NAT Gateway |
| **PAY_PER_REQUEST billing** | Perfect for low-traffic/demo apps, no provisioned capacity to pay for |
| **128 MB Lambda** | Minimum memory, sufficient for DynamoDB SDK operations |
| **SQS batch size 5** | Process multiple orders per invocation for efficiency |
| **DLQ after 3 retries** | Prevent infinite retry loops, allow manual investigation |
| **GSI for daily summary** | Query by status + date range without scanning entire table |

### Phase 4: React Frontend (`/frontend`)

#### Tech Stack
- **Vite** for fast builds and HMR
- **React 18** with functional components and hooks
- **TypeScript** for type safety
- **Tailwind CSS** for styling (utility-first)
- **React Router v6** for client-side routing
- **React Hot Toast** for notifications
- **Lucide React** for icons
- **Axios** for HTTP requests with JWT interceptor

#### Authentication Flow
1. `AuthContext.tsx` wraps the entire app with auth state
2. On mount, checks for existing Cognito session (`getCurrentUser()`)
3. Sign-up creates a Cognito user → sends verification email
4. Sign-in authenticates and gets JWT tokens
5. `ProtectedRoute` component redirects unauthenticated users to `/login`
6. Axios interceptor automatically attaches `Authorization: Bearer <token>` to all API requests

#### Pages
- **LoginPage** — Email/password sign-in with Cognito
- **SignUpPage** — Registration + email verification (2-step flow)
- **DashboardPage** — Stats cards, recent orders, data source indicator, architecture info
- **OrdersPage** — Full orders table + create order modal with flow explanation

---

## 🔧 Environment Variables

### Backend Lambda (set by CDK)
| Variable | Description |
|----------|-------------|
| `ORDERS_TABLE_NAME` | DynamoDB table name |
| `SQS_QUEUE_URL` | SQS queue URL |
| `SNS_TOPIC_ARN` | SNS topic ARN |
| `REGION` | AWS region |
| `CACHE_TTL_SECONDS` | In-memory cache TTL (default: 300) |

### Frontend (set in `.env`)
| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | API Gateway endpoint URL |
| `VITE_COGNITO_USER_POOL_ID` | Cognito User Pool ID |
| `VITE_COGNITO_CLIENT_ID` | Cognito App Client ID |
| `VITE_AWS_REGION` | AWS region |

---

## 🗄️ DynamoDB Table Design

```
Table: SmartOrders

Partition Key (PK): user_id  (String)  — Cognito user sub
Sort Key (SK):      id       (String)  — Order UUID

Attributes:
  - amount      (Number)   — Order amount
  - status      (String)   — PENDING | COMPLETED | FAILED
  - created_at  (String)   — ISO 8601 timestamp
  - ttl         (Number)   — Optional TTL (Unix epoch)

GSI: StatusDateIndex
  PK: status      — Enables queries by order status
  SK: created_at  — Enables date range filtering
  Projections: ALL
```

**Access Patterns:**
| Pattern | DynamoDB Operation |
|---------|-------------------|
| Get user's orders | `Query` PK=user_id (ScanIndexForward=false for newest first) |
| Create order | `PutItem` with user_id + id |
| Update order status | `UpdateItem` with user_id + id, SET status |
| Daily summary by status | `Query` GSI StatusDateIndex, PK=status, SK begins_with(date) |

---

## 🔄 Request/Response Examples

### POST /orders
**Request:**
```json
{
  "amount": 99.99,
  "descrption":"....",
  "name":"...."
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Order created successfully. Processing will begin shortly.",
  "data": {
    "orderId": "550e8400-e29b-41d4-a716-446655440000",
    "amount": 99.99,
    "status": "PENDING",
    "createdAt": "2026-02-26T10:30:00.000Z"
  }
}
```

### GET /orders
**Response (200) — Cache Hit:**
```json
{
  "success": true,
  "message": "Orders retrieved from cache",
  "data": {
    "orders": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "user_id": "abc-123-def",
        "amount": 99.99,
        "status": "COMPLETED",
        "created_at": "2026-02-26T10:30:00.000Z"
      }
    ],
    "source": "cache"
  }
}
```

---

## ⚡ Complete Flow Walkthrough

### Order Creation → Processing → Notification

```
User clicks "Create Order" ($99.99)
    │
    ▼
[Frontend] POST /orders { amount: 99.99 }
    │  (Authorization: Bearer <JWT>)
    ▼
[API Gateway] Validates JWT via Cognito Authorizer
    │
    ▼
[CreateOrder Lambda]
    ├── Validates: amount > 0 ✓
    ├── Generates UUID: "abc-123"
    ├── PutItem → DynamoDB (status: PENDING)
    ├── SendMessage → SQS Queue
    ├── Invalidate in-memory cache for user
    └── Response: 201 { orderId: "abc-123" }
    
    ▼ (asynchronous, ~seconds later)
    
[SQS Queue] delivers message to...
    │
    ▼
[OrderWorker Lambda]
    ├── Parses OrderMessage from SQS
    ├── Simulates payment (random delay)
    ├── If SUCCESS:
    │   ├── UpdateItem SET status='COMPLETED' → DynamoDB
    │   ├── Publish "Order Processed" → SNS Topic
    │   └── Invalidate in-memory cache for user
    └── If FAILURE:
        ├── Throws error → SQS retries (up to 3x)
        └── After 3 failures → message goes to DLQ

    ▼
[SNS Topic] sends email to subscribers
    │
    ▼
[User's Email]
    "✅ Order Processed Successfully!
     Order ID: abc-123
     Amount: $99.99
     Status: COMPLETED"
```

### Get Orders → Cache Flow

```
User navigates to Orders page
    │
    ▼
[Frontend] GET /orders
    │
    ▼
[GetOrders Lambda]
    ├── Check in-memory cache (Map with TTL)
    │
    ├── Cache HIT? ──YES──→ Return cached data (source: "cache")
    │                        (Response time: ~1ms — no network!)
    │
    └── Cache MISS? ──→ Query DynamoDB (PK=user_id)
                        │
                        ├── Store in in-memory cache (TTL = 300s)
                        │
                        └── Return data (source: "database")
                            (Response time: ~10-30ms)
```

---

---

## 🏃 Quick Start Commands

```bash
# 1. Clone and install
cd smart-order-system
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
cd infrastructure && npm install && cd ..

# 2. Build backend
cd backend && npm run build && cd ..

# 3. Deploy to AWS (requires AWS credentials)
cd infrastructure
npx cdk bootstrap        # First time only
npx cdk deploy SmartOrderStack

# 4. Copy CDK outputs to frontend .env
cd ../frontend
cp .env.example .env
# Edit .env with values from CDK output

# 5. Start frontend
npm run dev
# → Opens http://localhost:3000

# 6. Clean up when done
cd ../infrastructure
npx cdk destroy SmartOrderStack
```

---

## 📚 What I Learned Building This

1. **DynamoDB is perfect for serverless** — no VPC, no connection pooling, pay-per-request
3. **In-memory cache works for Lambda** — warm starts reuse the cache, cold starts are fast enough
4. **GSI design matters** — StatusDateIndex enables efficient daily summary queries
5. **Cache-aside still works** — Even with in-memory cache, the pattern (check → miss → query → store) is valid
6. **DLQ is essential** — Without it, failed messages retry forever and block the queue
7. **Structured logging** — JSON logs make CloudWatch Insights queries much easier
8. **CDK > CloudFormation** — Writing infra in TypeScript is far more readable and maintainable
9. **Cognito integration** — API Gateway handles JWT validation automatically, no code needed in Lambda

---

*Last updated: February 2026*
