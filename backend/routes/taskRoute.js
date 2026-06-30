import express from "express";
import { 
    addTask, 
    getTasks, 
    updateTask, 
    deleteTask,
    getSubtasks,
    addSubtask,
    updateSubtask,
    deleteSubtask,
    completeSubtask,
    getDailySubtasks,
    getHeatmapData
} from "../controllers/taskController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const taskRouter = express.Router();

// Task Routes
taskRouter.post("/add", authMiddleware, addTask);
taskRouter.get("/get", authMiddleware, getTasks);
taskRouter.put("/update/:id", authMiddleware, updateTask);
taskRouter.delete("/delete/:id", authMiddleware, deleteTask);

// Subtask Routes
taskRouter.get("/:id/subtasks", authMiddleware, getSubtasks);
taskRouter.post("/:id/subtasks/add", authMiddleware, addSubtask);
taskRouter.put("/subtasks/:subtaskId", authMiddleware, updateSubtask);
taskRouter.patch("/subtasks/:subtaskId/complete", authMiddleware, completeSubtask);
taskRouter.delete("/subtasks/:subtaskId", authMiddleware, deleteSubtask);

// Daily Planner & Heatmap Productivity Grid
taskRouter.get("/daily-subtasks", authMiddleware, getDailySubtasks);
taskRouter.get("/heatmap", authMiddleware, getHeatmapData);

export default taskRouter;
