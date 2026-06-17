# VNPAY Sandbox Payment Setup

This guide explains how to run the VNPAY sandbox payment flow in a local development environment. It covers exposing the local backend with an ngrok static domain, configuring the VNPAY sandbox merchant portal, initiating a payment, receiving the IPN webhook, and verifying that an order was paid successfully.

## 1. Payment Flow Overview

The VNPAY flow has two callbacks after the customer completes payment:

```text
Client -> Backend: create order
Client -> Backend: initiate VNPAY payment
Backend -> Client: return paymentUrl
Client -> VNPAY: open paymentUrl and complete payment
VNPAY -> Client: redirect browser to VNPAY_RETURN_URL
VNPAY -> Backend: call VNPAY_IPN_URL to confirm payment result
Backend: verify signature, mark order PAID, generate tickets
```

`VNPAY_RETURN_URL` and `VNPAY_IPN_URL` are different:

```text
VNPAY_RETURN_URL
The browser redirect URL after payment. This is a frontend page for showing the payment result to the customer.

VNPAY_IPN_URL
The server-to-server webhook URL. This is the URL the backend uses to update the order to PAID.
```

If the customer sees a successful payment in VNPAY but the order remains `AWAITING_PAYMENT`, check the IPN webhook first.

## 2. Why Use An Ngrok Static Domain

The local backend usually runs at:

```text
http://localhost:8080
```

VNPAY's server cannot call your machine's `localhost`. The backend must be exposed to the public internet:

```text
https://<your-static-domain>.ngrok-free.dev -> http://localhost:8080
```

Use an ngrok static domain because:

- VNPAY sandbox stores a fixed IPN URL in the merchant portal.
- A random ngrok domain changes whenever the tunnel restarts.
- If the domain changes, you must update the VNPAY sandbox IPN URL again.
- A static domain keeps Postman, `.env`, VNPAY portal settings, and documentation aligned.

Example static domain:

```text
https://unglaring-unsavoured-elene.ngrok-free.dev
```

## 3. Prerequisites

You need:

- TicketBox backend running locally on port `8080`.
- PostgreSQL running.
- An ngrok account with a static domain.
- A VNPAY sandbox merchant account.
- Terminal ID / Website code: `vnp_TmnCode`.
- Secret key: `vnp_HashSecret`.
- VNPAY sandbox payment URL:

```text
https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
```

Official VNPAY PAY documentation:

```text
https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html
```

VNPAY sandbox registration:

```text
https://sandbox.vnpayment.vn/devreg/
```

## 4. Register And Set Up Ngrok

Create an ngrok account:

```text
https://dashboard.ngrok.com/signup
```

After signing in:

1. Open the ngrok dashboard.
2. Find your auth token in the dashboard.
3. Install the ngrok Agent CLI for your operating system.
4. Connect the local CLI to your account:

```powershell
ngrok config add-authtoken <your-ngrok-auth-token>
```

Verify the CLI is installed:

```powershell
ngrok help
```

Every ngrok account has a free dev domain. In the dashboard, open the domain or endpoint area and copy your assigned static dev domain. It will look similar to:

```text
unglaring-unsavoured-elene.ngrok-free.dev
```

Use this static domain for the VNPAY IPN URL:

```text
https://<your-static-domain>.ngrok-free.dev/api/payments/webhooks/vnpay
```

Do not use a temporary random forwarding URL for VNPAY IPN, because VNPAY stores the IPN URL in the merchant portal. If the ngrok URL changes, VNPAY will keep calling the old URL and the backend will not receive payment results.

## 5. Register A VNPAY Sandbox Merchant Account

Open the VNPAY sandbox registration page:

```text
https://sandbox.vnpayment.vn/devreg/
```

Fill in the registration form:

```text
Website name:
TicketBox

Website URL:
https://<your-static-domain>.ngrok-free.dev

Registration email:
<your-email>

Password:
<your-password>
```

Use the ngrok static domain as the website URL because it is the public HTTPS URL VNPAY can reach during local development.

After registration, VNPAY sends or shows the sandbox connection information. Save these values:

```text
Terminal ID / Website code: vnp_TmnCode
Secret key: vnp_HashSecret
Sandbox payment URL: https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
```

Then log in to the merchant portal:

```text
https://sandbox.vnpayment.vn/merchantv2/
```

