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
| Staff and customer readonly APIs | real REST paths with JSON payloads | script issue if route is wrong, backend defect if auth/status is wrong |
| Payment QR APIs | `401` / `403` / `404` / `200` / `302` according to controller contract | backend defect |

## Observed During Verification

| Endpoint area | Observed behavior | Expected contract | Classification |
| --- | --- | --- | --- |
| Customer readonly APIs | Anonymous and wrong-role requests return `302` | `401` / `403` | backend defect |
| Staff readonly APIs | Anonymous and wrong-role requests return `302` | `401` / `403` | backend defect |
| `POST /api/customer/property-request/submit` | Request redirects (`302`) instead of creating a record | `200` and persisted request | backend defect |
| `GET /staff/customers/search` | Staff happy-path request returned `500` in verification | `200` with paged JSON | backend defect |

## Workflow

1. Run the API suite.
2. For each failure, decide `script issue` or `backend defect`.
3. Fix `script issue` in test code immediately.
4. Leave `backend defect` tests strict and log the mismatch here or in issue tracking.
