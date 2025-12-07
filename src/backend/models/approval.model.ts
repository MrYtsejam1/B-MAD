/**
 * Approval Workflow Models
 * 
 * Data models for the Phase 2 approval workflow system.
 * Supports both travel and invoice approval flows with Budibase integration.
 */

// Approval types
export type ApprovalType = 'travel' | 'invoice';

// Travel approval status flow:
// draft -> submitted -> manager_review -> manager_approved -> travel_office_review -> 
// travel_office_approved -> security_review -> security_approved -> booked
// (can be rejected at any step)
export type TravelApprovalStatus = 
  | 'draft'
  | 'submitted'
  | 'manager_review'
  | 'manager_approved'
  | 'travel_office_review'
  | 'travel_office_approved'
  | 'security_review'
  | 'security_approved'
  | 'rejected'
  | 'booked';

// Invoice approval status flow:
// draft -> submitted -> manager_review -> manager_approved -> finance_review -> 
// finance_approved -> reimbursed
// (can be rejected at any step)
export type InvoiceApprovalStatus = 
  | 'draft'
  | 'submitted'
  | 'manager_review'
  | 'manager_approved'
  | 'finance_review'
  | 'finance_approved'
  | 'rejected'
  | 'reimbursed';

export type ApprovalStatus = TravelApprovalStatus | InvoiceApprovalStatus;

// Approval step names
export type ApprovalStepName = 
  | 'manager'
  | 'travel_office'
  | 'security'
  | 'finance';

export type StepStatus = 'pending' | 'approved' | 'rejected' | 'skipped';

/**
 * Individual approval step in the workflow
 */
export interface ApprovalStep {
  id: string;
  name: ApprovalStepName;
  status: StepStatus;
  approverEmail?: string;
  approverName?: string;
  approvedAt?: string;
  rejectedAt?: string;
  comment?: string;
  order: number;
}

/**
 * Main approval request record
 */
export interface ApprovalRequest {
  id: string;
  type: ApprovalType;
  status: ApprovalStatus;
  submittedBy: string;
  submittedByEmail: string;
  sessionId?: string;
  formData: Record<string, unknown>;
  attachments?: string[];
  steps: ApprovalStep[];
  currentStep: ApprovalStepName | null;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  rejectionReason?: string;
}

/**
 * Request to create a new approval
 */
export interface CreateApprovalRequest {
  type: ApprovalType;
  submittedBy: string;
  submittedByEmail: string;
  sessionId?: string;
  formData: Record<string, unknown>;
  attachments?: string[];
}

/**
 * Response from creating an approval
 */
export interface CreateApprovalResponse {
  success: boolean;
  approvalId?: string;
  status?: ApprovalStatus;
  message?: string;
  error?: string;
}

/**
 * Response for approval status query
 */
export interface ApprovalStatusResponse {
  success: boolean;
  approval?: ApprovalRequest;
  error?: string;
}

/**
 * Webhook payload from Budibase
 */
export interface BudibaseWebhookPayload {
  event: 'approval_updated' | 'step_completed' | 'approval_rejected';
  approvalId: string;
  step?: ApprovalStepName;
  status: ApprovalStatus;
  approverEmail?: string;
  approverName?: string;
  comment?: string;
  timestamp: string;
}

/**
 * Approval workflow configuration
 */
export interface ApprovalWorkflowConfig {
  travel: {
    steps: ApprovalStepName[];
    notifyOnSubmit: string[];
    notifyOnComplete: string[];
  };
  invoice: {
    steps: ApprovalStepName[];
    notifyOnSubmit: string[];
    notifyOnComplete: string[];
  };
}

/**
 * Default workflow configuration
 */
export const DEFAULT_WORKFLOW_CONFIG: ApprovalWorkflowConfig = {
  travel: {
    steps: ['manager', 'travel_office', 'security'],
    notifyOnSubmit: ['manager'],
    notifyOnComplete: ['submitter', 'travel_office'],
  },
  invoice: {
    steps: ['manager', 'finance'],
    notifyOnSubmit: ['manager'],
    notifyOnComplete: ['submitter', 'finance'],
  },
};

/**
 * Get the next step in the approval workflow
 */
export function getNextStep(
  type: ApprovalType,
  currentStep: ApprovalStepName,
  config: ApprovalWorkflowConfig = DEFAULT_WORKFLOW_CONFIG
): ApprovalStepName | null {
  const steps = config[type].steps;
  const currentIndex = steps.indexOf(currentStep);
  
  if (currentIndex === -1 || currentIndex >= steps.length - 1) {
    return null;
  }
  
  return steps[currentIndex + 1];
}

/**
 * Get the status after a step is approved
 */
export function getStatusAfterApproval(
  type: ApprovalType,
  step: ApprovalStepName
): ApprovalStatus {
  if (type === 'travel') {
    switch (step) {
      case 'manager':
        return 'manager_approved';
      case 'travel_office':
        return 'travel_office_approved';
      case 'security':
        return 'security_approved';
      default:
        return 'submitted';
    }
  } else {
    switch (step) {
      case 'manager':
        return 'manager_approved';
      case 'finance':
        return 'finance_approved';
      default:
        return 'submitted';
    }
  }
}

/**
 * Check if approval is complete (fully approved or final state)
 */
export function isApprovalComplete(status: ApprovalStatus): boolean {
  return ['booked', 'reimbursed', 'security_approved', 'finance_approved'].includes(status);
}

/**
 * Check if approval is rejected
 */
export function isApprovalRejected(status: ApprovalStatus): boolean {
  return status === 'rejected';
}

/**
 * Budibase API response types
 * Note: Budibase uses approvalType, approvalCreatedAt, approvalUpdatedAt, approvalCompletedAt
 * to avoid reserved column names (type, createdAt, updatedAt)
 */
export interface BudibaseRowResponse {
  _id: string;
  // New column names (avoiding Budibase reserved names)
  approvalType?: string;
  approvalCreatedAt?: string;
  approvalUpdatedAt?: string;
  approvalCompletedAt?: string;
  // Legacy column names (for backwards compatibility)
  type?: string;
  createdAt?: string;
  updatedAt?: string;
  completedAt?: string;
  // Standard columns
  status?: string;
  submittedBy?: string;
  submittedByEmail?: string;
  sessionId?: string;
  formData?: string | Record<string, unknown>;
  attachments?: string | string[];
  steps?: string | ApprovalStep[];
  currentStep?: string;
  rejectionReason?: string;
  [key: string]: unknown;
}

export interface BudibaseSearchResponse {
  data: BudibaseRowResponse[];
}
