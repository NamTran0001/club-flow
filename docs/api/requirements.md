# ClubFlow – Requirements Analysis

**Course:** CSC13008 – 24KTPM1  
**Semester:** HK1 2026–2027  
**Project:** ClubFlow  
**Source:** Official ClubFlow Final Project Brief

---

## 1. Functional Requirements (C1–C11)

The following eleven categories organize the functional requirements extracted from the official project brief. These identifiers are organizational labels, not original requirement IDs from the brief.

| ID | Requirement | Description | Primary Actor |
|---|---|---|---|
| C1 | Authentication & Authorization | Sign in and role-based access control for all system users. | All authenticated users |
| C2 | Public Campaign | Browse publicly available recruitment campaigns and view campaign details. | Visitor, Applicant |
| C3 | Campaign Management | Create, edit, save drafts, preview, and publish recruitment campaigns. | Executive |
| C4 | Interviewer Management | Assign interviewers to positions, configure their availability, and select available rooms. | Executive |
| C5 | Application Submission | Submit applications with personal information, PDF CVs, motivation statements, and interview availability. | Applicant |
| C6 | Applicant Tracking | Track application screening status, confirmed interview schedules, and final results. | Applicant |
| C7 | CV Screening & Review | Search, filter, review applications, view CVs, add internal notes, and shortlist or reject candidates. | Executive |
| C8 | Interview Scheduling | Generate, edit, validate, and confirm interview schedules while detecting scheduling conflicts. | Executive |
| C9 | Interview Assessment | Submit an assessment for each completed assigned interview. | Interviewer |
| C10 | Final Results & Notifications | Record Pass/Fail decisions and notify applicants of their final results. | Executive, Applicant |
| C11 | Interviewer Workspace | View assigned interviews and applicant CVs, and submit interview assessments. | Interviewer |

### 1.1. C1 – Authentication & Authorization

- Provide sign-in functionality for pre-created accounts.
- Support three authenticated roles:
  - Executive
  - Applicant
  - Interviewer
- Enforce role-based access control on the backend.
- Restrict users to data and operations permitted by their roles.
- Prevent unauthorized access to other users' application records.
- Do not implement self-service registration, account recovery, or university SSO.

### 1.2. C2 – Public Campaign

- Allow visitors to browse published recruitment campaigns.
- Display campaign details, departments, positions, quotas, and requirements.
- Require authentication before submitting an application.
- Do not expose unpublished draft campaigns to visitors.

### 1.3. C3 – Campaign Management

Executives can:

- Create recruitment campaigns.
- Enter campaign name, host club, description, opening date, and closing date.
- Configure application instructions.
- Create departments and positions.
- Define position quotas, job descriptions, and requirements.
- Save campaigns as Draft.
- Preview campaign information before publication.
- Publish campaigns.

Business rules:

- Required information must be provided before publication.
- Opening and closing dates must be valid.
- Invalid campaign information must prevent publication.
- Draft campaigns must remain editable until confirmed under the scheduling workflow.

### 1.4. C4 – Interviewer Management

Executives can:

- View the list of existing interviewers.
- Assign interviewers to one or more recruitment positions.
- Enter each interviewer's available time slots.
- Select rooms from the existing room list.

Business rules:

- An interviewer must be assigned to the relevant position before conducting its interviews.
- Interviewer availability is entered by the Executive.
- Interviewers cannot be assigned to overlapping interviews.
- Room creation and room capacity management are outside the project scope.

### 1.5. C5 – Application Submission

Applicants can:

- Browse published campaigns.
- Select a recruitment position.
- Enter the required student information.
- Upload a CV in PDF format.
- Provide a motivation statement.
- Select available interview time slots provided by the club.
- Submit their applications.

Submission constraints:

| Field | Constraint |
|---|---|
| CV | PDF format only |
| Maximum CV size | 5 MB |
| Motivation statement | Maximum 300 words |
| Application period | Must be within the campaign opening and closing dates |
| Positions | One separate application per position |
| Duplicate applications | Not allowed for the same position in the same campaign |

Business rules:

- A student may apply for multiple positions within the same campaign.
- Each position requires a separate application record.
- Applications for different positions must be processed independently.
- If a student submits a duplicate application for the same position, the system should open the existing application instead of creating another one.
- Invalid or incomplete submissions must be rejected without discarding valid information already entered.

