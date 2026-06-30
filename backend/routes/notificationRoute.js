import express from 'express';
import { subscribe, send, getVapidPublicKey } from '../controllers/notificationController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const notificationRouter = express.Router();

notificationRouter.post('/subscribe', authMiddleware, subscribe);
notificationRouter.post('/send', authMiddleware, send);
notificationRouter.get('/vapid-public-key', getVapidPublicKey);

export default notificationRouter;
