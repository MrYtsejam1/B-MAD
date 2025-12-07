/**
 * Approval Service
 * 
 * Handles approval workflow operations with Budibase integration.
 * Supports mock mode for development when Budibase is not configured.
 */

import {
  ApprovalType,
  ApprovalStatus,
  ApprovalStepName,
  ApprovalRequest,
  ApprovalStep,
  CreateApprovalRequest,
  CreateApprovalResponse,
  ApprovalStatusResponse,
  BudibaseWebhookPayload,
  DEFAULT_WORKFLOW_CONFIG,
  getNextStep,
  getStatusAfterApproval,
  BudibaseRowResponse,
  BudibaseSearchResponse,
} from '../models/approval.model';

interface ApprovalServiceConfig {
  budibaseApiUrl?: string;
  budibaseApiKey?: string;
  budibaseAppId?: string;
  webhookSecret?: string;
}

/**
 * In-memory store for mock mode
 */
interface MockStore {
  approvals: Map<string, ApprovalRequest>;
}

class ApprovalService {
  private config: ApprovalServiceConfig;
  private store: MockStore;

  constructor() {
    this.config = {
      budibaseApiUrl: process.env.BUDIBASE_API_URL,
      budibaseApiKey: process.env.BUDIBASE_API_KEY,
      budibaseAppId: process.env.BUDIBASE_APP_ID,
      webhookSecret: process.env.APPROVAL_WEBHOOK_SECRET,
    };

    // Initialize mock store for development
    this.store = {
      approvals: new Map(),
    };

    if (this.isMockMode()) {
      console.log('[ApprovalService] Running in MOCK mode - Budibase not configured');
    } else {
      console.log('[ApprovalService] Running in LIVE mode with Budibase');
    }
  }