### 1.6. C6 – Applicant Tracking

Applicants can view only their own application information, including:

- Application submission status.
- CV screening status.
- Confirmed interview date and time.
- Confirmed interview room.
- Final recruitment result (Pass/Fail).

Access restrictions:

- Applicants cannot view other students' applications.
- Applicants cannot access internal screening notes.
- Applicants cannot view other candidates' assessments.
- Applicants must not see unconfirmed draft schedules belonging to other users.

### 1.7. C7 – CV Screening & Review

Executives can:

- View all applications within the campaign.
- Search and filter applications.
- Sort and paginate application lists.
- View applicant information and motivation statements.
- Open and read uploaded CVs.
- Add internal screening notes.
- Mark individual applications as Shortlisted or Rejected.
- View application and applicant statistics.
- Export application lists as CSV files.

Business rules:

- Each application must be reviewed independently.
- A decision on one application must not affect another application submitted by the same student.
- Shortlisted means the application passed CV screening; it does not mean the applicant has been accepted.
- Rejected applications must not enter interview scheduling.
- Internal screening notes must only be accessible to Executives.

### 1.8. C8 – Interview Scheduling

Executives can:

- Select an interview date.
- Select a scheduling time window.
- Choose an interview duration of 15, 20, or 30 minutes.
- Generate a draft interview schedule.
- Review Proposed, Unassigned, and Conflict assignments.
- Edit existing assignments.
- Resolve scheduling conflicts.
- Manually assign interview slots.
- Save schedule changes as a draft.
- Export the interview schedule.
- Approve and confirm the final schedule.

Scheduling constraints:

1. Only Shortlisted applications can enter interview scheduling.
2. Each application can have at most one interview.
3. Each interview must have one assigned interviewer.
4. The interviewer must be qualified for the relevant position.
5. The applicant must be available during the assigned time slot.
6. The interviewer must be available during the assigned time slot.
7. The selected room must be available.
8. Each room can host only one interview at a time.
9. An applicant cannot attend two overlapping interviews.
10. An interviewer cannot conduct two overlapping interviews.

Scheduling algorithm:

- Sequentially select the first available combination of time slot, interviewer, and room.
- Applications that cannot be scheduled must remain Unassigned.
- Display a specific reason for every Unassigned application.
- Do not automatically reject applicants because scheduling is unavailable.

Schedule confirmation requirements:

- The campaign application period must have closed.
- All applications must have been reviewed.
- Every Shortlisted application must have a valid interview assignment.
- No applications can remain Unassigned.
- No scheduling conflicts can remain.

After confirmation:

- Campaign configuration becomes read-only.
- Applications become read-only.
- The confirmed schedule becomes read-only.
- Applicants and interviewers can view their own confirmed schedules.
- Schedule editing and regeneration must be disabled.

### 1.9. C9 – Interview Assessment

Interviewers can:

- Access applications assigned to them.
- Review the relevant applicant information and CV.
- Submit an assessment after completing an assigned interview.

Business rules:

- Each completed interview must have one assessment.
- Each application can have at most one assessment.
- Assessments must be associated with the correct application and interview.
- Only the assigned interviewer can submit the assessment.

### 1.10. C10 – Final Results & Notifications

Executives can:

- Review submitted interview assessments.
- Record a final Pass or Fail decision for each application.
- Publish final recruitment results.

System responsibilities:

- Update the corresponding application result.
- Make the result visible to the correct applicant.
- Send an in-app notification when the result is published.

Business rules:

- Final results must be independent for each position.
- Shortlisted and Rejected are CV screening outcomes.
- Pass and Fail are final recruitment outcomes.
- Publishing a result for one application must not change another application belonging to the same student.

### 1.11. C11 – Interviewer Workspace

Interviewers can:

- Sign in to the system.
- View their assigned confirmed interview schedules.
- View assigned applicants' information.
- Read CVs belonging to assigned applications.
- View relevant position information.
- Submit assessments after completing interviews.

Access restrictions:

- Interviewers can only access applications assigned to them.
- Interviewers cannot browse all campaign applications.
- Interviewers cannot view Executive internal screening notes.
- Interviewers cannot modify confirmed schedules.
- Interviewers cannot make final Pass/Fail decisions.

---

## 2. Actors and Access Control

### 2.1. Actor Definitions

