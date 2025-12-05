import { Router } from 'express';
import { componentController } from '../controllers/component.controller';

const router = Router();

router.get('/components/:hash.js', componentController.getComponent.bind(componentController));

export default router;
