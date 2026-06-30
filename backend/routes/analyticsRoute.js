import express from "express";
import { getAnalyticsDashboard } from "../controllers/analyticsController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const analyticsRouter = express.Router();

analyticsRouter.get("/dashboard", authMiddleware, getAnalyticsDashboard);

export default analyticsRouter;
