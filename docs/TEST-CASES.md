# Yayracare — Test Cases

> Scope: functional, security, edge-case, and role-boundary tests.
> Format: ID · Title · Steps · Expected result · Notes

---

## 1. Authentication

| ID | Title | Steps | Expected | Notes |
|----|-------|-------|----------|-------|
| AUTH-01 | Login with valid credentials | Enter correct email + password → Submit | Redirect to role-appropriate dashboard | Admin→/admin/dashboard, Staff→/staff/dashboard, DSP→/staff/application |
| AUTH-02 | Login with wrong password | Enter correct email + bad password → Submit | "Invalid credentials" error, no redirect | |
| AUTH-03 | Login with unknown email | Enter unregistered email → Submit | Error message, no server 500 | |
| AUTH-04 | Session timeout redirect | Leave tab idle >15 min → Navigate to any page | Redirect to `/login?timeout=true` | Timeout cookie `yc_last_activity` drives this |
| AUTH-05 | Session extends on activity | Active use < 15 min → Check cookie | Cookie `yc_last_activity` refreshed on each request | |
| AUTH-06 | Password reset flow | Click Forgot Password → Enter email → Open link in email → Set new password | Password updated, able to login with new password | |
| AUTH-07 | Deactivated account login | Admin sets user role to "Deactivate" → User tries to log in | Redirect to `/deactivated`, all routes return 403 | Tested at middleware layer |
| AUTH-08 | Unauthenticated API access | Call `/api/schedules/mine` without a session | `401 Unauthorized` JSON response | Must not redirect to /login for API routes |
| AUTH-09 | Auth callback open-redirect | Visit `/auth/callback?next=https://evil.com` | Redirect to `/` (not evil.com) | Fixed in F6 |
| AUTH-10 | Auth callback valid next | Visit `/auth/callback?next=/staff/dashboard` | Redirect to `/staff/dashboard` | |

---

## 2. Role-Based Access Control

| ID | Title | Steps | Expected | Notes |
|----|-------|-------|----------|-------|
| RBAC-01 | DSP Staff accesses /admin route | Log in as DSP Staff → Visit `/admin/dashboard` | Redirect to `/staff/dashboard` | Enforced in middleware |
| RBAC-02 | Admin accesses /staff route | Log in as Admin → Visit `/staff/dashboard` | Redirect to `/admin/dashboard` | |
| RBAC-03 | HR accesses /admin/billing | Log in as HR → Visit `/admin/billing` | Redirect to `/admin/dashboard` | Billing layout blocks HR |
| RBAC-04 | HR cannot see Billing in sidebar | Log in as HR → Inspect sidebar | Billing Management item absent | |
| RBAC-05 | DSP Staff cannot send email via API | Log in as DSP Staff → POST `/api/send-email` | `403 Forbidden` | |
| RBAC-06 | HR can update user roles | Log in as HR → Change a DSP to DSP Staff | Role updated successfully | |
| RBAC-07 | HR cannot assign Admin role | Log in as HR → Try to assign Admin role to any user | `403 Forbidden` | F20 |
| RBAC-08 | Admin can assign Admin role | Log in as Admin → Assign Admin role | Role updated, SCD Type 2 history recorded | |
| RBAC-09 | DSP Staff cannot list other staff docs | Log in as DSP Staff → GET `/api/list-staff-documents?staffId=<other-id>` | `403 Forbidden` | IDOR fix F4 |
| RBAC-10 | Admin can list any staff docs | Log in as Admin → GET `/api/list-staff-documents?staffId=<any-id>` | Returns document list | |

---

## 3. Registration

| ID | Title | Steps | Expected | Notes |
|----|-------|-------|----------|-------|
| REG-01 | Successful DSP self-registration | Visit `/register` → Fill all fields → Submit | Account created, redirect to login or dashboard | |
| REG-02 | Register with duplicate email | Submit form with existing email | Clear "email already in use" error | |
| REG-03 | Register with mismatched passwords | Enter different password/confirm | Client-side validation error before submit | |
| REG-04 | Register link visible on login page | Visit `/login` | "New DSP? Register here" link visible | |
| REG-05 | Register page accessible unauthenticated | Visit `/register` without session | Page loads (public route in middleware) | |
| REG-06 | Register page not embeddable externally | Load `/register` in iframe from external origin | Blocked by `frame-ancestors 'self'` CSP | F19 |

---

## 4. Admin — Users & Roles