  /**
   * Create a new approval request
   */
  async createApproval(request: CreateApprovalRequest): Promise<CreateApprovalResponse> {
    try {
      if (this.isMockMode()) {
        return this.createMockApproval(request);
      }
      return this.createBudibaseApproval(request);
    } catch (error) {
      console.error('[ApprovalService] Error creating approval:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get approval status by ID
   */
  async getApprovalStatus(approvalId: string): Promise<ApprovalStatusResponse> {
    try {
      if (this.isMockMode()) {
        return this.getMockApprovalStatus(approvalId);
      }
      return this.getBudibaseApprovalStatus(approvalId);
    } catch (error) {
      console.error('[ApprovalService] Error getting approval status:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Process webhook from Budibase
   */
  async processWebhook(payload: BudibaseWebhookPayload, signature?: string): Promise<boolean> {
    try {
      // Verify webhook signature if configured
      if (this.config.webhookSecret && signature) {
        if (!this.verifyWebhookSignature(payload, signature)) {
          console.error('[ApprovalService] Invalid webhook signature');
          return false;
        }
      }

      console.log('[ApprovalService] Processing webhook:', payload);

      if (this.isMockMode()) {
        // Update mock store
        const approval = this.store.approvals.get(payload.approvalId);
        if (approval) {
          approval.status = payload.status;
          approval.updatedAt = payload.timestamp;
          
          if (payload.step) {
            const step = approval.steps.find(s => s.name === payload.step);
            if (step) {
              step.status = payload.event === 'approval_rejected' ? 'rejected' : 'approved';
              step.approverEmail = payload.approverEmail;
              step.approverName = payload.approverName;
              step.comment = payload.comment;
              step.approvedAt = payload.timestamp;
            }
          }
        }
      }

      return true;
    } catch (error) {
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
    if (!this.isMockMode()) {
      return {
        success: false,
        error: 'Simulation only available in mock mode',
      };
    }

    const approval = this.store.approvals.get(approvalId);
    if (!approval) {
      return {
        success: false,
        error: 'Approval not found',
      };
    }

    const currentStep = approval.steps.find(s => s.status === 'pending');
    if (!currentStep) {
      return {
        success: false,
        error: 'No pending steps',
      };
    }

    const now = new Date().toISOString();

    if (action === 'reject') {
      currentStep.status = 'rejected';
      currentStep.rejectedAt = now;
      currentStep.comment = comment;
      approval.status = 'rejected';
      approval.rejectionReason = comment;
      approval.updatedAt = now;
    } else {
      currentStep.status = 'approved';
      currentStep.approvedAt = now;
      currentStep.approverEmail = this.getMockApproverEmail(currentStep.name);
      currentStep.approverName = this.getMockApproverName(currentStep.name);
      currentStep.comment = comment;

      // Update approval status
      approval.status = getStatusAfterApproval(approval.type, currentStep.name);
      approval.updatedAt = now;

      // Set next step as current
      const nextStep = getNextStep(approval.type, currentStep.name);
      approval.currentStep = nextStep;

      // If no next step, mark as complete
      if (!nextStep) {
        approval.completedAt = now;
        if (approval.type === 'travel') {
          approval.status = 'booked';
        } else {
          approval.status = 'reimbursed';
        }
      }
    }

    return {
      success: true,
      approval,
    };
  }

  /**
   * Get approval history for a session
   */
  async getApprovalHistory(sessionId: string): Promise<ApprovalRequest[]> {
    if (this.isMockMode()) {
      return Array.from(this.store.approvals.values())
        .filter(a => a.sessionId === sessionId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    // For Budibase, query by sessionId
    // This would be implemented with Budibase search API
    return [];
  }

  /**
   * Create approval in mock mode
   */
  private createMockApproval(request: CreateApprovalRequest): CreateApprovalResponse {
    const id = `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    const stepNames = DEFAULT_WORKFLOW_CONFIG[request.type].steps;
    
    const approval: ApprovalRequest = {
      id,
      type: request.type,
      status: 'submitted',
      submittedBy: request.submittedBy,
      submittedByEmail: request.submittedByEmail,
      sessionId: request.sessionId,
      formData: request.formData,
      attachments: request.attachments,
      steps: stepNames.map((name, index) => ({
        id: `step-${id}-${index}`,
        name,
        status: index === 0 ? 'pending' : 'pending',
        order: index,
      })),
      currentStep: stepNames[0],
      createdAt: now,
      updatedAt: now,
    };

    this.store.approvals.set(id, approval);

    console.log('[ApprovalService] Created mock approval:', {
      id,
      type: request.type,
      steps: stepNames,
    });

    return {
      success: true,
      approvalId: id,
      status: 'submitted',
      message: `Approval request created (mock mode). Awaiting ${stepNames[0]} approval.`,
    };
  }

  /**
   * Create approval in Budibase
   */
  private async createBudibaseApproval(request: CreateApprovalRequest): Promise<CreateApprovalResponse> {
    const response = await fetch(`${this.config.budibaseApiUrl}/api/public/v1/tables/approvals/rows`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-budibase-api-key': this.config.budibaseApiKey!,
        'x-budibase-app-id': this.config.budibaseAppId!,
      },
      body: JSON.stringify({
        type: request.type,
        status: 'submitted',
        submittedBy: request.submittedBy,
        submittedByEmail: request.submittedByEmail,
        sessionId: request.sessionId,
        formData: JSON.stringify(request.formData),
        attachments: request.attachments ? JSON.stringify(request.attachments) : null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
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
      message: 'Approval request created successfully',
    };
  }

  /**
   * Get approval status from mock store
   */
  private getMockApprovalStatus(approvalId: string): ApprovalStatusResponse {
    const approval = this.store.approvals.get(approvalId);
    
    if (!approval) {
      return {
        success: false,
        error: 'Approval not found',
      };
    }

    return {
      success: true,
      approval,
    };
  }

  /**
   * Get approval status from Budibase
   */
  private async getBudibaseApprovalStatus(approvalId: string): Promise<ApprovalStatusResponse> {
    const response = await fetch(
      `${this.config.budibaseApiUrl}/api/public/v1/tables/approvals/rows/${approvalId}`,
      {
        headers: {
          'x-budibase-api-key': this.config.budibaseApiKey!,
          'x-budibase-app-id': this.config.budibaseAppId!,
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return {
          success: false,
          error: 'Approval not found',
        };
      }
      const error = await response.text();
      throw new Error(`Budibase API error: ${error}`);
    }

    const data = await response.json() as BudibaseRowResponse;

    // Transform Budibase row to ApprovalRequest
    const approval: ApprovalRequest = {
      id: data._id,
      type: data.type as ApprovalType,
      status: data.status as ApprovalStatus,
      submittedBy: data.submittedBy as string,
      submittedByEmail: data.submittedByEmail as string,
      sessionId: data.sessionId as string | undefined,
      formData: typeof data.formData === 'string' ? JSON.parse(data.formData) : data.formData as Record<string, unknown>,
      attachments: data.attachments ? (typeof data.attachments === 'string' ? JSON.parse(data.attachments) : data.attachments as string[]) : undefined,
      steps: data.steps ? (typeof data.steps === 'string' ? JSON.parse(data.steps) : data.steps as ApprovalStep[]) : [],
      currentStep: data.currentStep as ApprovalStepName | null,
      createdAt: data.createdAt as string,
      updatedAt: data.updatedAt as string,
      completedAt: data.completedAt as string | undefined,
      rejectionReason: data.rejectionReason as string | undefined,
    };

    return {
      success: true,
      approval,
    };
  }

  /**
   * Verify webhook signature
   */
  private verifyWebhookSignature(_payload: BudibaseWebhookPayload, _signature: string): boolean {
    // TODO: Implement HMAC signature verification
    // For now, just return true if secret is configured
    return !!this.config.webhookSecret;
  }

  /**
   * Get mock approver email for a step
   */
  private getMockApproverEmail(step: ApprovalStepName): string {
    const emails: Record<ApprovalStepName, string> = {
      manager: 'manager@company.com',
      travel_office: 'travel@company.com',
      security: 'security@company.com',
      finance: 'finance@company.com',
    };
    return emails[step];
  }

  /**
   * Get mock approver name for a step
   */
  private getMockApproverName(step: ApprovalStepName): string {
    const names: Record<ApprovalStepName, string> = {
      manager: 'John Manager',
      travel_office: 'Travel Office',
      security: 'Security Team',
      finance: 'Finance Department',
    };
    return names[step];
  }

  /**
   * Check if running in mock mode
   */
  isMockMode(): boolean {
    return !this.config.budibaseApiUrl || !this.config.budibaseApiKey || !this.config.budibaseAppId;
  }

  /**
   * Get all pending approvals (admin endpoint)
   */
  async getPendingApprovals(): Promise<ApprovalRequest[]> {
    if (this.isMockMode()) {
      return Array.from(this.store.approvals.values())
        .filter(a => !['booked', 'reimbursed', 'rejected'].includes(a.status))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    // For Budibase, query pending approvals
    const response = await fetch(
      `${this.config.budibaseApiUrl}/api/public/v1/tables/approvals/rows/search`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-budibase-api-key': this.config.budibaseApiKey!,
          'x-budibase-app-id': this.config.budibaseAppId!,
        },
        body: JSON.stringify({
          query: {
            notEqual: {
              status: 'booked',
            },
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch pending approvals');
    }

    const data = await response.json() as BudibaseSearchResponse;
    
    // Transform Budibase rows to ApprovalRequest objects
    return (data.data || []).map(row => ({
      id: row._id,
      type: row.type as ApprovalType,
      status: row.status as ApprovalStatus,
      submittedBy: row.submittedBy as string,
      submittedByEmail: row.submittedByEmail as string,
      sessionId: row.sessionId as string | undefined,
      formData: typeof row.formData === 'string' ? JSON.parse(row.formData) : row.formData as Record<string, unknown>,
      attachments: row.attachments ? (typeof row.attachments === 'string' ? JSON.parse(row.attachments) : row.attachments as string[]) : undefined,
      steps: row.steps ? (typeof row.steps === 'string' ? JSON.parse(row.steps) : row.steps as ApprovalStep[]) : [],
      currentStep: row.currentStep as ApprovalStepName | null,
      createdAt: row.createdAt as string,
      updatedAt: row.updatedAt as string,
      completedAt: row.completedAt as string | undefined,
      rejectionReason: row.rejectionReason as string | undefined,
    }));
  }
}

// Export class and singleton instance
export { ApprovalService };
export const approvalService = new ApprovalService();
export default approvalService;
