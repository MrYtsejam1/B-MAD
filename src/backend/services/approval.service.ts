/**
 * Approval Service
 * 
 * Handles integration with Budibase for approval workflows.
 * Provides methods to create, query, and manage approval requests.
 */

import {
  ApprovalStepName,
  CreateApprovalRequest,
  CreateApprovalResponse,
  ApprovalStatusResponse,
  ApprovalRequest,
  ApprovalStep,
  ApprovalHistoryEntry,
  BudibaseWebhookPayload,
  ApprovalWorkflowConfig,
  DEFAULT_WORKFLOW_CONFIG,
  getNextStep,
  getStatusAfterApproval,
  isApprovalComplete,
  isApprovalRejected,
} from '../models/approval.model';

// Budibase API response type
interface BudibaseRowResponse {
  _id: string;
  type: string;
  status: string;
  currentStep: string;
  submittedBy: string;
  submittedByEmail: string;
  submittedAt: string;
  formData: string;
  bmadSessionId: string;
  createdAt: string;
  updatedAt: string;
}

interface BudibaseSearchResponse {
  data: ApprovalRequest[];
}

// Budibase API configuration
interface BudibaseConfig {
  apiUrl: string;
  apiKey: string;
  appId: string;
  webhookSecret: string;
}

// In-memory storage for demo/development (replace with Budibase API calls in production)
interface ApprovalStore {
  requests: Map<string, ApprovalRequest>;
  steps: Map<string, ApprovalStep[]>;
}

class ApprovalService {
  private config: BudibaseConfig;
  private workflowConfig: ApprovalWorkflowConfig;
  private store: ApprovalStore;
  private useMockMode: boolean;

  constructor() {
    this.config = {
      apiUrl: process.env.BUDIBASE_API_URL || 'https://your-budibase.budibase.app/api/public/v1',
      apiKey: process.env.BUDIBASE_API_KEY || '',
      appId: process.env.BUDIBASE_APP_ID || '',
      webhookSecret: process.env.APPROVAL_WEBHOOK_SECRET || 'dev-secret',
    };

    this.workflowConfig = DEFAULT_WORKFLOW_CONFIG;
    
    // Use mock mode if Budibase is not configured
    this.useMockMode = !this.config.apiKey || !this.config.appId;
    
    // In-memory store for mock mode
    this.store = {
      requests: new Map(),
      steps: new Map(),
    };

    if (this.useMockMode) {
      console.log('[ApprovalService] Running in mock mode - Budibase not configured');
    } else {
      console.log('[ApprovalService] Connected to Budibase:', this.config.apiUrl);
    }
  }

  /**
   * Create a new approval request
   */
  async createApproval(request: CreateApprovalRequest): Promise<CreateApprovalResponse> {
    console.log('[ApprovalService] Creating approval request:', {
      type: request.type,
      submittedBy: request.submittedBy,
      sessionId: request.sessionId,
    });

    try {
      if (this.useMockMode) {
        return this.createMockApproval(request);
      }

      return this.createBudibaseApproval(request);
    } catch (error: any) {
      console.error('[ApprovalService] Error creating approval:', error);
      return {
        success: false,
        error: error.message || 'Failed to create approval request',
      };
    }
  }

  /**
   * Get approval status by ID
   */
  async getApprovalStatus(approvalId: string): Promise<ApprovalStatusResponse> {
    console.log('[ApprovalService] Getting approval status:', approvalId);

    try {
      if (this.useMockMode) {
        return this.getMockApprovalStatus(approvalId);
      }

      return this.getBudibaseApprovalStatus(approvalId);
    } catch (error: any) {
      console.error('[ApprovalService] Error getting approval status:', error);
      return {
        success: false,
        error: error.message || 'Failed to get approval status',
      };
    }
  }

  /**
   * Process webhook from Budibase
   */
  async processWebhook(payload: BudibaseWebhookPayload, signature?: string): Promise<boolean> {
    console.log('[ApprovalService] Processing webhook:', {
      approvalId: payload.approvalId,
      eventType: payload.eventType,
      status: payload.status,
    });

    // Verify webhook signature in production
    if (!this.useMockMode && signature) {
      if (!this.verifyWebhookSignature(payload, signature)) {
        console.error('[ApprovalService] Invalid webhook signature');
        return false;
      }
    }

    try {
      // Update local store if in mock mode
      if (this.useMockMode) {
        const request = this.store.requests.get(payload.approvalId);
        if (request) {
          request.status = payload.status;
          if (payload.currentStep) {
            request.currentStep = payload.currentStep;
          }
          request.updatedAt = new Date();
        }
      }

      // Emit event for session service to handle
      // In a real implementation, this would notify the user
      console.log('[ApprovalService] Webhook processed successfully');
      return true;
    } catch (error: any) {
      console.error('[ApprovalService] Error processing webhook:', error);
      return false;
    }
  }

