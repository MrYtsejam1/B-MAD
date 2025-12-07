# Phase 2: Approval Workflow with Budibase

## Overview

This document outlines the Phase 2 implementation plan for adding approval workflows to the B-MAD system using Budibase as the workflow orchestration and approver UI platform.

## Goals

1. Implement multi-step approval workflows for travel requests and invoice submissions
2. Provide approvers with a dedicated UI to review and approve/reject requests
3. Send email notifications to approvers when action is required
4. Track approval status and history
5. Integrate seamlessly with the existing B-MAD conversational chatbot

## Approval Chains

### Travel Request Approval Flow

```
SUBMITTED → MANAGER_REVIEW → TRAVEL_OFFICE_REVIEW → SECURITY_REVIEW → APPROVED → BOOKED
                ↓                    ↓                    ↓
            REJECTED             REJECTED             REJECTED
```

**Approvers:**
1. **Manager** - Direct manager of the employee submitting the request
2. **Travel Office** - Travel department team (handles booking logistics)
3. **Security** - Security team (for international travel or sensitive destinations)

### Invoice/Expense Approval Flow

```
SUBMITTED → MANAGER_REVIEW → FINANCE_REVIEW → APPROVED → REIMBURSED
                ↓                 ↓
            REJECTED          REJECTED
```

**Approvers:**
1. **Manager** - Direct manager of the employee submitting the expense
2. **Finance/Accounts** - Finance department (handles reimbursement)

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────────────┐
│                         B-MAD Application                            │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐ │
│  │   Chatbot UI    │───▶│  LangChain Agent │───▶│   MCP Gateway   │ │
│  │  (Form Input)   │    │  (Orchestration) │    │  (API Routing)  │ │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘ │
│           │                      │                      │           │
│           │                      ▼                      │           │
│           │              ┌─────────────────┐            │           │
│           │              │  Redis Session  │            │           │
│           │              │    Storage      │            │           │
│           │              └─────────────────┘            │           │
└───────────┼──────────────────────┼──────────────────────┼───────────┘
            │                      │                      │
            │                      ▼                      │
            │         ┌─────────────────────────┐         │
            │         │    Budibase API         │         │
            │         │  (Approval Creation)    │         │
            │         └─────────────────────────┘         │
            │                      │                      │
            │                      ▼                      │
            │    ┌─────────────────────────────────────┐  │
            │    │           Budibase Platform         │  │
            │    │  ┌─────────────┐  ┌──────────────┐  │  │
            │    │  │  Approver   │  │  Automation  │  │  │
            │    │  │  Dashboard  │  │   Engine     │  │  │
            │    │  └─────────────┘  └──────────────┘  │  │
            │    │  ┌─────────────┐  ┌──────────────┐  │  │
            │    │  │  Budibase   │  │    Email     │  │  │
            │    │  │     DB      │  │ Notifications│  │  │
            │    │  └─────────────┘  └──────────────┘  │  │
            │    └─────────────────────────────────────┘  │
            │                      │                      │
            │                      ▼                      │
            │         ┌─────────────────────────┐         │
            └────────▶│   Webhook Callback      │◀────────┘
                      │  (Status Updates)       │
                      └─────────────────────────┘