| Actor | Description | Main Responsibilities |
|---|---|---|
| Visitor | An unauthenticated user. | Browse public recruitment campaigns. |
| Executive | A club executive or recruitment lead. | Manage campaigns, interviewers, applications, schedules, and final results. |
| Applicant | A student applying for recruitment positions. | Submit applications and track personal application progress. |
| Interviewer | An assigned club interviewer. | View assigned interviews, read CVs, and submit assessments. |

The system supports one club and three pre-created authenticated roles. Departments represent organizational units and do not replace access roles.

### 2.2. Access Control Matrix

| Function | Visitor | Executive | Applicant | Interviewer |
|---|:---:|:---:|:---:|:---:|
| View public campaigns | Yes | Yes | Yes | Yes |
| Sign in | No | Yes | Yes | Yes |
| Manage campaigns | No | Yes | No | No |
| Manage interviewers | No | Yes | No | No |
| Submit applications | No | No | Yes | No |
| View all applications | No | Yes | No | No |
| View personal applications | No | Yes | Yes | No |
| Screen CVs | No | Yes | No | No |
| View internal notes | No | Yes | No | No |
| Generate interview schedules | No | Yes | No | No |
| View personal confirmed schedules | No | Yes | Yes | Yes |
| View assigned CVs | No | Yes | No | Yes |
| Submit assessments | No | No | No | Yes |
| Record final Pass/Fail decisions | No | Yes | No | No |
| View personal final results | No | Yes | Yes | No |

**Security requirement:** Frontend visibility restrictions are not sufficient. The backend must validate authentication, user roles, resource ownership, and interviewer assignments for every protected API operation.

---

## 3. End-to-End Business Workflow

The complete recruitment process consists of the following stages:

| Step | Requirement | Actor | Main Activity |
|---|---|---|---|
| 1 | C1 | All authenticated users | Sign in and establish role-based permissions. |
| 2 | C2 | Visitor / Applicant | Browse published recruitment campaigns. |
| 3 | C3 | Executive | Create, configure, preview, and publish a campaign. |
| 4 | C4 | Executive | Assign interviewers, enter availability, and select rooms. |
| 5 | C5 | Applicant | Submit applications for selected positions. |
| 6 | C6 | Applicant | Track personal application progress. |
| 7 | C7 | Executive | Review CVs and shortlist or reject applications. |
| 8 | C8 | Executive | Generate, adjust, validate, and confirm interview schedules. |
| 9 | C11 | Interviewer | View assigned confirmed schedules and applicant CVs. |
| 10 | C9 | Interviewer | Submit assessments after completed interviews. |
| 11 | C10 | Executive / Applicant | Record final decisions and notify applicants. |

### 3.1. Application Status Flow

The application lifecycle must distinguish between CV screening, interview scheduling, and final recruitment results.

**CV Screening**

- Submitted
- Shortlisted
- Rejected

**Interview Scheduling**

- Proposed
- Unassigned
- Conflict
- Confirmed

**Final Recruitment**

- Interview Completed
- Pass
- Fail

These states represent different stages and must not be treated as interchangeable.

For example, Shortlisted only means that an application passed CV screening. It does not mean that the applicant has been accepted or that an interview has already been confirmed.

### 3.2. Important Business Scenarios

| Scenario | Expected System Behavior |
|---|---|
| A student applies for two positions. | Create two independent application records. |
| A student submits a duplicate application for the same position. | Open the existing application. |
| An application is Rejected. | Exclude it from interview scheduling. |
| No qualified interviewer is available. | Mark the application Unassigned and display the reason. |
| No room is available. | Mark the application Unassigned and display the reason. |
| An applicant has overlapping interviews. | Detect a scheduling conflict. |
| An interviewer has overlapping interviews. | Detect a scheduling conflict. |
| A room has overlapping interviews. | Detect a scheduling conflict. |
| The campaign is still open. | Prevent schedule confirmation. |
| Some applications remain unreviewed. | Prevent schedule confirmation. |
| Applications remain Unassigned or Conflict. | Prevent schedule confirmation. |
| A confirmed schedule is opened. | Display it in read-only mode. |
| An interviewer accesses an unassigned application. | Deny access. |
| An applicant attempts to view internal notes. | Deny access. |

---

## 4. Fix These – Mandatory Issues to Avoid

The official brief identifies the following eight issues that must not appear in the team's implementation.

