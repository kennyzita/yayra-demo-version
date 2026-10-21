# Yayra Care Portal — User Guide

> This guide covers how to use the portal for each role.
> Roles: **Admin**, **HR**, **DSP Staff**, **DSP**

---

## Table of Contents

1. [Logging In](#1-logging-in)
2. [Admin Role Guide](#2-admin-role-guide)
3. [HR Role Guide](#3-hr-role-guide)
4. [DSP Staff Role Guide](#4-dsp-staff-role-guide)
5. [DSP Role Guide](#5-dsp-role-guide)
6. [Common Actions (All Roles)](#6-common-actions-all-roles)

---

## 1. Logging In

### Existing Users
1. Navigate to the portal URL
2. Enter your **email address** and **password**
3. Click **Sign in**
4. You will be automatically directed to your role-appropriate dashboard

### New DSP Staff
1. On the login page, click **"New DSP? Register here"**
2. Fill in your name, email, and password
3. Submit — your account is created immediately
4. Log in with your new credentials

### Forgot Password
1. On the login page, click **Forgot password**
2. Enter your email address
3. Check your inbox for a reset link
4. Click the link and set a new password

### Session Timeout
- Your session automatically expires after **15 minutes of inactivity**
- You will be redirected to the login page with a timeout notice
- Simply log in again to resume your work

---

## 2. Admin Role Guide

Admins have full access to all areas of the system.

### 2.1 Dashboard Overview
The **Admin Overview** is your home screen. It shows:
- **Active Clients** — total number of clients in the system
- **DSP Staff** — count of DSP Staff employees
- **DSP** — count of DSP-only workers
- **Timesheets to Approve** — pending submissions waiting for your review
- **Case Notes to Review** — case notes submitted by staff

**Quick Actions** at the bottom of the metrics let you jump directly to:
- New client · Approve timesheets · Review case notes · DSP assignment

**Recent Activity** feed on the right shows a live log of timesheet submissions, case note activity, and new client additions.

---

### 2.2 Managing Users

**Path:** Sidebar → Users

**Create a new user:**
1. Click **Create User**
2. Enter first name, last name, email address, and assign a role
3. Click **Save** — the user receives a welcome email with login instructions

**Change a user's role:**
1. Find the user in the list
2. Click their role badge or the edit icon
3. Select the new role from the dropdown
4. Confirm — the change takes effect immediately on their next page load

**Deactivate a user:**
1. Change their role to **"Deactivate"**
2. The user is immediately blocked from all pages and API routes

**Delete a user:**
1. Find the user → Click the delete (trash) icon
2. Confirm deletion — this is permanent

> **Note:** Only Admins can assign the Admin role. HR users cannot promote anyone to Admin.

---

### 2.3 Managing Clients

**Path:** Sidebar → Clients → New Client

**Create a new client:**
1. Click **New Client**
2. Fill in: full name, date of birth, county, primary diagnosis, ISP outcome, contact info
3. Click **Save** — client profile is created and appears in billing data

---

### 2.4 Assignments (DSP ↔ Client)

**Path:** Sidebar → Assignments

1. Select a **DSP Staff** member from the dropdown
2. Select a **Client** to assign them to
3. Click **Assign**
4. The assignment appears in the table below
5. To remove an assignment, click the **Remove** button on the row

> Assignments control which clients a DSP Staff member can write case notes for and which clients appear in their schedule.

---

### 2.5 Scheduling

**Path:** Sidebar → Scheduling

1. The calendar shows the current month
2. Click on any **date cell** to add a shift
3. Select the **DSP Staff** member and the **Client**
4. Set **start time** and **end time**
5. Click **Save** — the staff member receives an email notification
6. Staff have **24 hours** to accept or reject; unresponded shifts auto-accept after 24 hours

---

### 2.6 Approving Timesheets

**Path:** Sidebar → Timesheets

1. The page lists all **submitted** timesheets
2. Click a row to expand the full timesheet detail (daily hours, signatures)
3. Click **Approve** to approve or **Reject** to send it back
4. Status updates immediately and is reflected on the staff dashboard

---

### 2.7 Reviewing Case Notes

**Path:** Sidebar → Case Notes

1. All **submitted** case notes appear in the list
2. Click a row to expand — see the entries, strategies used, client, and date range
3. Click **Approve** or **Reject**
4. Approved notes are archived; rejected notes return to the staff member's drafts

---

### 2.8 Managing Documents

**Path:** Sidebar → Documents

1. Select the **staff member** from the dropdown
2. Select the **document type** (W4, CPR Certificate, Background Check, etc.)
3. Click **Upload** and choose the file (PDF, image, or Word — max 10 MB)
4. The document is stored under the staff member's folder
5. To view a document, click its name — a signed download link opens

---

### 2.9 Applications

**Path:** Sidebar → Applications

1. Each row is a submitted application from a prospective or new DSP
2. Click a row to expand the full application: personal info, work history, references, and uploaded documents
3. Check the **Progress** tab for onboarding status
4. Click **Approve** or **Reject** — approved applicants move to active staff status

---

### 2.10 Staff Progress

**Path:** Sidebar → Staff Progress

1. Select a staff member from the list
2. View their **onboarding checklist** (which forms are complete)
3. See **certification status** with expiry dates (CPR, Background Check, CARI)
4. See **training completion** across all required modules

---

### 2.11 Billing (Admin Only — HR Excluded)

**Path:** Sidebar → Billing Management

1. The main billing page lists all clients with their billing records
2. Click **Weekly** to see a billing breakdown by week across all clients
3. Click a client row to view or edit their billing data
4. Billing data is stored per client with rate and unit information

---

### 2.12 Roles Management

**Path:** Sidebar → Roles

1. Lists all users with their current role
2. Use the dropdown on any row to change the role
3. Changes are immediate

---

### 2.13 Settings & 2FA

**Path:** Sidebar → Settings

1. Click **Enable Two-Factor Authentication**
2. Scan the QR code with an authenticator app (Google Authenticator, Authy)
3. Enter the 6-digit code to verify and enable 2FA
4. On next login, you will be prompted for the TOTP code after password

---

## 3. HR Role Guide

HR has the same access as Admin **except**:
- **No access to Billing Management** (the sidebar item is hidden; the route is blocked)
- **Cannot assign the Admin role** to any user

Everything else in Section 2 applies to HR users identically.

---

## 4. DSP Staff Role Guide

DSP Staff are full-time or contracted care workers who have completed onboarding.

### 4.1 Dashboard Overview

Your **My Overview** page shows:
- **My Assigned Clients** — the clients you are currently working with
- **Hours Logged This Week** — total hours from your active timesheet
- **Case Notes Submitted** — count submitted this month
- **Trainings Completed** — your training progress (e.g. 2/3)

**Quick Actions:** Log hours · Add case note · Upload document

The right-side panels show:
- **This Week's Hours** with a progress bar (toward 40-hr standard week)
- **Case Notes** — submitted this month vs. drafts pending
- **Expiring Certs** — CPR, CARI, Background Check expiry warnings

---

### 4.2 My Schedule

**Path:** Sidebar → My Schedule

1. The calendar shows your assigned shifts for the month
2. Shifts appear on the relevant date with the client name and times
3. For **new unacknowledged shifts**, a countdown timer shows time remaining to respond
4. Click **Accept** to confirm you will work the shift
5. Click **Reject** if you cannot work it
6. If you do not respond within 24 hours, the shift is **automatically accepted**

---

### 4.3 Logging Hours (Timesheet)

**Path:** Sidebar → Timesheet (or Quick Action: Log hours)

1. The timesheet shows the current week (Mon–Sun)
2. For each day you worked, enter:
   - **Start time** and **end time**
   - **Client** you worked with
   - **Strategy** used (e.g. community integration, ADL support)
3. Total hours are calculated automatically
4. Click **Submit** when the week is complete
5. The submission goes to your Admin/HR for approval

---

### 4.4 Writing Case Notes

**Path:** Sidebar → Case Notes (or Quick Action: Add case note)

1. Select the **client** from the dropdown (only your assigned clients appear)
2. Select the **week** the note covers
3. For each entry, fill in:
   - Date
   - Start and end time
   - Strategy used
   - Description of the session
4. Click **+ Add Entry** to add multiple entries for the same week
5. Your note **auto-saves as a draft** every few seconds while you type
6. Click **Submit** to send for Admin/HR review
7. To clear and start over, click **Clear Form**

> **Draft auto-save:** If you close the browser tab, your draft is saved for the current browser session. It will be restored when you reopen the tab. Drafts are cleared when the tab is closed (they do not persist across sessions for security).

---

### 4.5 Uploading Documents

**Path:** Sidebar → Documents (or Quick Action: Upload document)

1. Select the **document type** (W4, CPR Certificate, etc.)
2. Click **Choose File** and select your document (PDF, image, or Word — max 10 MB)
3. Click **Upload**
4. The document appears in your document list organised by type
5. Click any document name to download it

---

### 4.6 Onboarding Forms

**Path:** Sidebar → Onboarding

1. A checklist shows all required onboarding documents
2. Each item has a link to the external PDF form
3. Download, complete, and upload the signed form via **Documents**
4. Items with uploaded documents are checked off

---

### 4.7 Training

**Path:** Sidebar → Training

Tabs on the training page:
- **My Modules** — lists your required training with progress bars and status
- **DSP Training Academy** — click Continue to open the full interactive training (only for DSP Staff)
- **Documents** — access training PDFs (Danielle's Law, CPR handbooks, etc.)
- **CDS Training** — external link to the continuing education portal

---

### 4.8 Profile

**Path:** Sidebar → Profile

1. Update your first name, last name, phone number, address
2. Add or update your emergency contact
3. Click **Save**

---

## 5. DSP Role Guide

DSP is a limited-access role, typically for contractors or applicants in progress.

### What DSP can access:
- **/staff/application** — Submit your full employment application
- **/staff/documents** — Upload required documents
- **/staff/profile** — View and edit your profile
- **/staff/settings** — Account settings and 2FA

### What DSP cannot access:
- Schedule, Timesheet, Case Notes, Onboarding, Training (these require DSP Staff role)

### Typical DSP workflow:
1. Log in → You land on `/staff/application`
2. Complete all sections: personal info, work history, references
3. Upload required documents (Photo ID, SSN, Resume, etc.)
4. Click **Submit Application**
5. Wait for Admin/HR to review and promote you to **DSP Staff**
6. Once promoted, you gain full access to the staff portal

---

## 6. Common Actions (All Roles)

### Change Password
1. Log out → Click Forgot Password on the login page
2. Enter your email → Follow the reset link sent to your inbox

### Enable Two-Factor Authentication (2FA)
1. Go to **Settings** (sidebar bottom)
2. Click **Enable 2FA**
3. Scan the QR code with Google Authenticator or Authy
4. Enter the 6-digit verification code to confirm
5. 2FA is now active on your account

### Update Profile
1. Go to **Profile** (sidebar)
2. Edit your name, phone, address, emergency contact
3. Click **Save Changes**

### Sign Out
1. Click your name or avatar at the bottom of the sidebar
2. Click **Sign out**
3. Your session is terminated and you are returned to the login page