```

### Data Flow

1. **Request Submission:**
   - User interacts with B-MAD chatbot
   - LangChain agent collects travel/invoice data
   - Form is generated and submitted
   - B-MAD calls Budibase API to create approval request

2. **Approval Processing:**
   - Budibase creates approval record in its database
   - Automation triggers email notification to first approver
   - Approver accesses Budibase dashboard
   - Approver reviews request and approves/rejects

3. **Status Updates:**
   - Budibase automation moves to next approval step
   - Email notification sent to next approver
   - Process repeats until final approval or rejection

4. **Completion Callback:**
   - Budibase calls B-MAD webhook with final status
   - B-MAD updates session/record with approval result
   - User is notified of outcome

## Budibase Data Model

### Tables

#### 1. ApprovalRequests

| Field | Type | Description |
|-------|------|-------------|
| id | Auto ID | Primary key |
| type | Options | "travel" or "invoice" |
| status | Options | Current workflow status |
| currentStep | Text | Current approval step |
| submittedBy | Text | Employee name |
| submittedByEmail | Email | Employee email |
| submittedAt | DateTime | Submission timestamp |
| formData | JSON | Complete form data from B-MAD |
| bmadSessionId | Text | Reference to B-MAD session |

#### 2. ApprovalSteps

| Field | Type | Description |
|-------|------|-------------|
| id | Auto ID | Primary key |
| requestId | Link | Reference to ApprovalRequests |
| stepName | Text | "manager", "travel_office", "security", "finance" |
| stepOrder | Number | Order in approval chain |
| assignedTo | Email | Approver email |
| status | Options | "pending", "approved", "rejected" |
| comment | Long Text | Approver comment |
| actionAt | DateTime | When action was taken |
| actionBy | Text | Who took the action |

#### 3. Approvers

| Field | Type | Description |
|-------|------|-------------|
| id | Auto ID | Primary key |
| role | Options | "manager", "travel_office", "security", "finance" |
| email | Email | Approver email address |
| name | Text | Approver display name |
| department | Text | Department (for routing) |
| isActive | Boolean | Whether approver is active |

### Status Values

**Travel Request:**
- `draft` - Not yet submitted
- `submitted` - Awaiting manager review
- `manager_approved` - Manager approved, awaiting travel office
- `travel_office_approved` - Travel office approved, awaiting security
- `security_approved` - All approvals complete
- `rejected` - Rejected at any step
- `booked` - Travel has been booked

**Invoice Request:**
- `draft` - Not yet submitted
- `submitted` - Awaiting manager review
- `manager_approved` - Manager approved, awaiting finance
- `finance_approved` - All approvals complete
- `rejected` - Rejected at any step
- `reimbursed` - Payment processed

## Budibase Automations

### 1. On Request Created

**Trigger:** Row Created in ApprovalRequests

**Actions:**
1. Create ApprovalSteps records based on request type
2. Assign first approver based on Approvers table
3. Send email notification to first approver
4. Update request status to "submitted"

### 2. On Step Approved

**Trigger:** Row Updated in ApprovalSteps (status = "approved")

**Actions:**
1. Check if more steps remain
2. If yes: Update next step to "pending", send email to next approver
3. If no: Update request status to final approved state
4. Call B-MAD webhook with status update

### 3. On Step Rejected

**Trigger:** Row Updated in ApprovalSteps (status = "rejected")

**Actions:**
1. Update request status to "rejected"
2. Send email notification to submitter with rejection reason
3. Call B-MAD webhook with rejection status

### 4. Daily Reminder

**Trigger:** Scheduled (daily at 9 AM)

**Actions:**
1. Query pending approval steps older than 24 hours
2. Send reminder emails to approvers
3. Log reminder sent

## Budibase UI Screens

### 1. Approver Dashboard

**Purpose:** Main view for approvers to see pending requests

**Components:**
- Filter by request type (Travel/Invoice)
- Table showing pending requests assigned to current user
- Quick action buttons (Approve/Reject)
- Click to view details

### 2. Request Detail View

**Purpose:** Detailed view of a single request

**Components:**
- Request summary (type, submitter, date)
- Form data display (travel details or invoice details)
- Approval history timeline
- Approve/Reject buttons with comment field
- Attached documents (for invoices)

### 3. Admin Dashboard

**Purpose:** Overview for administrators

**Components:**
- Statistics (pending, approved, rejected counts)
- All requests table with filters
- Approver management
- Audit log

## B-MAD Integration

### API Endpoints to Add

#### POST /api/approvals/create

Creates a new approval request in Budibase.

**Request:**
```json
{
  "type": "travel" | "invoice",
  "submittedBy": "דוד גואטה",
  "submittedByEmail": "david@company.com",
  "sessionId": "session-123",
  "formData": {
    "workerName": "דוד גואטה",
    "destinationCity": "רומא",
    "departureCity": "תל אביב",
    "departureDate": "2025-12-15",
    "returnDate": "2025-12-20",
    ...
  }
}
```

**Response:**
```json
{
  "success": true,
  "approvalId": "approval-456",
  "status": "submitted",
  "currentStep": "manager"
}
```

#### GET /api/approvals/:id/status

Gets the current status of an approval request.

#### POST /api/webhooks/budibase/status

Webhook endpoint for Budibase to call with status updates.

**Request:**
```json
{
  "approvalId": "approval-456",
  "status": "manager_approved",
  "currentStep": "travel_office",
  "actionBy": "manager@company.com",
  "comment": "Approved for business trip"
}
```

### MCP Server Updates

Update `config/servers.mcp.json` to add approval-related workflow steps:

```json
{
  "workflow": {
    "steps": [
      "DRAFT",
      "SUBMITTED",
      "MANAGER_REVIEW",
      "TRAVEL_OFFICE_REVIEW",
      "SECURITY_REVIEW",
      "APPROVED",
      "BOOKED"
    ]
  }
}
```

### Session Service Updates

Add approval tracking to session data:

```typescript
interface SessionData {
  // ... existing fields
  approvalId?: string;
  approvalStatus?: string;
  approvalHistory?: ApprovalHistoryEntry[];
}

