# Email Templates

This directory contains email templates that are automatically uploaded to S3 and used by the email Lambda processor.

## Directory Structure

```
templates/
├── en/                 # English templates
├── es/                 # Spanish templates
├── fr/                 # French templates
└── styles/             # Shared CSS styles
    └── email_common.css
```

## Available Templates

### 1. Team Invitation Email (`team_invitation_email.html`)

**Purpose:** Invite users to join a team on Rockilus.

**Context Variables:**
- `subject` - Email subject line
- `recipient_name` - Name of the person being invited
- `sender_name` - Name of the person sending the invitation
- `team_name` - Name of the team
- `invitation_link` - URL to accept the invitation

**Languages:** EN, ES, FR

---

### 2. Campaign Started Email (`campaign_started_email.html`)

**Purpose:** Notify team members when a new campaign is created.

**Context Variables:**
- `subject` - Email subject line
- `recipient_name` - Name of the recipient
- `team_name` - Name of the team
- `campaign_start_date` - Campaign start date (formatted string)
- `campaign_end_date` - Campaign end date (formatted string)
- `campaign_duration_days` - Duration in days
- `campaign_link` - URL to view the campaign

**Languages:** EN, ES, FR

---

### 3. Schedule Published Email (`schedule_published_email.html`)

**Purpose:** Notify team members when a schedule is published/validated.

**Context Variables:**
- `subject` - Email subject line
- `recipient_name` - Name of the recipient
- `team_name` - Name of the team
- `schedule_start_date` - Schedule start date (formatted string)
- `schedule_end_date` - Schedule end date (formatted string)
- `schedule_duration_days` - Duration in days
- `validation_date` - Date when schedule was validated (formatted string)
- `schedule_link` - URL to view the schedule

**Languages:** EN, ES, FR

---

### 4. Email Verification (`verification_email.html`)

**Purpose:** Verify user email addresses during registration.

**Languages:** EN, ES, FR

---

### 5. Password Reset (`reset_password_email.html`)

**Purpose:** Send password reset links to users.

**Languages:** EN, ES, FR

---

## Template Formatting

Templates use Python string formatting with curly braces: `{variable_name}`

Example:
```html
<p>Hi {recipient_name},</p>
<p>Welcome to {team_name}!</p>
```

## CSS Styling

All templates reference the shared CSS file:
```html
<link rel="stylesheet" href="../styles/email_common.css">
```

The CSS provides consistent styling across all email templates.

## Deployment Process

1. **Edit Template:** Modify the HTML/CSS files in this directory
2. **Commit Changes:** Commit to Git
3. **Deploy:** Run `terraform apply` in the environment (staging/prod)
4. **Automatic Upload:** Terraform detects changes via `filemd5()` and uploads updated templates to S3
5. **Lambda Usage:** Email Lambda reads templates from S3 on next invocation

## Rollback Strategy

If a template contains errors after deployment:

1. **Revert in Git:** `git revert <commit-hash>`
2. **Redeploy:** `terraform apply`
3. **Verify:** Templates are restored to previous version in S3

## Adding New Templates

1. Create HTML file in `en/`, `es/`, and `fr/` directories
2. Document required context variables in this README
3. Add template enum to `backend/shared/src/shared/schemas/core/email.py` (EmailType)
4. Add enqueue method to `backend/api_gateway/src/services/email_queue_service.py`
5. Commit and run `terraform apply`

## Template Caching

Lambda functions cache templates in `/tmp/` for performance. Cache is per Lambda instance and survives until the instance is recycled (typically after ~15 minutes of inactivity).

## Notes

- Templates are shared across all environments (staging, production)
- S3 versioning is disabled; Git is the source of truth for template history
- Template changes are detected automatically via file hash (etag)
- CSS must be inline-friendly for maximum email client compatibility