  /**
   * Simulate approval action (for testing/demo)
   */
  async simulateApprovalAction(
    approvalId: string,
    action: 'approve' | 'reject',
    comment?: string
  ): Promise<ApprovalStatusResponse> {
    if (!this.useMockMode) {
      return {
        success: false,
        error: 'Simulation only available in mock mode',
      };
    }

    const request = this.store.requests.get(approvalId);
    if (!request) {
      return {
        success: false,
        error: 'Approval request not found',
      };
    }

    const steps = this.store.steps.get(approvalId) || [];
    const currentStepIndex = steps.findIndex(s => s.status === 'pending');
    
    if (currentStepIndex === -1) {
      return {
        success: false,
        error: 'No pending approval step',
      };
    }

    const currentStep = steps[currentStepIndex];
    currentStep.status = action === 'approve' ? 'approved' : 'rejected';
    currentStep.actionAt = new Date();
    currentStep.actionBy = currentStep.assignedTo;
    currentStep.comment = comment;

    if (action === 'reject') {
      request.status = 'rejected';
    } else {
      request.status = getStatusAfterApproval(request.type, currentStep.stepName);
      
      // Move to next step if available
      const nextStep = getNextStep(request.type, currentStep.stepName, this.workflowConfig);
      if (nextStep) {
        request.currentStep = nextStep;
        // Mark next step as pending
        const nextStepRecord = steps.find(s => s.stepName === nextStep);
        if (nextStepRecord) {
          nextStepRecord.status = 'pending';
        }
      }
    }

    request.updatedAt = new Date();

    return {
      success: true,
      approval: request,
      steps: steps,
    };
  }

  /**
   * Get approval history for a session
   */
  async getApprovalHistory(sessionId: string): Promise<ApprovalHistoryEntry[]> {
    // Find approval by session ID
    for (const [approvalId, request] of this.store.requests) {
      if (request.bmadSessionId === sessionId) {
        const steps = this.store.steps.get(approvalId) || [];
        return steps
          .filter(s => s.status !== 'pending')
          .map(s => ({
            step: s.stepName,
            status: s.status,
            by: s.actionBy || s.assignedTo,
            at: s.actionAt || new Date(),
            comment: s.comment,
          }));
      }
    }
    return [];
  }

  // Private methods

