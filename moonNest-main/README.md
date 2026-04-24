# MoonNest Main

MoonNest is a Spring Boot web application for real-estate operations management. The current codebase combines Thymeleaf page rendering with `/api/v1/**` JSON APIs for admin, staff, customer, public browsing, profile updates, auth support, and QR payment flow.

## Current Stack

- Java 21
- Spring Boot 3.5.7
- Spring MVC + Thymeleaf
- Spring Data JPA
- Spring Security + JWT cookie auth + Google OAuth2 login
- MySQL
- H2 for integration tests
- Bootstrap, jQuery, AJAX
- Spring Mail

## Main Business Areas

- Public building browsing at `/moonnest`
- Authentication: page login/register/reset flows plus cookie-based auth APIs under `/api/v1/auth`
- Admin management for buildings, customers, staff, contracts, sale contracts, invoices, property requests, and dashboard/report pages
- Staff pages for assigned buildings, customers, contracts, sale contracts, invoices, dashboard, and profile
- Customer pages for home, buildings, contracts, invoices, transaction history, property requests, services, and profile
- Supporting APIs under `/api/v1/**` for page AJAX flows and business actions

## Auth API

Current auth endpoints in `AuthV1API`:

- `POST /api/v1/auth/login`: authenticate and issue `estate_access_token` + `estate_refresh_token`
- `GET /api/v1/auth/me`: return current authenticated user session info
- `POST /api/v1/auth/logout`: clear auth cookies and revoke refresh token
- `POST /api/v1/auth/forgot-password`: trigger forgot-password flow

## Repository Layout

- `src/main/java/com/estate`
  - `controller/**`: Thymeleaf page controllers
  - `api/v1/**`: JSON API endpoints
  - `service/**`, `service/impl/**`: business logic
  - `repository/**`: JPA repositories and entities
  - `config/**`, `security/**`: security and application configuration
- `src/main/resources`
  - `templates/**`: Thymeleaf views
  - `static/**`: CSS, JS, images
  - `application.properties`, `application-mysql.properties`, `application-test.properties`: runtime and test config
- `src/test/java/com/estate/api`: integration tests for API flows
- `estate_db_generator/`: SQL and data-generation assets for local database setup
- `screenshots/estate_erd.png`: database ERD snapshot

## Environment Configuration

The application loads environment variables from `.env` through:

```properties
spring.config.import=optional:file:.env[.properties]
```

Create `.env` from `.env.example` and update values for your machine and services.

Common profile usage:

- `mysql`: run the main application with MySQL
- `test`: integration-test profile using in-memory H2
- `local-nooauth`: local security override profile; can be combined with other profiles such as `mysql,local-nooauth`

Required variables:

- `SPRING_PROFILES_ACTIVE`
- `SPRING_DATASOURCE_URL`
- `SPRING_DATASOURCE_USERNAME`
- `SPRING_DATASOURCE_PASSWORD`
- `SPRING_DATASOURCE_DRIVER_CLASS_NAME`
- `SPRING_JPA_HIBERNATE_DIALECT`
- `SPRING_MAIL_HOST`
- `SPRING_MAIL_PORT`
- `SPRING_MAIL_USERNAME`
- `SPRING_MAIL_PASSWORD`
- `SPRING_MAIL_SMTP_AUTH`
- `SPRING_MAIL_SMTP_STARTTLS_ENABLE`
- `SPRING_MAIL_SMTP_STARTTLS_REQUIRED`
- `SPRING_MAIL_SMTP_SSL_TRUST`
- `BUILDING_IMAGE_UPLOAD_DIR`
- `GOONG_API_KEY`
- `JWT_SECRET`
- `JWT_ACCESS_TOKEN_EXPIRATION`
- `JWT_REFRESH_TOKEN_EXPIRATION`
- `JWT_COOKIE_SECURE`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_CLIENT_SCOPE`
- `PAYMENT_QR_BANK_BIN`
- `PAYMENT_QR_ACCOUNT_NO`
- `PAYMENT_QR_ACCOUNT_NAME`

## Run Locally

1. Install Java 21 and MySQL.
2. Create the database and seed data from `estate_db_generator/`.
3. Prepare `.env` from `.env.example`.
4. Start the app from the project root:

```powershell
cd D:\Documents\1.1.KLTN_PLAYWRIGHT\moonNest-main
.\mvnw.cmd spring-boot:run
```

If `JAVA_HOME` is not set, configure it first:

```powershell
$env:JAVA_HOME="C:\Program Files\Java\jdk-21"
```

To run locally without OAuth login setup, use:

```powershell
$env:SPRING_PROFILES_ACTIVE="mysql,local-nooauth"
.\mvnw.cmd spring-boot:run
```
--Run Backend + Test

$env:SPRING_PROFILES_ACTIVE="mysql,local-nooauth,test"
.\mvnw.cmd spring-boot:run

## Run Tests

Run the test suite:

```powershell
.\mvnw.cmd test
```

Current integration-test setup:

- `application-test.properties` uses in-memory H2 instead of MySQL
- profile `test` automatically includes `local-nooauth`
- `TestProfileSeedConfig` seeds test users for auth integration tests
- `AuthV1ApiIntegrationTest` verifies login, `/me`, and logout with cookie-based API auth

Test users currently seeded in the `test` profile:

- `api_admin` / `12345678`
- `api_staff` / `12345678`
- `api_customer` / `12345678`

## Main Entry URLs

- Public page: `http://localhost:8080/moonnest`
- Login page: `http://localhost:8080/login`
- Admin dashboard: `http://localhost:8080/admin/dashboard`
- Staff dashboard: `http://localhost:8080/staff/dashboard`
- Customer home: `http://localhost:8080/customer/home`

## Default Accounts

Local sample accounts and passwords are documented in [guide.txt](./guide.txt). Update them if your seeded database differs from the provided generator assets.

## Database Design

![ERD](./screenshots/estate_erd.png)
