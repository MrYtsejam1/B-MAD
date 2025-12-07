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
} from '../models/approval.model';

/**
 * Create a new approval request
 * POST /api/approvals
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
      });
      return;
    }

    if (!formData || typeof formData !== 'object') {
      res.status(400).json({
        success: false,
        error: 'Missing or invalid formData field.',
      });
      return;
    }

    const result = await approvalService.createApproval({
      type,
      submittedBy,
      submittedByEmail: submittedByEmail || '',
      sessionId,
      formData,
      attachments,
    });

    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error: any) {
    console.error('[ApprovalController] Error creating approval:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
}

/**
 * Get approval status by ID
 * GET /api/approvals/:id
 */
export async function getApprovalStatus(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        success: false,
        error: 'Missing approval ID.',
      });
      return;
    }

    const result = await approvalService.getApprovalStatus(id);

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error: any) {
    console.error('[ApprovalController] Error getting approval status:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
}

/**
 * Get approval history for a session
 * GET /api/approvals/session/:sessionId/history
 */
export async function getApprovalHistory(req: Request, res: Response): Promise<void> {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      res.status(400).json({
        success: false,
        error: 'Missing session ID.',
      });
      return;
    }

    const history = await approvalService.getApprovalHistory(sessionId);

    res.status(200).json({
      success: true,
      history,
    });
  } catch (error: any) {
    console.error('[ApprovalController] Error getting approval history:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
}

/**
 * Get all pending approvals (admin endpoint)
 * GET /api/approvals/pending
 */
export async function getPendingApprovals(_req: Request, res: Response): Promise<void> {
  try {
    const approvals = await approvalService.getPendingApprovals();

    res.status(200).json({
      success: true,
      count: approvals.length,
      approvals,
    });
  } catch (error: any) {
    console.error('[ApprovalController] Error getting pending approvals:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
}

/**
 * Simulate approval action (for testing/demo)
 * POST /api/approvals/:id/simulate
 */
export async function simulateApprovalAction(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { action, comment } = req.body;

    if (!id) {
      res.status(400).json({
        success: false,
        error: 'Missing approval ID.',
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
  } catch (error: any) {
    console.error('[ApprovalController] Error simulating approval action:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
}

/**
 * Webhook endpoint for Budibase callbacks
 * POST /api/webhooks/budibase/approval
 */
export async function handleBudibaseWebhook(req: Request, res: Response): Promise<void> {
  try {
    const payload = req.body as BudibaseWebhookPayload;
    const signature = req.headers['x-webhook-signature'] as string | undefined;

    // Validate required fields
    if (!payload.approvalId) {
      res.status(400).json({
        success: false,
        error: 'Missing approvalId in webhook payload.',
      });
      return;
    }

    if (!payload.eventType) {
      res.status(400).json({
        success: false,
        error: 'Missing eventType in webhook payload.',
      });
      return;
    }

    const success = await approvalService.processWebhook(payload, signature);

    if (success) {
      res.status(200).json({
        success: true,
        message: 'Webhook processed successfully.',
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Failed to process webhook.',
      });
    }
  } catch (error: any) {
    console.error('[ApprovalController] Error handling webhook:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
}

/**
 * Health check for approval service
 * GET /api/approvals/health
 */
export async function healthCheck(_req: Request, res: Response): Promise<void> {
  res.status(200).json({
    success: true,
    service: 'approval',
    mode: approvalService.isMockMode() ? 'mock' : 'live',
    timestamp: new Date().toISOString(),
  });
}