  /**
   * Create approval in mock mode
   */
  private createMockApproval(request: CreateApprovalRequest): CreateApprovalResponse {
    const approvalId = `approval-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    // Determine workflow steps based on type
    const stepNames = request.type === 'travel'
      ? this.workflowConfig.travel.steps
      : this.workflowConfig.invoice.steps;

    // Create approval request
    const approval: ApprovalRequest = {
      id: approvalId,
      type: request.type,
      status: 'submitted',
      currentStep: stepNames[0],
      submittedBy: request.submittedBy,
      submittedByEmail: request.submittedByEmail,
      submittedAt: now,
      formData: request.formData,
      bmadSessionId: request.sessionId,
      attachments: request.attachments,
      createdAt: now,
      updatedAt: now,
    };

    // Create approval steps
    const steps: ApprovalStep[] = stepNames.map((stepName, index) => ({
      id: `step-${approvalId}-${index}`,
      requestId: approvalId,
      stepName: stepName,
      stepOrder: index + 1,
      assignedTo: this.getMockApproverEmail(stepName),
      assignedToName: this.getMockApproverName(stepName),
      status: index === 0 ? 'pending' : 'pending', // First step is active
      comment: undefined,
      actionAt: undefined,
      actionBy: undefined,
    }));

    // Only first step should be pending, others wait
    steps.forEach((step, index) => {
      if (index > 0) {
        step.status = 'pending';
      }
    });

    // Store
    this.store.requests.set(approvalId, approval);
    this.store.steps.set(approvalId, steps);

    console.log('[ApprovalService] Mock approval created:', {
      approvalId,
      type: request.type,
      steps: stepNames,
    });

    return {
      success: true,
      approvalId,
      status: 'submitted',
      currentStep: stepNames[0],
    };
  }

  /**
   * Create approval via Budibase API
   */
  private async createBudibaseApproval(request: CreateApprovalRequest): Promise<CreateApprovalResponse> {
    const response = await fetch(`${this.config.apiUrl}/tables/ApprovalRequests/rows`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-budibase-api-key': this.config.apiKey,
        'x-budibase-app-id': this.config.appId,
      },
      body: JSON.stringify({
        type: request.type,
        status: 'submitted',
        currentStep: request.type === 'travel' ? 'manager' : 'manager',
        submittedBy: request.submittedBy,
        submittedByEmail: request.submittedByEmail,
        submittedAt: new Date().toISOString(),
        formData: JSON.stringify(request.formData),
        bmadSessionId: request.sessionId,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Budibase API error: ${error}`);
    }

    const data = await response.json() as BudibaseRowResponse;

    return {
      success: true,
      approvalId: data._id,
      status: 'submitted',
      currentStep: 'manager',
    };
  }

  /**
   * Get approval status from mock store
   */
  private getMockApprovalStatus(approvalId: string): ApprovalStatusResponse {
    const approval = this.store.requests.get(approvalId);
    if (!approval) {
      return {
        success: false,
        error: 'Approval request not found',
      };
    }

    const steps = this.store.steps.get(approvalId) || [];

    return {
      success: true,
      approval,
      steps,
    };
  }

  /**
   * Get approval status from Budibase API
   */
  private async getBudibaseApprovalStatus(approvalId: string): Promise<ApprovalStatusResponse> {
    const response = await fetch(`${this.config.apiUrl}/tables/ApprovalRequests/rows/${approvalId}`, {
      method: 'GET',
      headers: {
        'x-budibase-api-key': this.config.apiKey,
        'x-budibase-app-id': this.config.appId,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Budibase API error: ${error}`);
    }

    const data = await response.json() as BudibaseRowResponse;

    return {
      success: true,
      approval: {
        id: data._id,
        type: data.type as ApprovalRequest['type'],
        status: data.status as ApprovalRequest['status'],
        currentStep: data.currentStep as ApprovalStepName,
        submittedBy: data.submittedBy,
        submittedByEmail: data.submittedByEmail,
        submittedAt: new Date(data.submittedAt),
        formData: JSON.parse(data.formData || '{}'),
        bmadSessionId: data.bmadSessionId,
        createdAt: new Date(data.createdAt),
        updatedAt: new Date(data.updatedAt),
      },
    };
  }

  /**
   * Verify webhook signature
   */
  private verifyWebhookSignature(_payload: BudibaseWebhookPayload, signature: string): boolean {
    // In production, implement HMAC verification
    // For now, just check if signature matches secret
    return signature === this.config.webhookSecret;
  }

  /**
   * Get mock approver email based on role
   */
  private getMockApproverEmail(role: ApprovalStepName): string {
    const emails: Record<ApprovalStepName, string> = {
      manager: 'manager@example.com',
      travel_office: 'travel@example.com',
      security: 'security@example.com',
      finance: 'finance@example.com',
    };
    return emails[role];
  }

  /**
   * Get mock approver name based on role
   */
  private getMockApproverName(role: ApprovalStepName): string {
    const names: Record<ApprovalStepName, string> = {
      manager: 'Direct Manager',
      travel_office: 'Travel Office',
      security: 'Security Team',
      finance: 'Finance Department',
    };
    return names[role];
  }

  /**
   * Check if service is in mock mode
   */
  isMockMode(): boolean {
    return this.useMockMode;
  }

  /**
   * Get all pending approvals (for admin/testing)
   */
  async getPendingApprovals(): Promise<ApprovalRequest[]> {
    if (this.useMockMode) {
      return Array.from(this.store.requests.values())
        .filter(r => !isApprovalComplete(r.status) && !isApprovalRejected(r.status));
    }

    // Budibase API query for pending approvals
    const response = await fetch(`${this.config.apiUrl}/tables/ApprovalRequests/rows/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-budibase-api-key': this.config.apiKey,
        'x-budibase-app-id': this.config.appId,
      },
      body: JSON.stringify({
        query: {
          notEqual: {
            status: ['rejected', 'security_approved', 'finance_approved', 'booked', 'reimbursed'],
          },
        },
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch pending approvals');
    }

    const data = await response.json() as BudibaseSearchResponse;
    return data.data || [];
  }
}

// Export singleton instance
export const approvalService = new ApprovalService();
export default approvalService;