| # | Issue | Required Resolution |
|---|---|---|
| 1 | Inconsistent Timeline | Use one consistent timeline across all three screens. |
| 2 | Wrong Page Title | Screen 2 must display "Application Review", not the campaign creation title. |
| 3 | Drawer Covers List | Keep both the application list and details readable at all screen widths. |
| 4 | Incorrect Counts | Proposed, Conflict, and Unassigned counts must match the actual schedule rows. |
| 5 | Fake Conflict | Every conflict must be supported by a real overlapping applicant, interviewer, or room assignment. |
| 6 | People Overlap | Do not use the same sample person as both an applicant and an interviewer. |
| 7 | Verified Claims | Do not imply university student or account verification. |
| 8 | Template Footer | Remove the specified template footer content. |

### 4.1. Detailed Fix Requirements

**Fix 1 – Inconsistent Timeline**

- Use consistent campaign opening and closing dates.
- Use a valid interview date.
- Ensure the interview schedule follows the campaign closing and review workflow.
- Keep dates consistent across all screens.

**Fix 2 – Wrong Page Title**

Screen 2 must use the application-review title, not the campaign-creation title.
The implemented page uses `Duyệt hồ sơ ứng tuyển` (Application Review).

Do not retain:

`Create Recruitment Campaign · DRAFT MODE`

**Fix 3 – Drawer Covers List**

- Desktop: Keep the application list and details drawer visible together.
- Tablet: Adjust the layout and widths appropriately.
- Mobile: Use a responsive drawer or separate details view.
- Never make the application list unreadable when details are opened.

**Fix 4 – Incorrect Counts**

Schedule statistics must be calculated from actual schedule records.

Example:

| Status | Count |
|---|---:|
| Proposed | 5 |
| Conflict | 1 |
| Unassigned | 2 |
| Total | 8 |

The example is illustrative. Actual statistics must always reflect the underlying data.

**Fix 5 – Fake Conflict**

A conflict must be caused by an actual overlapping assignment involving:

- The same applicant.
- The same interviewer.
- The same room.

A conflict must not be displayed simply because two interviews happen on the same date.

**Fix 6 – People Overlap**

Use distinct sample identities for applicants, interviewers, and executives.

Specifically, do not reuse Trần Gia Huy or Hoàng Thảo Vy as both applicants and interviewers in the sample schedule.

**Fix 7 – Verified Claims**

Do not use the following labels:

- Verified Student
- 100% verified
- Verified Attachments
- Verified Student Credentials

Acceptable alternatives include:

- Application Submitted
- CV Uploaded
- PDF Attached
- Account Active

**Fix 8 – Template Footer**

Remove:

- © 2025 ClubFlow
- Privacy Policy
- Terms of Service
- Support Center

---

## 5. Project Scope and Limitations

### 5.1. In Scope

- One club.
- One active recruitment campaign at a time.
- Three pre-created authenticated roles.
- Sign-in and role-based access control.
- Campaign creation and publication.
- Application submission and CV upload.
- One CV screening round per application.
- Interviewer assignment and availability management.
- One interview date per campaign.
- One interview per application.
- One interviewer per interview.
- One assessment per completed interview.
- Interview schedule generation and conflict detection.
- Schedule confirmation and read-only behavior.
- Final Pass/Fail decisions.
- In-app notifications.
- CSV application export.
- Interview schedule export.

### 5.2. Out of Scope

The following features must not be treated as required deliverables:

1. Multiple clubs or simultaneous recruitment campaigns.
2. Self-service account registration or recovery.
3. University account verification.
4. Multi-level administrative access control.
5. Dynamic room creation.
6. Room capacity management.
7. University room booking integration.
8. Checking schedules outside the active campaign.
9. Large-scale schedule optimization.
10. University Single Sign-On (SSO).
11. AI-powered CV screening or ranking.
12. Advanced analytics dashboards.
13. Audit trails.
14. Customizable application forms.
15. Post-recruitment member and event management.
16. Internal task assignment systems.
17. Chat and video calls.
18. Payment functionality.
19. Dedicated mobile applications.

---

## 6. Key Data and Consistency Requirements

The following rules should guide API Contract design and backend implementation.

