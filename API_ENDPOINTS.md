# Ingage AI API Endpoint Inventory

This file summarizes the endpoints documented in the Postman collection and separates them into:
- endpoints already used in the current frontend workspace
- documented endpoints that are not yet wired in the frontend

## Authentication

All authenticated endpoints require a Bearer JWT in the `Authorization` header.

## 1) Endpoints already used in the frontend

### Auth
- `POST /auth/login`
- `POST /auth/register`
- `GET /auth/logout`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `POST /auth/resend-forgot-password`

### Onboarding / profile setup
- `GET /countries/list`
- `GET /states/list/:countryId`
- `GET /cities/list/:countryId/:stateId`
- `GET /business-niches/list`
- `GET /app-purposes/list`
- `GET /company-kinds/list`
- `GET /company-sizes/list`
- `GET /goals/list`
- `GET /roles-in-company/list`
- `PUT /user/save-onboarding-info`
- `POST /goals/save-goals`

### Client categories and clients
- `GET /client-categories/list`
- `POST /client-categories/create`
- `PUT /client-categories/update/:id`
- `DELETE /client-categories/delete/:id`
- `GET /clients/list`
- `GET /clients/clients-list/:categoryId`
- `GET /clients/count-all`
- `GET /clients/contacted/count`
- `POST /clients/add`
- `PUT /clients/update/:id`
- `DELETE /clients/delete/:id`
- `GET /clients/export?format=...`

### Leads
- `POST /leads/generate`
- `POST /leads/save`
- `GET /leads/jobs`
- `GET /leads/jobs/:jobId`
- `GET /leads/jobs/:jobId/results`
- `POST /leads/inspect-n8n`

### Brand
- `GET /brand/all`
- `GET /brand/get-one/:id`
- `POST /brand/create`
- `PATCH /brand/update-one/:id`
- `DELETE /brand/delete-one/:id`

### SMTP settings
- `POST /smtp-setting/create`
- `POST /smtp-setting/test`

### Domain
- `GET /domain/all`
- `POST /domain/create`
- `PATCH /domain/update-one/:id`
- `DELETE /domain/delete-one/:id`

### Lookup
- `GET /lookup/regions`
- `GET /lookup/campaign-goals`
- `GET /lookup/ai-tones`
- `GET /lookup/ai-agents`
- `GET /lookup/business-types`
- `GET /lookup/smtp-providers`
- `GET /lookup/security-protocols`
- `GET /lookup/sending-limits`
- `GET /lookup/day-of-months`
- `GET /lookup/post-everies`
- `GET /lookup/durations`
- `GET /lookup/stop-post-afters`

These are read-only lookup endpoints. They do not take a request body; the frontend should call them with a simple `GET` and expect the backend to return a payload shaped like `{ data: [{ id, name }, ...] }`, which is the same contract already used by the existing lookup service.

## 2) Documented endpoints not yet wired in the frontend

### How to create / send and log
- `POST /how-to-create-or-send-and-log/create-log`
- `GET /how-to-create-or-send-and-log/get-all`

### Delivery schedule
- `POST /delivery-schedule/create`
- `GET /delivery-schedule/brand/:brand_id`

### AI writer
- `GET /lookup/ai-writer-dropdowns`
- `POST /ai-writer/generate`

## 3) Notes
- The Postman documentation indicates a total of 66 endpoints across 13 modules.
- The current frontend already covers most of the auth, onboarding, client-management, brand, SMTP, domain, and lookup flows.
- The main gaps are the campaign-creation/logging, delivery scheduling, and AI writer endpoints.
