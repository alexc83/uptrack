# M01 baseline — API endpoint and DTO matrix

Source: `backend/src/main/java/com/ccruce/backend/{controller,dto,service/impl,config,security}`. **Every row is SOURCE-derived. "Exercised" = no; nothing has been called at runtime yet** (backend tests do exercise many of these under H2, see "Test coverage"). Auth: "JWT" = any valid Bearer token; there are no roles or `@PreAuthorize`.

| Method | Path | Request | Response (success) | Auth / ownership | Errors (source) |
|---|---|---|---|---|---|
| POST | /api/auth/register | AuthRegisterRequest | 201 AuthResponse{token,user} | public | 400 validation; 400 duplicate email |
| POST | /api/auth/login | AuthLoginRequest | 200 AuthResponse | public | 400 validation; 401 invalid credentials |
| GET | /api/auth/me | - | 200 UserResponse | in permitAll chain; service returns 401 without principal | 401 |
| GET | /api/health | - | 200 {"status":"ok"} | public | |
| POST | /api/users | UserRequest | 201 UserResponse | JWT, not owner-scoped | 400; 409 duplicate email |
| GET | /api/users | - | 200 UserResponse[] | JWT, **returns all users** | |
| GET | /api/users/{id} | - | 200 | JWT, **any user** | 404 |
| PUT | /api/users/{id} | UserRequest | 200 | JWT, **any user; resets password** | 404; 409 |
| DELETE | /api/users/{id} | - | 204 | JWT, **any user** | 404 |
| GET | /api/users/me | - | 200 UserResponse | JWT | |
| PUT | /api/users/me | UpdateProfileRequest{name,email} | 200 | JWT | 400; 409 duplicate email |
| PUT | /api/users/me/password | ChangePasswordRequest{currentPassword,newPassword} | 204 | JWT | 400 wrong current / same as old / validation |
| POST | /api/credentials | CredentialRequest | 201 CredentialResponse | JWT; owner = caller | 400 |
| GET | /api/credentials | query: userId?, status?, type?, search? | 200 CredentialResponse[] | JWT; **no userId => all users' credentials** | |
| GET | /api/credentials/{id} | - | 200 CredentialResponse (with ceRecords) | JWT, **no ownership check** | 404 |
| GET | /api/credentials/{id}/ce-records | - | 200 CERecordResponse[] | JWT, **no ownership check** | 404 |
| GET | /api/credentials/{id}/ce-report | - | 200 CEReportResponse | owner only | 404 (also for non-owner) |
| PUT | /api/credentials/{id} | CredentialRequest | 200 | owner only | 400; 404 |
| DELETE | /api/credentials/{id} | - | 204 | owner only; cascades CE records; Cloudinary assets not deleted | 404 |
| POST | /api/ce-records | CERecordRequest | 201 CERecordResponse | JWT; credential must be caller's | 400 (incl. foreign credential, bad certificate metadata) |
| GET | /api/ce-records | - | 200 CERecordResponse[] | JWT, **returns all users' records** | |
| GET | /api/ce-records/{id} | - | 200 | JWT, **no ownership check** | 404 |
| PUT | /api/ce-records/{id} | CERecordRequest | 200 | owner only; old Cloudinary asset deleted on change | 400; 404; 502 |
| DELETE | /api/ce-records/{id} | - | 204 | owner only; Cloudinary asset deleted first | 404; 502 |
| GET | /api/dashboard | - | 200 DashboardResponse | scoped to caller | |
| POST | /api/uploads/certificates | multipart part `file` | 201 {url,publicId,originalFilename,resourceType} | JWT | 400 missing/empty/unsupported; 502 Cloudinary failure |

Error body (all handled errors): `{status, error, message, timestamp}`; validation message is `field: msg; field: msg`.

## Request DTO validation (SOURCE)
| DTO | Rules |
|---|---|
| AuthRegisterRequest | name NotBlank<=120; email NotBlank, Email, <=180; password NotBlank 8-255 |
| AuthLoginRequest | email NotBlank, Email; password NotBlank |
| UserRequest | name NotBlank<=120; email NotBlank, Email, <=180; password NotBlank <=255 (no min) |
| UpdateProfileRequest | name NotBlank<=120; email NotBlank, Email, <=180 |
| ChangePasswordRequest | currentPassword NotBlank; newPassword NotBlank 8-255 |
| CredentialRequest | name NotBlank; type NotNull (LICENSE\|CERTIFICATION); issuingOrganization NotBlank; expirationDate NotNull; renewalCycleMonths NotNull >=1; requiredCEHours NotNull >=0. **No max lengths** (columns 180; precision 5,2) |
| CERecordRequest | title, provider NotBlank <=180; hours NotNull >0 (exclusive); dateCompleted NotNull; certificateUrl <=500; certificatePublicId <=255; certificateResourceType <=40; certificateOriginalFilename <=255; credentialId NotNull. Certificate metadata all-or-nothing; publicId must start `uptrack/users/{userId}/certificates/`; resourceType `raw`\|`image` |

## Response DTO shapes (SOURCE)
- CredentialResponse: id, name, type, issuingOrganization, expirationDate, renewalCycleMonths, **requiredCEHours** (JSON key capitalisation as shown), status, ceHoursEarned, ceProgress (ratio, 4 dp, uncapped, 0 if required<=0), ceRecords[].
- CERecordResponse: id, title, provider, hours, dateCompleted, certificateUrl, certificatePublicId, certificateResourceType, certificateOriginalFilename.
- CEReportResponse: credential{id,name,type,issuingOrganization,expirationDate,requiredCEHours,status}, summary{totalHoursEarned,remainingHours,recordCount,progress}, records[]{title,provider,hours,dateCompleted,certificateUrl} sorted newest first.
- DashboardResponse: stats{totalCredentials,activeCount,expiringSoonCount,expiredCount,needsCEAttentionCount}, upcomingExpirations[] (0-90 days only, expired excluded), ceAttention[], recentActivity[]{id,credentialId,title,subtitle,icon,activityDate} (unbounded; frontend shows 4; subtitle hard-codes "(PDF)" for any certificate).
- Status rule (duplicated in CredentialServiceImpl and DashboardServiceImpl, server date): expired if expirationDate < today; EXPIRING_SOON if <= today+90; else ACTIVE.

## Angular service -> endpoint map (SOURCE)
auth.service: login, register, me · credential.service: list(userId,status,type,search), get, create, update, delete, **getCeRecords (defined, unused)**, getCeReport · ce-record.service: get, create (`POST /ce-records` with credentialId in body), update, delete · dashboard.service: get · upload.service: upload · user-profile.service: get/update `/users/me`, change password. No frontend call to `/users` (list), `/ce-records` (list), or `/health`. Production API base is a hard-coded external host in `environment.production.ts`; dev is `http://localhost:8080/api` (the `proxy.conf.json` is effectively unused).

## Test coverage (RAN: `./mvnw test`, 39 pass, H2)
Covered: auth register/login/me, user CRUD + profile + password, credential CRUD/status/filters/report/other-user update-delete, CE record CRUD + foreign credential/other-user update-delete + Cloudinary delete (mocked), dashboard (aggregate + empty), upload (success/validation/failure, mocked).
Not covered: cross-user reads (users, ce-records, credential by id), expired/invalid JWT, oversize upload, validation boundaries, exact 90-day boundary, certificate replacement, cascade delete.
