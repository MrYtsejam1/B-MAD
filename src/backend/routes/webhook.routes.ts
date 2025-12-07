/**
 * Webhook Routes
 * 
 * API routes for external webhook callbacks.
 */

import { Router } from 'express';
import { handleBudibaseWebhook } from '../controllers/approval.controller';

const router = Router();

// Budibase approval webhook
router.post('/budibase/approval', handleBudibaseWebhook);

export default router;