| ID | Title | Steps | Expected | Notes |
|----|-------|-------|----------|-------|
| USR-01 | Admin creates new user | Admin → /admin/users → Create user with email + role | User created, welcome email sent | |
| USR-02 | Admin deletes user | Admin → /admin/users → Delete user | User removed from system | |
| USR-03 | Role change reflected immediately | Change user role → User refreshes page | New role applies without re-login | Middleware re-fetches role on every request |
| USR-04 | Role history recorded (SCD Type 2) | Change role twice | `user_role_history` has two rows; old row has `effective_to`, new row `is_current=true` | |
| USR-05 | Deactivate user blocks all access | Set role to "Deactivate" → Affected user accesses any page | Page routes → /deactivated, API routes → 403 | |

---

## 5. Admin — Scheduling

| ID | Title | Steps | Expected | Notes |
|----|-------|-------|----------|-------|
| SCH-01 | Create a schedule shift | Admin → Scheduling → Pick date + DSP + client → Save | Shift appears on calendar | |
| SCH-02 | Email notification sent | Create schedule → Check DSP's email | Email received with shift details | Requires RESEND_API_KEY |
| SCH-03 | Staff accepts shift | Staff → My Schedule → Accept shift | Status updates to "accepted" | |
| SCH-04 | Staff rejects shift | Staff → My Schedule → Reject shift | Status updates to "rejected" | |
| SCH-05 | Auto-accept after 24h | Create shift → Wait 24h with no response | Status auto-updates to "accepted" | `/api/schedules/auto-accept` |
| SCH-06 | Staff only sees own schedule | DSP Staff A logs in → My Schedule | Only shifts where `dsp_id = user.id` shown | |

---

## 6. Admin — Timesheets

| ID | Title | Steps | Expected | Notes |
|----|-------|-------|----------|-------|
| TS-01 | Staff submits timesheet | Staff → Timesheet → Enter hours → Submit | Status = "submitted", appears in admin queue | |
| TS-02 | Admin approves timesheet | Admin → Timesheets → Approve | Status = "approved", notification displayed | |
| TS-03 | Admin rejects timesheet | Admin → Timesheets → Reject | Status = "rejected" | |
| TS-04 | Pending timesheets count shown on dashboard | Submit a timesheet → Check admin dashboard | Metric card reflects updated pending count | |
| TS-05 | Staff sees current week hours on dashboard | Submit timesheet for current week | Hours card on staff dashboard shows correct total | |

---

## 7. Admin — Case Notes

| ID | Title | Steps | Expected | Notes |
|----|-------|-------|----------|-------|
| CN-01 | Staff submits case note | Staff → Case Notes → Fill entries → Submit | Status = "submitted", visible in admin queue | |
| CN-02 | Admin approves case note | Admin → Case Notes → Approve | Status = "approved" | |
| CN-03 | Case note draft autosaved | Start writing → Close tab → Reopen | Draft restored from sessionStorage | PHI stored in sessionStorage not localStorage |
| CN-04 | Draft cleared on submit | Submit note → Reopen case notes | sessionStorage draft key absent | |
| CN-05 | Staff only sees own clients in dropdown | Log in as DSP Staff A → Open case notes | Client dropdown contains only A's assigned clients | |
| CN-06 | Admin sees all case notes | Log in as Admin → Case Notes page | All staff submissions visible | |

---

## 8. Admin — Documents

| ID | Title | Steps | Expected | Notes |
|----|-------|-------|----------|-------|
| DOC-01 | Admin uploads staff document | Admin → Documents → Select staff + doc type + file → Upload | File stored at `{userId}/{docType}/{filename}` | |
| DOC-02 | Invalid MIME type rejected | Upload a `.exe` file | 400 error: "Invalid file type" | F14 |
| DOC-03 | File > 10 MB rejected | Upload file > 10 MB | 413 error: "File too large" | F22 |
| DOC-04 | Path traversal blocked | POST upload with `docType=../../etc/passwd` | 400 error: "Invalid document type" | F16 |
| DOC-05 | Staff views own documents | Staff → Documents | Only own files listed with signed download URLs | |
| DOC-06 | Expiry date extraction | Upload CPR cert → trigger extract-expiry | Returns expiry date from document | Requires auth; unauthenticated → 401 |

---

## 9. Admin — Applications

| ID | Title | Steps | Expected | Notes |
|----|-------|-------|----------|-------|
| APP-01 | Staff submits application | Staff → Application → Fill all sections → Submit | Application stored in billing_staff_data | |
| APP-02 | Admin views application | Admin → Applications → Select applicant | All uploaded docs and form fields visible | |
| APP-03 | Admin approves application | Admin → Applications → Approve | Status updated, applicant notified | |
| APP-04 | Document uploaded during application | Staff → Application → Upload photo ID | File stored, docKey validated against allowlist | F15 |
| APP-05 | Invalid docKey blocked | POST upload-document with `docKey=../secrets` | 400 error | F15 |

