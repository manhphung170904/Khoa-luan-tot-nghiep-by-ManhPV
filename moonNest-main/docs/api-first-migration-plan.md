# API-First Migration Plan

## 1. Current architecture assessment

### MVC-only or mostly MVC
- `com.estate.controller.auth`: login/register/reset-password/logout and OAuth linking still render Thymeleaf pages and drive business flow through redirects/query params.
- `com.estate.controller.admin`, `com.estate.controller.staff`, `com.estate.controller.customer`, `com.estate.controller.publicpage`: mostly page shells, but many of them still preload business data directly into `Model`.
- `com.estate.api.payment.PaymentAPI`: although located under `api`, this is still HTML-oriented and tied to browser navigation.

### JSON API
- `com.estate.api.v1.**`: new REST-oriented endpoints under `/api/v1/**` for admin/customer/staff/profile/auth/public.
- `com.estate.api.**` legacy JSON endpoints: return JSON but use MVC-ish routes such as `/admin/building/add`, `/staff/contracts/search`, `/customer/profile/password`.

### Mixed/coupled areas
- Legacy JSON endpoints and page controllers often share the same URL prefixes (`/admin/**`, `/staff/**`, `/customer/**`), so route semantics are mixed between page navigation and business API.
- MVC controllers still load reference data that a future JS shell should fetch from API instead.
- Security currently detects some requests as “API” by headers and URL heuristics, meaning page routes and API behavior are not fully separated yet.
- Response contracts are partially unified in V1 (`ApiMessageResponse`, `PageResponse`, `ApiErrorResponse`) but several endpoints still return `Map`, bare DTOs, or HTML.

## 2. Target architecture for this codebase

### Package structure
- `com.estate.web`: Thymeleaf/page shell controllers only. No business mutations.
- `com.estate.api.v1`: public REST surface only.
- `com.estate.api.support`: shared API concerns such as route policy, error serialization, response contracts.
- `com.estate.application`: orchestration/use-case services for API/web.
- `com.estate.domain`: core business rules and entities/value objects over time.
- `com.estate.infrastructure`: JPA repositories, security token persistence, external integrations.

Short-term note: do not force a full package rewrite now. Start by treating `controller/**` as web shell, `api/v1/**` as target API, and `api/**` as legacy API scheduled for deprecation.

### Security model
- `/api/v1/**`: contract-first JSON security with JSON `401/403`.
- Page routes (`/admin/**`, `/staff/**`, `/customer/**`, auth pages): keep redirect-based browser behavior for now.
- Authentication transport in migration period: HttpOnly cookie-based JWT remains primary bridge for both page shell and API calls.
- Long-term: API auth should be decoupled from page redirects so SPA or external frontend can reuse the same API contract.

### Response/error model
- Writes: `ApiMessageResponse<T>` with consistent success message plus optional payload.
- Pagination/search: `PageResponse<T>`.
- Errors: `ApiErrorResponse { code, message, path, timestamp }` for all API security and exception paths.
- Avoid `Map<String, Object>` for stable API contracts unless payload is explicitly free-form.

### Auth model
- Short-term: continue cookie-based access/refresh token rotation because current UI already depends on it.
- Mid-term: add explicit `/api/v1/auth/login`, `/refresh`, `/logout`, `/me` contract, then let pages use the same endpoints.
- OAuth linking remains web-driven for now, but post-login state should eventually be normalized behind API/auth session endpoints.

### DTO/service boundaries
- Controllers only translate HTTP <-> DTO.
- Services should not depend on `Model`, redirect strings, or template concerns.
- DTOs should split into request DTOs, response DTOs, and small contract DTOs for action bodies or counters.

## 3. Migration phases

### Phase 1: contract unification
- Freeze the target boundary at `/api/v1/**`.
- Standardize API error/security responses.
- Replace ad-hoc `Map` payloads in V1 with named DTOs where practical.
- Define route strategy: page routes stay outside `/api/v1/**`; business JSON must go inside `/api/v1/**`.
- Mark legacy `com.estate.api.**` as compatibility layer, not destination.

### Phase 2: frontend/page uses V1 API
- Convert remaining AJAX/fetch on templates to `/api/v1/**`.
- Move page preload data from MVC `Model` into API fetches where feasible.
- Add shell endpoints/pages whose job is only to serve template + minimal bootstrapping data.

### Phase 3: thin MVC or remove MVC dependencies
- Reduce MVC controllers to shell/navigation only.
- Move auth/profile/payment side effects behind API/application services and explicit API contracts.
- Remove template-coupled branching from backend business flows.

### Phase 4: deprecate legacy endpoints/controllers
- Add deprecation markers/logging for `com.estate.api.**` legacy endpoints.
- Remove page-specific business endpoints once templates no longer depend on them.
- Optionally split frontend later without changing backend business API contracts.

## 4. Module migration order

### Customer
- Move early.
- Temporary keep: page shells such as home/profile/invoice/property-request pages.

### Staff
- Move early-to-middle.
- Temporary keep: dashboard page shell and list pages.

### Admin
- Move middle.
- Temporary keep: search/detail/add/edit pages as shells until all AJAX/form flows use V1.

### Auth
- Move carefully in parallel.
- Keep current web flows temporarily because login/register/reset are still page-driven.

### Payment
- Move later and isolate.
- Current QR/payment flow is HTML/navigation-centric and should be treated as a bounded exception until a dedicated API + callback design is ready.

### Public page
- Move early for read flows.
- MVC landing page can become a thin shell quickly.

## 5. Major risks
- Session/cookie/JWT: current app is hybrid between redirect-driven pages and cookie-authenticated API calls.
- CSRF: disabled globally today, which is risky for cookie-authenticated mutation endpoints in a fully API-first future.
- Legacy form submit pages: old redirects and query-string messages will break if backend actions move before templates do.
- Payload shape mismatch: legacy endpoints and V1 differ in route naming and response shape.
- Upload file/image: currently prone to ad-hoc payloads and inconsistent validation messages.
- Payment HTML flow: should remain an explicit transitional exception until callback/status contracts are designed.

## 6. Immediate execution scope
- Unify API security/error contract for API requests.
- Replace a few ad-hoc V1 payloads with named DTOs.
- Document route strategy so `/api/v1/**` is the only destination for new business endpoints.
