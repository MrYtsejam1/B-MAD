import { Router } from 'express';
import { ComponentController } from '../controllers/component.controller';

const router = Router();
const controller = new ComponentController();

router.get('/components/:hash.js', controller.getComponent.bind(controller));

export default router;
