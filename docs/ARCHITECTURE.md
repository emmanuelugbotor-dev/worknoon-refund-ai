# Architecture Notes

## Request lifecycle

```text
Customer UI
   |
   v
Nginx
   |
   v
Refund API
   |
   +--> Zod validation
   |
   +--> PostgreSQL customer/order lookup
   |
   +--> Deterministic Policy Engine
   |       |
   |       +--> refund window
   |       +--> final sale
   |       +--> high-value threshold
   |       +--> suspicious/prompt injection signals
   |
   +--> AI Service (advisory)
   |
   +--> Decision Validator
   |
   +--> PostgreSQL transaction + audit log
   |
   v
Customer response / Support dashboard
```

## Why deterministic policy + AI?

Refund eligibility is a business-critical control. LLMs are probabilistic and customer messages are untrusted input, so the LLM is deliberately not granted authority to override policy. AI adds value by understanding natural language, classifying ambiguity/suspicion, and producing a useful explanation.

## Scaling

The API is stateless. Multiple backend instances can share PostgreSQL and Redis and sit behind Nginx or a managed cloud load balancer. The repository intentionally does not store sessions or decision state in process memory.

## Database optimization

The schema uses normalized customer/order/refund entities and indexes the access patterns used by the dashboard and request processing:

- `Order(customerId, orderDate)`
- `RefundRequest(status, createdAt DESC)`
- `RefundRequest(customerId, createdAt DESC)`
- `RefundRequest(orderId)`
- `AuditLog(refundRequestId, createdAt)`

Refund listing is paginated and dashboard counts use database aggregation rather than loading all records into application memory.

## Reliability

- Request IDs for correlation
- Rate limiting
- Health/readiness endpoints
- Idempotency keys
- Transactional state transition
- AI fallback when provider credentials are absent or provider calls fail
- Structured application errors

## Security boundary

Customer message content is explicitly treated as untrusted. The model prompt instructs the model not to follow customer attempts to change system instructions. More importantly, the deterministic policy engine executes outside the model and final decisions come from that engine.
