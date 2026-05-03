# Phone Number Verifier

OTP-based phone verification: send a code to a phone, verify it, get a JWT, use that JWT to access a protected route. Backend is Node.js + Express + MongoDB. SMS goes through Twilio (or a console transport for local testing). The same Express app boots locally or runs on AWS Lambda behind API Gateway.

## Stack

| Layer | Choice |
|---|---|
| Runtime | Node.js 20 |
| API | Express 5 |
| DB | MongoDB / Mongoose 8 |
| Auth | JWT (HS256) |
| SMS | Twilio (or console) |
| Deploy | AWS Lambda + API Gateway HTTP API via Serverless Framework v3 |
| Frontend | React 18 + Vite (plain JS) |

## API

| Method | Path | Auth | Body | Response |
|---|---|---|---|---|
| POST | `/api/send-otp` | none | `{ "phone": "+14155552671" }` | `{ message, expiresAt }` |
| POST | `/api/verify-otp` | none | `{ "phone", "code": "123456" }` | `{ token, user }` |
| GET | `/api/me` | `Authorization: Bearer <token>` | — | `{ id, phone, isVerified }` |

Errors: `{ "error": "<message>" }` with appropriate status code.

## File layout

```
phone-number-verifier/
├── backend/
│   ├── src/
│   │   ├── config.js     env loading + validation
│   │   ├── db.js         mongoose connection (cached)
│   │   ├── models.js     User + OtpRecord schemas
│   │   ├── sms.js        Twilio / console transport
│   │   ├── otp.js        generate, hash, verify
│   │   ├── jwt.js        sign + verify
│   │   ├── auth.js       JWT middleware
│   │   ├── routes.js     three route handlers
│   │   ├── app.js        Express factory
│   │   └── server.js     local dev entry
│   ├── lambda.js         AWS Lambda handler
│   ├── serverless.yml    AWS deploy config
│   ├── .env / .env.example
│   └── package.json
└── frontend/
    ├── src/              React tester (App.jsx, api.js)
    ├── vite.config.js    proxies /api → backend on :3000
    └── package.json
```

## Run locally

### 1. Backend (terminal 1)

```bash
cd backend
nvm use                          # activates Node 20 from .nvmrc — REQUIRED
npm install                      # first time only
# edit .env: replace the MONGO_URI placeholder with your Atlas connection string
npm run dev
```

You should see `MongoDB connected` and `Server listening on http://localhost:3000`.

### 2. Frontend (terminal 2)

```bash
cd frontend
nvm use                          # REQUIRED
npm install                      # first time only
npm run dev
```

Open http://localhost:5173. Click through: send OTP → verify → call `/api/me`.

By default `SMS_TRANSPORT=console`, so the OTP prints in **terminal 1** (the backend). To send real SMS, see "Switch to Twilio" below.

## Switch to Twilio (real SMS)

1. Get from https://console.twilio.com (Account Info panel):
   - **Account SID** — starts with `AC`, 34 chars total
   - **Auth Token** — click "Show" to reveal, 32 hex chars
   - **From number** — your Twilio number from Phone Numbers → Active numbers (E.164: `+15551234567`)
2. **Trial accounts only:** verify the destination phone in Phone Numbers → **Verified Caller IDs**.
3. Edit `backend/.env`:
   ```
   TWILIO_ACCOUNT_SID=AC...
   TWILIO_AUTH_TOKEN=...
   TWILIO_FROM_NUMBER=+15551234567
   SMS_TRANSPORT=twilio
   ```
4. Restart `npm run dev`. The server will validate the creds at boot and refuse to start with a clear error if any are wrong.

---

# AWS Lambda + API Gateway

## How the deploy works in this project

