import { Router } from 'express';
import { SSEController } from '../controllers/sse.controller';

const router = Router();
const sseController = new SSEController();

router.post('/agent/stream', (req, res) => {
  sseController.streamAgentResponse(req, res);
});

export default router;