| Entity / Data | Important Rules |
|---|---|
| User | Must have an authorized role. |
| Campaign | Must belong to the club and follow valid campaign dates. |
| Department | Represents an organizational unit, not an access role. |
| Position | Belongs to a department and campaign. |
| Interviewer Assignment | Associates an interviewer with one or more positions. |
| Interviewer Availability | Entered by the Executive. |
| Room | Selected from existing rooms. |
| Application | Belongs to one applicant, one campaign, and one position. |
| CV | PDF only, maximum 5 MB. |
| Motivation Statement | Maximum 300 words. |
| Screening Note | Visible to Executives only. |
| Interview | At most one per application, with one interviewer and one room. |
| Assessment | At most one per completed interview. |
| Final Result | Pass or Fail, independent for each application. |
| Notification | Delivered to the relevant applicant. |

### 6.1. Data Integrity Rules

- An applicant cannot have duplicate applications for the same position in the same campaign.
- An applicant may have multiple applications for different positions.
- Screening decisions must be independent across applications.
- Only Shortlisted applications can be scheduled.
- Every interview must reference the correct application.
- Every interview must use a qualified assigned interviewer.
- Applicant, interviewer, and room availability must be validated.
- Confirmed schedules cannot be modified.
- Assessments must reference the correct interview and application.
- Final decisions must be recorded independently for each application.
- Applicants and interviewers must only access authorized data.

---

## 7. Task Distribution Across Three Team Members

The proposed functional ownership is:

| Member | Assigned Requirements | Responsibilities |
|---|---|---|
| Member 1 | C1, C2, C5, C6 | Authentication, public campaigns, application submission, and applicant tracking. |
| Member 2 | C3, C4, C7 | Campaign management, interviewer management, and CV screening. |
| Member 3 | C8, C9, C10, C11 | Interview scheduling, assessments, final results, notifications, and interviewer workspace. |

All members should coordinate on:

- API Contract consistency.
- Shared data models.
- Authentication and authorization.
- Mock Server integration.
- Frontend and backend integration.
- Error response conventions.
- Testing and validation.

### Suggested Development Workflow

`API Contract → Mock Server → Backend/Frontend Implementation → Integration → QA`

The API Contract should be reviewed before implementing the Mock Server to minimize inconsistencies between team members.

---

## 8. Final Requirements Checklist

### Functional Requirements

- [ ] C1 – Authentication & Authorization
- [ ] C2 – Public Campaign
- [ ] C3 – Campaign Management
- [ ] C4 – Interviewer Management
- [ ] C5 – Application Submission
- [ ] C6 – Applicant Tracking
- [ ] C7 – CV Screening & Review
- [ ] C8 – Interview Scheduling
- [ ] C9 – Interview Assessment
- [ ] C10 – Final Results & Notifications
- [ ] C11 – Interviewer Workspace

### Fix These Validation

- [ ] Fix 1 – Consistent timeline across screens.
- [ ] Fix 2 – Correct Screen 2 page title.
- [ ] Fix 3 – Responsive application list and drawer.
- [ ] Fix 4 – Accurate schedule statistics.
- [ ] Fix 5 – Real scheduling conflicts only.
- [ ] Fix 6 – Distinct applicant and interviewer identities.
- [ ] Fix 7 – No university verification claims.
- [ ] Fix 8 – Remove template footer content.

---

## 9. Important Implementation Principles

1. **Keep application decisions independent.** A student applying for multiple positions must have separate application records and independent screening and final results.

2. **Enforce authorization on the backend.** Never rely solely on frontend visibility to protect private information.

3. **Separate screening from final recruitment.** Shortlisted/Rejected and Pass/Fail belong to different stages.

4. **Validate scheduling constraints consistently.** Applicant, interviewer, and room conflicts must be checked after every schedule modification and before confirmation.

5. **Use real data for statistics.** Counts and scheduling statuses must be derived from actual records rather than hardcoded sample values.

6. **Preserve post-confirmation workflows.** Confirming a schedule locks campaign configuration, applications, and schedule editing, but must not prevent interview assessments or final recruitment decisions.

7. **Follow the official scope.** Do not spend development time on features explicitly excluded from the semester project.

---

**Document Purpose:** This requirements analysis serves as the shared functional and business-rule baseline for ClubFlow PA#3–PA#6, including API Contract design, backend implementation, frontend integration, and testing.

**Source of Truth:** Official ClubFlow Final Project Brief, CSC13008, HK1 2026–2027.
