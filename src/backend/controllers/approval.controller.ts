/**
 * Approval Controller
 * 
 * Handles HTTP endpoints for approval workflow operations.
 */

import { Request, Response } from 'express';
import { approvalService } from '../services/approval.service';
import { 
  CreateApprovalRequest, 
  BudibaseWebhookPayload,
  ApprovalType 
} from '../models/approval.model';

/**
 * Create a new approval request
 * POST /api/v1/approvals
 */
export async function createApproval(req: Request, res: Response): Promise<void> {
  try {
    const {
      type,
      submittedBy,
      submittedByEmail,
      sessionId,
      formData,
      attachments,
    } = req.body as CreateApprovalRequest;

    // Validate required fields
    if (!type || !['travel', 'invoice'].includes(type)) {
      res.status(400).json({
        success: false,
        error: 'Invalid or missing approval type. Must be "travel" or "invoice".',
      });
      return;
    }

    if (!submittedBy) {
      res.status(400).json({
        success: false,
        error: 'Missing submittedBy field.',
      });
      return;
    }

    if (!sessionId) {
      res.status(400).json({
        success: false,
        error: 'Missing sessionId field.',
    if (!submittedBy || !submittedByEmail) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: submittedBy and submittedByEmail',
      });
      return;
    }

    if (!formData || typeof formData !== 'object') {
      res.status(400).json({
        success: false,
        error: 'Missing or invalid formData',
      });
      return;
    }

    const request: CreateApprovalRequest = {
      type: type as ApprovalType,
      submittedBy,
      submittedByEmail,
      sessionId,
      formData,
      attachments,
    };

    const result = await approvalService.createApproval(request);

    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('[ApprovalController] Error creating approval:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}

/**
 * Get approval status by ID
 * GET /api/v1/approvals/:id
 */
export async function getApprovalStatus(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        success: false,
        error: 'Missing approval ID',
      });
      return;
    }

    const result = await approvalService.getApprovalStatus(id);

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    console.error('[ApprovalController] Error getting approval status:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}

/**
 * Get approval history for a session
 * GET /api/v1/approvals/session/:sessionId/history
 */
export async function getApprovalHistory(req: Request, res: Response): Promise<void> {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      res.status(400).json({
        success: false,
        error: 'Missing session ID',
      });
      return;
    }

    const approvals = await approvalService.getApprovalHistory(sessionId);

    res.status(200).json({
      success: true,
      approvals,
    });
  } catch (error) {
    console.error('[ApprovalController] Error getting approval history:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}

/**
 * Get all pending approvals (admin endpoint)
 * GET /api/v1/approvals/pending
 */
export async function getPendingApprovals(_req: Request, res: Response): Promise<void> {
  try {
    const approvals = await approvalService.getPendingApprovals();

    res.status(200).json({
      success: true,
      approvals,
    });
  } catch (error) {
    console.error('[ApprovalController] Error getting pending approvals:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}

/**
 * Simulate approval action (for testing/demo)
 * POST /api/v1/approvals/:id/simulate
 */
export async function simulateApprovalAction(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { action, comment } = req.body;

    if (!id) {
      res.status(400).json({
        success: false,
        error: 'Missing approval ID',
      });
      return;
    }

    if (!action || !['approve', 'reject'].includes(action)) {
      res.status(400).json({
        success: false,
        error: 'Invalid action. Must be "approve" or "reject".',
      });
      return;
    }

    // Check if service is in mock mode
    if (!approvalService.isMockMode()) {
      res.status(403).json({
        success: false,
        error: 'Simulation only available in mock mode.',
      });
      return;
    }

    const result = await approvalService.simulateApprovalAction(id, action, comment);

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('[ApprovalController] Error simulating approval action:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}

/**
 * Handle Budibase webhook callback
 * POST /api/webhooks/budibase/approval
 */
export async function handleBudibaseWebhook(req: Request, res: Response): Promise<void> {
  try {
    const payload = req.body as BudibaseWebhookPayload;
    const signature = req.headers['x-budibase-signature'] as string | undefined;

    // Validate payload
    if (!payload.event || !payload.approvalId || !payload.status) {
      res.status(400).json({
        success: false,
        error: 'Invalid webhook payload',
      });
      return;
    }

    const success = await approvalService.processWebhook(payload, signature);

    if (success) {
      res.status(200).json({ success: true });
    } else {
      res.status(401).json({
        success: false,
        error: 'Webhook processing failed',
      });
    }
  } catch (error) {
    console.error('[ApprovalController] Error handling webhook:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}

/**
 * Health check for approval service
 * GET /api/v1/approvals/health
 */
export async function healthCheck(_req: Request, res: Response): Promise<void> {
  res.status(200).json({
    success: true,
    service: 'approval',
    mode: approvalService.isMockMode() ? 'mock' : 'live',
    timestamp: new Date().toISOString(),
  });
}
