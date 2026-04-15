# API Status Code Contracts

This document defines the HTTP contract used by the Playwright API suite. Tests must assert these codes directly. If the backend returns a different code while the business behavior is otherwise correct, the test should fail and the mismatch should be treated as a backend defect.

## Default Rules

| Situation | Expected status |
| --- | --- |
| Successful read/search/detail | `200` |
| Successful create where API currently returns message/body but not a created resource URI | `200` |
| Successful update/delete/trigger | `200` |
| Missing or malformed input DTO | `400` |
| Missing authentication / invalid session on REST API | `401` |
| Authenticated but wrong role / forbidden scope | `403` |
| Resource id does not exist | `404` if controller models missing resource, otherwise `409` when business layer raises `BusinessException` |
| Business conflict rule | `409` |
| Invalid upload type / unsupported content | `415` when media-type validation exists, otherwise `400` |
| Internal or uncaught exception | `500` and must be treated as defect |

## Project-Specific Notes

- `GlobalExceptionHandler` maps `InputValidationException` to `400`.
- `GlobalExceptionHandler` maps `BusinessException` to `409`.
- `PaymentAPI` uses `ResponseStatusException`, so missing invoice is `404` and wrong role is `401` / `403`.
- REST endpoints under `com.estate.api` should not be accepted with `302` redirect semantics. If security still redirects to `/login`, tests keep the stricter API expectation and expose the mismatch.

## Assertion Rules

- Do not use broad status assertions such as `expect([200, 400, 500]).toContain(...)` in new or migrated tests.
- Prefer exact status assertions with a failure message that includes the endpoint and scenario.
- Only allow multiple expected statuses when the contract itself intentionally allows alternatives.
- If a test is intentionally documenting a known backend defect, annotate the test and keep the stricter expected contract in the defect log.
