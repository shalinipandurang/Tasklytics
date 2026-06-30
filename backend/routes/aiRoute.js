import express from "express";
import { assistTask, generateTaskBreakdown } from "../controllers/aiController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const aiRouter = express.Router();

aiRouter.post("/assist", assistTask);
aiRouter.post("/generate/:taskId", authMiddleware, generateTaskBreakdown);

export default aiRouter;