interface ApprovalHistoryEntry {
  step: string;
  status: 'approved' | 'rejected';
  by: string;
  at: Date;
  comment?: string;
}
```

## Deployment

### Budibase Deployment Options

1. **Budibase Cloud (Recommended for MVP)**
   - Sign up at https://budibase.com
   - Free tier available
   - No infrastructure to manage

2. **Self-Hosted on Render**
   - Deploy Budibase via Docker
   - Add as new Render service
   - Connect to same Redis/Postgres

### Environment Variables

Add to B-MAD Render service:

```
BUDIBASE_API_URL=https://your-budibase-instance.budibase.app
BUDIBASE_API_KEY=your-api-key
BUDIBASE_APP_ID=your-app-id
APPROVAL_WEBHOOK_SECRET=your-webhook-secret
```

## Implementation Phases

### Phase 2.1: Budibase Setup (Week 1)

1. Create Budibase account/instance
2. Design and create data tables
3. Build approver dashboard UI
4. Configure automations for email notifications

### Phase 2.2: B-MAD Integration (Week 2)

1. Add approval API endpoints to B-MAD
2. Update form submission flow to create approval requests
3. Implement webhook handler for status updates
4. Update session service for approval tracking

### Phase 2.3: Testing & Polish (Week 3)

1. End-to-end testing of approval flows
2. Email template customization
3. Hebrew language support in Budibase UI
4. Error handling and edge cases

### Phase 2.4: Deployment (Week 4)

1. Deploy Budibase (cloud or self-hosted)
2. Configure production environment variables
3. Set up monitoring and alerts
4. User acceptance testing

## Security Considerations

1. **API Authentication:** Use API keys for B-MAD to Budibase communication
2. **Webhook Verification:** Sign webhooks with secret to prevent spoofing
3. **Role-Based Access:** Approvers can only see requests assigned to them
4. **Audit Trail:** Log all approval actions with timestamps and user info
5. **Data Privacy:** Sensitive data (amounts, personal info) only visible to authorized approvers

## Success Metrics

1. **Approval Time:** Average time from submission to final approval
2. **Rejection Rate:** Percentage of requests rejected at each step
3. **User Satisfaction:** Feedback from submitters and approvers
4. **System Reliability:** Uptime and error rates

## Open Questions

1. **Approver Assignment:** How are managers determined? HR system integration or manual configuration?
2. **Escalation:** What happens if an approver doesn't respond within X days?
3. **Delegation:** Can approvers delegate to others when on vacation?
4. **Conditional Steps:** Should security review be skipped for domestic travel?
5. **Amount Thresholds:** Should high-value expenses require additional approvals?

## Next Steps

1. Review this document with stakeholders
2. Decide on Budibase deployment option (cloud vs self-hosted)
3. Define approver roles and email addresses
4. Begin Phase 2.1 implementation