1. **`backend/lambda.js`** — wraps the Express app with [`serverless-http`](https://github.com/dougmoscrop/serverless-http) so the same `createApp()` runs unchanged inside Lambda. The mongoose connection promise is cached at module scope, so repeat (warm) Lambda invocations reuse the connection — no new mongo handshake per request.
2. **`backend/serverless.yml`** — Serverless Framework v3 config. It declares one Lambda function (`api`) and an **API Gateway HTTP API** that proxies every incoming request (`ANY /` and `ANY /{proxy+}`) to the function. Express does the actual routing inside the Lambda.
3. **`npm run deploy`** — runs `serverless deploy`, which:
   - Bundles `backend/` (excluding test/dev artifacts via `package.patterns`),
   - Uploads it to a CloudFormation stack,
   - Creates the Lambda + API Gateway + IAM role + log group,
   - Prints the public API Gateway URL.
4. **Env vars** — passed from your shell to the Lambda at deploy time (`useDotenv: true` also reads `backend/.env` automatically). `MONGO_URI` and `JWT_SECRET` are required.

That's the entire deploy machinery — one Lambda, one HTTP API, no VPC / load balancer / containers / EC2.

## Deploy steps

### One-time setup

1. **Install AWS CLI credentials.** Either:
   - configure `~/.aws/credentials` with `aws configure`, or
   - export `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION` in your shell.

   The IAM principal needs permission to create CloudFormation stacks, Lambda functions, IAM roles, API Gateway HTTP APIs, and CloudWatch Logs. The simplest way during development is `AdministratorAccess`; tighten later.

2. **MongoDB Atlas Network Access.** Lambda runs in AWS-managed networking with a wide IP range. The simplest path is Atlas → Network Access → Add IP Address → "Allow access from anywhere" (`0.0.0.0/0`) — fine for testing. For production, put Lambda in a VPC + use Atlas peering or a NAT gateway.

3. **Set the secrets in your shell** (or rely on `backend/.env`, which is also read because `useDotenv: true` is on):
   ```bash
   export MONGO_URI='mongodb+srv://USER:PASS@cluster.example.mongodb.net/phone_verifier'
   export JWT_SECRET="$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")"
   # Optional: if you want Twilio in the cloud too
   export SMS_TRANSPORT=twilio
   export TWILIO_ACCOUNT_SID=AC...
   export TWILIO_AUTH_TOKEN=...
   export TWILIO_FROM_NUMBER=+15551234567
   ```

### Run API Gateway + Lambda locally (no AWS account needed)

```bash
cd backend
nvm use
npm run offline
```

`serverless-offline` emulates API Gateway HTTP API + Lambda on `http://localhost:3000`. Same routes, same handler, same env. Useful for testing the Lambda code path before pushing to AWS.

### Deploy

```bash
cd backend
nvm use
npm run deploy           # deploys to "dev" stage
# or
npm run deploy:prod      # deploys to "prod" stage
```

Output ends with something like:
```
endpoints:
  ANY - https://abc123xyz.execute-api.us-east-1.amazonaws.com
  ANY - https://abc123xyz.execute-api.us-east-1.amazonaws.com/{proxy+}
functions:
  api: phone-number-verifier-dev-api
```

Test it:
```bash
curl -X POST https://abc123xyz.execute-api.us-east-1.amazonaws.com/api/send-otp \
  -H 'content-type: application/json' \
  -d '{"phone":"+14155552671"}'
```

### Point the frontend at the deployed backend

```bash
cd frontend
echo 'VITE_API_URL=https://abc123xyz.execute-api.us-east-1.amazonaws.com' > .env.local
npm run dev
```

(When `VITE_API_URL` is set, the Vite proxy is bypassed and requests go straight to the deployed API.)

### Tear down

```bash
cd backend
npm run remove           # deletes the entire CloudFormation stack
```

## What gets deployed

- 1× **Lambda function** — Node 20, arm64, 512 MB, 15 s timeout
- 1× **API Gateway HTTP API** — catches `ANY /` + `ANY /{proxy+}`, forwards to the Lambda
- 1× **IAM execution role** — Lambda's basic execution permissions only
- 1× **CloudWatch log group** — 14-day retention

No EC2, no VPC, no load balancer, no containers. Pay-per-request — basically free at low traffic.

## Common deploy issues

| Symptom | Cause | Fix |
|---|---|---|
| `Cannot resolve variable at "provider.environment.MONGO_URI"` | shell env not set | `export MONGO_URI=...` then re-run |
| `MongooseServerSelectionError: ... timed out` (in Lambda logs) | Atlas blocking Lambda's IP | Atlas → Network Access → allow `0.0.0.0/0` (or VPC peering) |
| `502 Bad Gateway` from API Gateway | Lambda crashed during cold-start (likely env validation) | check CloudWatch logs — fix the env vars |
| `User: arn:... is not authorized to perform: cloudformation:...` | IAM principal missing permissions | use a user with `AdministratorAccess` for first deploy |
