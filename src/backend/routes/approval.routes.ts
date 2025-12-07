/**
 * Approval Routes
 * 
 * API routes for approval workflow operations.
 */

import { Router } from 'express';
import {
  createApproval,
  getApprovalStatus,
  getApprovalHistory,
  getPendingApprovals,
  simulateApprovalAction,
  healthCheck,
} from '../controllers/approval.controller';

const router = Router();

// Health check
router.get('/health', healthCheck);

// Create a new approval request
router.post('/', createApproval);

// Get all pending approvals (admin)
router.get('/pending', getPendingApprovals);

// Get approval status by ID
router.get('/:id', getApprovalStatus);

// Get approval history for a session
router.get('/session/:sessionId/history', getApprovalHistory);

// Simulate approval action (for testing/demo)
router.post('/:id/simulate', simulateApprovalAction);

export default router;