Use the merchant portal to configure the IPN URL later in this guide.

## 6. Local Environment Configuration

The `.env` file is for local development only. Do not commit real secrets.

If the backend runs from IntelliJ or the local machine, the datasource URL must use `localhost:5433`:

```env
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5433/ticketbox
SPRING_DATASOURCE_USERNAME=ticketbox
SPRING_DATASOURCE_PASSWORD=ticketbox
```

If the backend runs inside Docker Compose, use the Docker service name `postgres`:

```env
SPRING_DATASOURCE_URL=jdbc:postgresql://postgres:5432/ticketbox
```

Local payment configuration:

```env
PAYMENT_MOCK_BASE_URL=http://localhost:8080

VNPAY_PAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_RETURN_URL=http://localhost:5173/payment/result
VNPAY_IPN_URL=https://<your-static-domain>.ngrok-free.dev/api/payments/webhooks/vnpay
VNPAY_TMN_CODE=<your-vnp-tmn-code>
VNPAY_HASH_SECRET=<your-vnp-hash-secret>
```

Example:

```env
VNPAY_IPN_URL=https://unglaring-unsavoured-elene.ngrok-free.dev/api/payments/webhooks/vnpay
```

Notes:

- Do not wrap the secret in quotes.
- Do not add spaces around `=`.
- Restart the backend after changing `.env`.

## 7. Start The Ngrok Static Domain

Start the backend first:

```powershell
# Backend should be listening on localhost:8080
```

Then start ngrok:

```powershell
ngrok http --url=<your-static-domain>.ngrok-free.dev 8080
```

Example:

```powershell
ngrok http --url=unglaring-unsavoured-elene.ngrok-free.dev 8080
```

Open the ngrok inspector:

```text
http://127.0.0.1:4040
```

Use the inspector to confirm whether VNPAY called the backend webhook.

## 8. Configure VNPAY Sandbox

Log in to the VNPAY sandbox merchant portal:

```text
https://sandbox.vnpayment.vn/merchantv2/
```

Open the terminal configuration or notification settings page. The correct screen should contain fields similar to:

```text
IPN Url
IPN protocol
Hash algorithm
```

Set:

```text
IPN Url:
https://<your-static-domain>.ngrok-free.dev/api/payments/webhooks/vnpay

IPN protocol:
GET

Hash algorithm:
HMACSHA512
```

Example:

```text
https://unglaring-unsavoured-elene.ngrok-free.dev/api/payments/webhooks/vnpay
```

Save the configuration.

### About The Test Call IPN Button

The portal's `Test call IPN` button may send a fake test payload such as:

```text
vnp_SecureHash=hash_test
vnp_TxnRef=222222
vnp_OrderInfo=Test_call_ipn
```

That payload is not a real TicketBox transaction. The backend may return:

```json
{"RspCode":"97","Message":"Invalid VNPAY signature"}
```

That does not mean the real payment flow is broken. Verify the flow with a real sandbox payment created from TicketBox.

## 9. Create An Order And Initiate Payment

Log in as an audience user and get a JWT.

Create an order:

```http
POST http://localhost:8080/api/orders
Authorization: Bearer <audience_token>
Idempotency-Key: <unique-key>
Content-Type: application/json
```

Example body:

```json
{
  "concertId": "10000000-0000-0000-0000-000000000001",
  "items": [
    {
      "ticketTypeId": "20000000-0000-0000-0000-000000000002",
      "quantity": 1
    }
  ]
}
```

The response should contain:

```json
{
  "orderId": "uuid",
  "status": "AWAITING_PAYMENT",
  "totalAmount": 8500000,
  "paymentUrl": null,
  "expiresAt": "..."
}
```

Initiate VNPAY payment:

```http
POST http://localhost:8080/api/payments/{orderId}/initiate
Authorization: Bearer <audience_token>
Content-Type: application/json
```

Body:

```json
{
  "provider": "VNPAY"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "orderId": "uuid",
    "provider": "VNPAY",
    "providerRef": "uuid",
    "paymentUrl": "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?..."
  }
}
```

Open `paymentUrl` in the browser and complete payment.

## 10. Pay With A Sandbox Test Card

Use the sandbox test card:

```text
Bank: NCB
Card number: 9704198526191432198
Card holder: NGUYEN VAN A
Issue date: 07/15
OTP: 123456
```