---

## 10. Admin — Billing

| ID | Title | Steps | Expected | Notes |
|----|-------|-------|----------|-------|
| BILL-01 | Admin views billing dashboard | Log in as Admin → /admin/billing | Client billing data displayed | |
| BILL-02 | HR cannot access billing | Log in as HR → /admin/billing | Redirect to /admin/dashboard | F — layout.tsx |
| BILL-03 | Weekly billing summary | Admin → /admin/billing/weekly | Per-client breakdown with rates shown | |
| BILL-04 | New client billing record | Create new client → Check billing_client_data | Row created with client_id | |

---

## 11. Staff — Schedule

| ID | Title | Steps | Expected | Notes |
|----|-------|-------|----------|-------|
| MSCH-01 | Staff views calendar | Staff → My Schedule | Monthly calendar with assigned shifts | |
| MSCH-02 | Accept countdown visible | Open unresponded shift | 24-hour countdown timer shown | |
| MSCH-03 | Staff clients scoped correctly | Staff API GET /api/schedules/mine | Only assigned clients returned, not all clients | F9 |

---

## 12. Staff — Training

| ID | Title | Steps | Expected | Notes |
|----|-------|-------|----------|-------|
| TRN-01 | Training modules listed | Staff → Training | Modules appropriate to role shown | DSP Staff sees DSP Training Academy; DSP does not |
| TRN-02 | DSP Training Academy loads iframe | Staff → Training → DSP Training Academy → Continue | Iframe to lovable.app loads | |
| TRN-03 | Expiring cert warning | CPR cert uploaded >2 years ago → Staff dashboard | Certificate shown in "Expiring certs" panel | Within 90-day window |
| TRN-04 | External training link | Click CDS Training | Opens external training URL in new tab | |

---

## 13. Security

| ID | Title | Steps | Expected | Notes |
|----|-------|-------|----------|-------|
| SEC-01 | Security headers present | Fetch any page → Inspect response headers | X-Content-Type-Options: nosniff, X-Frame-Options: DENY, HSTS, Referrer-Policy present | F18 |
| SEC-02 | API returns JSON 401 not redirect | Unauthenticated fetch to `/api/schedules/mine` | `{"error":"Unauthorized"}` with status 401 | Not a 302 HTML redirect |
| SEC-03 | Deactivated user blocked from API | Deactivated user calls any API route | `{"error":"Account deactivated"}` with status 403 | F17 |
| SEC-04 | No PHI in localStorage | Open DevTools → Application → localStorage | No `case_note_draft_*` or `rcs-dsp-*` keys | F11/F12 |
| SEC-05 | PHI in sessionStorage only | Write a case note draft → Check sessionStorage | Draft key present in sessionStorage | Cleared on tab close |
| SEC-06 | frame-ancestors blocks external embed | Try embedding login page in foreign iframe | Blocked by `frame-ancestors 'none'` | |
| SEC-07 | extract-expiry requires auth | POST /api/extract-expiry without session | 401 Unauthorized | F1 |
| SEC-08 | get-user-last-login scoped | DSP Staff calls /api/get-user-last-login?userId=<other> | 403 Forbidden | F5 |

---

## 14. Edge Cases

| ID | Title | Steps | Expected | Notes |
|----|-------|-------|----------|-------|
| EDGE-01 | Dashboard with zero data | New account, no clients/timesheets | Metric cards show "0", no crashes | |
| EDGE-02 | Timesheet with decimal hours | Enter 7.5 hours | Displayed as "7.5" not "7.50000" | |
| EDGE-03 | Staff with no assigned clients | Log in as DSP Staff with no assignments | "No clients assigned yet" state shown | |
| EDGE-04 | Very long client name | Create client with 100-char name | Truncated or wraps cleanly in UI | |
| EDGE-05 | Concurrent role change | Admin changes user role while user is active | Next request by user picks up new role | Middleware fetches role per request |
| EDGE-06 | Email skip when no RESEND_API_KEY | RESEND_API_KEY not set → Trigger email action | Returns `{ok:true, skipped:true}`, no crash | |
| EDGE-07 | Schedule auto-accept idempotency | Run auto-accept twice on same shift | Shift remains "accepted", no duplicate records | |
| EDGE-08 | Upload same document twice | Upload same file with upsert=false | Second upload gets unique filename (timestamp prefix) | |
