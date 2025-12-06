import { Router } from 'express';
import { SSEController } from '../controllers/sse.controller';

const router = Router();
const sseController = new SSEController();

router.post('/session/start', (req, res) => {
  sseController.startSession(req, res);
});

router.post('/session/message', (req, res) => {
  sseController.continueSession(req, res);
});

router.post('/agent/stream', (req, res) => {
  sseController.streamAgentResponse(req, res);
});

export default router;
