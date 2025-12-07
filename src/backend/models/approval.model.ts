/**
 * Approval Workflow Models
 * 
 * Data models for the Phase 2 approval workflow integration with Budibase.
 */

// Approval request types
export type ApprovalType = 'travel' | 'invoice';

// Approval status values
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

// Approval step status
export type StepStatus = 'pending' | 'approved' | 'rejected' | 'skipped';

/**
 * Approval request creation payload
 */
export interface CreateApprovalRequest {
  type: ApprovalType;
  submittedBy: string;
  submittedByEmail: string;
  sessionId: string;
  formData: Record<string, any>;
  attachments?: ApprovalAttachment[];
}

/**
 * Approval attachment (for invoices)
 */
export interface ApprovalAttachment {
  filename: string;
  url: string;
  mimeType: string;
  size?: number;
}

/**
 * Approval request record
 */
export interface ApprovalRequest {
  id: string;
  type: ApprovalType;
  status: ApprovalStatus;
  currentStep: ApprovalStepName;
  submittedBy: string;
  submittedByEmail: string;
  submittedAt: Date;
  formData: Record<string, any>;
  bmadSessionId: string;
  attachments?: ApprovalAttachment[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Approval step record
 */
export interface ApprovalStep {
  id: string;
  requestId: string;
  stepName: ApprovalStepName;
  stepOrder: number;
  assignedTo: string;
  assignedToName?: string;
  status: StepStatus;
  comment?: string;
  actionAt?: Date;
  actionBy?: string;
}

/**
 * Approval history entry for session tracking
 */
export interface ApprovalHistoryEntry {
  step: ApprovalStepName;
  status: StepStatus;
  by: string;
  at: Date;
  comment?: string;
}

/**
 * Webhook payload from Budibase
 */
export interface BudibaseWebhookPayload {
  approvalId: string;
  status: ApprovalStatus;
  currentStep?: ApprovalStepName;
  actionBy?: string;
  actionByName?: string;
  comment?: string;
  timestamp: string;
  eventType: 'step_approved' | 'step_rejected' | 'request_completed' | 'request_rejected';
}

/**
 * Response from creating an approval
 */
export interface CreateApprovalResponse {
  success: boolean;
  approvalId?: string;
  status?: ApprovalStatus;
  currentStep?: ApprovalStepName;
  error?: string;
}

/**
 * Response from getting approval status
 */
export interface ApprovalStatusResponse {
  success: boolean;
  approval?: ApprovalRequest;
  steps?: ApprovalStep[];
  error?: string;
}

/**
 * Approver configuration
 */
export interface ApproverConfig {
  role: ApprovalStepName;
  email: string;
  name: string;
  department?: string;
}

/**
 * Approval workflow configuration
 */
export interface ApprovalWorkflowConfig {
  travel: {
    steps: ApprovalStepName[];
    skipSecurityForDomestic?: boolean;
  };
  invoice: {
    steps: ApprovalStepName[];
    highValueThreshold?: number;
    additionalApproversForHighValue?: ApprovalStepName[];
  };
}

/**
 * Default workflow configuration
 */
export const DEFAULT_WORKFLOW_CONFIG: ApprovalWorkflowConfig = {
  travel: {
    steps: ['manager', 'travel_office', 'security'],
    skipSecurityForDomestic: false,
  },
  invoice: {
    steps: ['manager', 'finance'],
    highValueThreshold: 10000,
    additionalApproversForHighValue: [],
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
  const steps = type === 'travel' ? config.travel.steps : config.invoice.steps;
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
  const statusMap: Record<ApprovalType, Record<ApprovalStepName, ApprovalStatus>> = {
    travel: {
      manager: 'manager_approved',
      travel_office: 'travel_office_approved',
      security: 'security_approved',
      finance: 'manager_approved', // Not used for travel
    },
    invoice: {
      manager: 'manager_approved',
      finance: 'finance_approved',
      travel_office: 'manager_approved', // Not used for invoice
      security: 'manager_approved', // Not used for invoice
    },
  };
  
  return statusMap[type][step];
}

/**
 * Check if approval is complete
 */
export function isApprovalComplete(status: ApprovalStatus): boolean {
  return [
    'security_approved',
    'finance_approved',
    'booked',
    'reimbursed',
  ].includes(status);
}

/**
 * Check if approval is rejected
 */
export function isApprovalRejected(status: ApprovalStatus): boolean {
  return status === 'rejected';
}
