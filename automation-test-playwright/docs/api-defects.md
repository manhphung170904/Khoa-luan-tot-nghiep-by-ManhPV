# API Defect Tracking

Use this document to record failures where the test script is correct but the backend contract is not.

## Classification

- `script issue`: wrong route, wrong payload, broken cleanup, or faulty helper.
- `backend defect`: wrong status code, wrong RBAC handling, validation not enforced, or uncaught exception.

## Current Focus Areas

| Area | Expected contract | Failure should be treated as |
| --- | --- | --- |
| REST auth on `com.estate.api` endpoints | `401` / `403`, not login redirect semantics | backend defect |
| Property request submit validation | `400` for invalid DTO, `409` for business conflict | backend defect |
| Staff and customer readonly APIs | real REST paths under `/api/v1/staff/**` and `/api/v1/customer/**` with JSON payloads | script issue if route is wrong, backend defect if auth/status is wrong |
| Payment QR APIs | `/payment-demo/**` with `401` / `403` / `404` / `200` / `302` according to controller contract | backend defect |

## Observed During Verification

| Endpoint area | Observed behavior | Expected contract | Classification |
| --- | --- | --- | --- |
| Customer readonly APIs | Anonymous and wrong-role requests return `302` | `401` / `403` | backend defect |
| Staff readonly APIs | Anonymous and wrong-role requests return `302` | `401` / `403` | backend defect |
| `POST /api/v1/customer/property-requests` | Request redirects (`302`) instead of creating a record | `200` and persisted request | backend defect |
| `GET /api/v1/staff/customers` | Staff happy-path request returned `500` in verification | `200` with paged JSON | backend defect |

## Source-of-truth Notes

- Khong dung lai MVC page paths nhu `/staff/.../search` hoac `/customer/.../list/page` de danh gia contract REST neu controller `com.estate.api.v1` da ton tai.
- Khong dung `/api/v1/payment/**` cho QR payment; controller hien tai map duoi `/payment-demo/**`.

## Workflow

1. Run the API suite.
2. For each failure, decide `script issue` or `backend defect`.
3. Fix `script issue` in test code immediately.
4. Leave `backend defect` tests strict and log the mismatch here or in issue tracking.