After payment, VNPAY will:

- Redirect the browser to `VNPAY_RETURN_URL`.
- Call the backend through `VNPAY_IPN_URL`.

If the frontend at `localhost:5173` is not running, the browser may show:

```text
localhost refused to connect
```

That only means the frontend return page is not running. The backend can still update the order to `PAID` if the IPN webhook succeeds.

## 11. Verify IPN In Ngrok

Open:

```text
http://127.0.0.1:4040
```

After a real sandbox payment, you should see:

```text
GET /api/payments/webhooks/vnpay
```

Real payment query parameters usually include:

```text
vnp_ResponseCode=00
vnp_TransactionStatus=00
vnp_TxnRef=<order-id-or-provider-ref>
vnp_Amount=<amount * 100>
vnp_SecureHash=<real-hmac-sha512-hash>
```

Successful backend response:

```json
{
  "RspCode": "00",
  "Message": "Confirm Success"
}
```

If no request appears in the ngrok inspector, VNPAY did not call the IPN URL. Check:

- Ngrok is online.
- The domain in the VNPAY portal is correct.
- The backend is running on port `8080`.
- The IPN URL uses the correct path: `/api/payments/webhooks/vnpay`.

## 12. Verify The Order Was Paid

Call:

```http
GET http://localhost:8080/api/orders/{orderId}
Authorization: Bearer <audience_token>
```

The order is paid when the status is:

```text
PAID
```

Check generated tickets:

```http
GET http://localhost:8080/api/tickets
Authorization: Bearer <audience_token>
```

If the new tickets exist, the payment flow completed successfully.

You can also check the database:

```sql
select id, status, payment_provider, payment_ref, paid_at
from orders
where id = '<order_id>';
```

Expected:

```text
status = PAID
payment_provider = VNPAY
paid_at is not null
```

Check payment logs:

```sql
select order_id, provider, event_type, provider_ref, created_at, raw_payload
from payment_logs
where order_id = '<order_id>'
order by created_at desc;
```

Expected:

```text
event_type = SUCCESS
provider = VNPAY
```

## 13. Common Problems

### VNPAY Shows Invalid Signature

If the VNPAY payment page shows:

```text
Sai chu ky
```

Check:

- `VNPAY_TMN_CODE` matches the merchant terminal.
- `VNPAY_HASH_SECRET` is correct and has no quotes or extra spaces.
- The backend was restarted after changing `.env`.
- You are opening a new payment URL, not an old one.

### Order Remains AWAITING_PAYMENT After Payment

Check the ngrok inspector.

If there is no request:

```text
GET /api/payments/webhooks/vnpay
```

then VNPAY did not call the backend. Recheck the IPN URL in the VNPAY portal.

If there is a request but the response is not `RspCode=00`, inspect the response message:

```text
97 Invalid VNPAY signature
01 Order not found
04 Invalid amount
02 Order already confirmed / not payable
```

### Return Page Shows Localhost Refused To Connect

If the browser redirects to:

```text
http://localhost:5173/payment/result
```

and shows connection refused, the frontend is not running. Start it:

```powershell
cd frontend
npm install
npm run dev
```

This does not mean the payment failed. The backend only needs a successful IPN webhook to update the order.

### VNPAY Shows Order Does Not Exist Or Was Already Processed

If VNPAY shows:

```text
Don hang khong ton tai hoac da duoc xu ly
```

Common causes:

- You opened an old payment URL.
- `vnp_TxnRef` was already processed by VNPAY.
- The order payment window expired.

Quick test:

- Create a new order.
- Initiate a new payment.
- Open the new payment URL.

## 14. Successful Test Checklist

Before testing:

```text
[ ] Backend is running on localhost:8080
[ ] PostgreSQL is running
[ ] Ngrok static domain is online
[ ] VNPAY IPN URL is configured correctly in the portal
[ ] .env has the correct VNPAY_TMN_CODE and VNPAY_HASH_SECRET
```

After payment:

```text
[ ] Ngrok inspector shows GET /api/payments/webhooks/vnpay
[ ] Webhook response is {"RspCode":"00","Message":"Confirm Success"}
[ ] GET /api/orders/{orderId} returns status PAID
[ ] GET /api/tickets returns the new ticket
[ ] payment_logs contains event_type SUCCESS
```
