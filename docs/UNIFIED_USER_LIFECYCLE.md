# Unified User Lifecycle System

## Overview

The Unified User Lifecycle (UUL) system eliminates data fragmentation by creating a seamless data flow from initial contact through employment. A person's data evolves naturally through stages without ever needing to be re-entered.

```
Visitor → Lead → Student/Applicant → Hired → Employee → Alumni
```

## Architecture

### Core Components

1. **Universal DNA (`unified_persons`)** - Single source of truth for identity data
2. **Extended Data Store (`person_extended_data`)** - Flexible JSONB storage for variable history
3. **Promotion Pipeline** - Atomic functions for stage transitions
4. **Magic Link System** - Secure public intake forms
5. **Lifecycle Audit Trail** - Complete history of all transitions

### Database Tables

| Table | Purpose |
|-------|---------|
| `unified_persons` | Core identity record - the "Universal DNA" |
| `person_extended_data` | Versioned JSONB store for variable data |
| `intake_links` | Magic link tokens for external data collection |
| `intake_submissions` | Raw form submissions before processing |
| `lifecycle_transitions` | Audit trail of all stage changes |

## Lifecycle Stages

| Stage | Description | Entry Points |
|-------|-------------|--------------|
| `visitor` | Initial contact (website, event, walk-in) | Direct creation, event attendance |
| `lead` | Marketing/sales qualified lead | CRM import, manual entry |
| `student` | GDU education program participant | Enrollment form, manual promotion |
| `applicant` | Job applicant/candidate | Job application form, promotion from visitor/lead/student |
| `hired` | Accepted offer, awaiting onboarding | Promotion from applicant |
| `employee` | Active employee | Completion of onboarding |
| `alumni` | Former employee | Termination of employee |
| `archived` | Archived record | Manual archival |

## Usage

### Creating Intake Links (Admin)

```typescript
// Using the API
const response = await $fetch('/api/intake/links', {
  method: 'POST',
  body: {
    linkType: 'job_application',
    prefillEmail: 'candidate@example.com',
    prefillFirstName: 'John',
    prefillLastName: 'Doe',
    targetPositionId: 'uuid-of-position',
    expiresInDays: 7,
    sendEmail: true
  }
})

// Returns: { url: 'https://app.example.com/intake/abc123...', token: 'abc123...' }
```

### Processing Public Submissions

Public form submissions are automatically processed:

1. User accesses `/intake/[token]`
2. Form renders based on link type
3. User submits data
4. `intake_submissions` record created
5. `process_intake_submission()` function runs
6. `unified_persons` record created/updated
7. Person automatically promoted based on link type

### Promoting Users (Admin)

```typescript
// Using the API
const response = await $fetch('/api/intake/promote', {
  method: 'POST',
  body: {
    personId: 'uuid-of-person',
    targetStage: 'applicant',
    options: {
      targetPositionId: 'uuid-of-position',
      resumeUrl: 'https://...',
      notes: 'Referred by current employee'
    }
  }
})
```

### Available Promotion Functions

| Function | From Stages | To Stage |
|----------|-------------|----------|
| `promote_to_applicant()` | visitor, lead, student | applicant |
| `promote_to_student()` | visitor, lead | student |
| `promote_to_hired()` | applicant | hired |
| `complete_hire_to_employee()` | hired | employee |

## Extended Data

The `person_extended_data` table stores variable history as versioned JSONB:

```sql
-- Example: Store education history
SELECT upsert_person_extended_data(
  'person-uuid',
  'education',
  '{
    "schools": [
      {
        "name": "UC Davis",
        "program": "Veterinary Technology",
        "graduation_date": "2024-05",
        "gpa": 3.8
      }
    ]
  }'::jsonb,
  'admin-profile-uuid'
);
```

### Data Types

| Type | Use Case |
|------|----------|
| `education` | Schools, degrees, graduation dates |
| `work_history` | Previous employment |
| `certifications` | Professional certifications |
| `licenses` | RVT, DVM, etc. |
| `skills` | Skills and competencies |
| `externship_goals` | GDU externship objectives |
| `interview_notes` | Interview feedback |
| `application_data` | Original job application responses |
| `enrollment_data` | GDU enrollment details |
| `onboarding_progress` | Onboarding checklist state |
| `custom` | Any other structured data |

## Magic Link Types

| Link Type | Form Fields | Auto-Promotion |
|-----------|-------------|----------------|
| `job_application` | Personal info, resume, work history | → `applicant` |
| `student_enrollment` | Personal info, school, program | → `student` |
| `externship_signup` | Personal info, academic info, goals | → `student` |
| `general_intake` | Contact info, message | → `visitor` |
| `referral_partner` | Org info, contact, partnership interest | → `visitor` |
| `event_registration` | Attendee info, professional info | → `visitor` |

## Security

### Row Level Security (RLS)

All tables have strict RLS policies:

- **Admins**: Full CRUD access
- **Authenticated Users**: Read-only access to own records
- **Anonymous (Public)**: INSERT-only for `intake_submissions` (via valid token)

### Duplicate Prevention

The system automatically checks for duplicate emails:

```sql
SELECT * FROM check_duplicate_person_email('test@example.com');
-- Returns: is_duplicate, existing_person_id, existing_stage, existing_name
```

If a duplicate is detected during intake:
1. Submission marked as duplicate
2. Existing person's `last_activity_at` updated
3. No new record created

### Magic Link Security

- Tokens are 64-character hex strings (256 bits of entropy)
- Links expire after configurable period (default: 7 days)
- Single-use: completed links cannot be resubmitted
- IP and User-Agent logged for audit

## Backfilling Existing Data

To migrate existing records into the unified system:

```sql
SELECT * FROM backfill_unified_persons();
```

This will:
1. Create `unified_persons` records from existing `candidates`
2. Create `unified_persons` records from existing `education_visitors`
3. Create `unified_persons` records from existing `marketing_leads`
4. Create `unified_persons` records from existing `employees`
5. Skip duplicates based on email

## API Endpoints

### Admin Endpoints (Authenticated)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/intake/links` | List intake links |
| POST | `/api/intake/links` | Create intake link |
| GET | `/api/intake/persons` | List unified persons |
| POST | `/api/intake/promote` | Promote person to next stage |

### Public Endpoints (No Auth)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/intake/form/[token]` | Get form configuration |
| POST | `/api/intake/form/[token]` | Submit form data |

## Frontend Components

### Pages

- `/intake/[token]` - Public intake form (uses `public` layout)
- `/admin/intake` - Admin dashboard for managing links and persons

### Components

- `IntakeFormField.vue` - Dynamic form field renderer

### Composables

- `useLifecycle()` - State management and API methods for lifecycle operations

## Integration with Existing Systems

The UUL system integrates with existing tables:

| Existing Table | Integration |
|----------------|-------------|
| `candidates` | Created during `promote_to_applicant()` |
| `employees` | Created during `complete_hire_to_employee()` |
| `profiles` | Created during `complete_hire_to_employee()` |
| `education_visitors` | Created during `promote_to_student()` |
| `marketing_leads` | Linked via `marketing_lead_id` |

## Future Enhancements

1. **Email Integration**: Automatic sending of intake invitations via Resend/SendGrid
2. **File Storage**: Integration with Supabase Storage for resume/document uploads
3. **Webhook Notifications**: Notify external systems on stage transitions
4. **Analytics Dashboard**: Funnel visualization and conversion metrics
5. **Bulk Import**: CSV import with automatic deduplication
6. **API Webhooks**: External system integration for stage changes
