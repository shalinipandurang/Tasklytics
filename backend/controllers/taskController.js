import pool from "../config/db.js";

// @desc    Add a new task
// @route   POST /api/task/add
export const addTask = async (req, res) => {
    try {
        const { userId, title, description, status, due_date, due_time, category, is_urgent, is_important } = req.body;

        if (!title) {
            return res.status(400).json({ success: false, message: "Task title is required" });
        }

        const formattedDueDate = due_date ? String(due_date).split('T')[0] : null;

        const [result] = await pool.query(
            "INSERT INTO tasks (user_id, task_title, description, status, due_date, due_time, category, is_urgent, is_important) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [
                userId, 
                title, 
                description || null, 
                status || 'Open', 
                formattedDueDate, 
                due_time || '23:59:59',
                category || 'Other',
                is_urgent ? 1 : 0,
                is_important ? 1 : 0
            ]
        );

        res.status(201).json({
            success: true,
            message: "Task added successfully",
            taskId: result.insertId
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error while adding the task" });
    }
};

// @desc    Get all tasks for the logged-in user
// @route   GET /api/task/get
export const getTasks = async (req, res) => {
    try {
        const { userId } = req.body;

        const [tasks] = await pool.query(`
            SELECT t.*, 
              (SELECT COUNT(*) FROM sub_tasks s WHERE s.task_id = t.id) as total_subtasks,
              (SELECT COUNT(*) FROM sub_tasks s WHERE s.task_id = t.id AND s.is_completed = 1) as completed_subtasks
            FROM tasks t 
            WHERE t.user_id = ? 
            ORDER BY t.due_date ASC
        `, [userId]);

        res.status(200).json({
            success: true,
            tasks
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error while fetching tasks" });
    }
};

// @desc    Update an existing task
// @route   PUT /api/task/update/:id
export const updateTask = async (req, res) => {
    try {
        const { id } = req.params;
        const { userId, title, description, status, due_date, due_time, category, is_urgent, is_important } = req.body;

        if (!title) {
            return res.status(400).json({ success: false, message: "Task title is required" });
        }

        const formattedDueDate = due_date ? String(due_date).split('T')[0] : null;

        const [result] = await pool.query(
            "UPDATE tasks SET task_title = ?, description = ?, status = ?, due_date = ?, due_time = ?, category = ?, is_urgent = ?, is_important = ?, due_reminder_sent = 0 WHERE id = ? AND user_id = ?",
            [
                title, 
                description || null, 
                status || 'Open', 
                formattedDueDate, 
                due_time || '23:59:59',
                category || 'Other', 
                is_urgent ? 1 : 0,
                is_important ? 1 : 0,
                id, 
                userId
            ]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Task not found or unauthorized to update" });
        }

        res.status(200).json({ success: true, message: "Task updated successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error while updating the task" });
    }
};

// @desc    Delete a task
// @route   DELETE /api/task/delete/:id
export const deleteTask = async (req, res) => {
    try {
        const { id } = req.params;
        const { userId } = req.body;

        const [result] = await pool.query(
            "DELETE FROM tasks WHERE id = ? AND user_id = ?",
            [id, userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Task not found or unauthorized to delete" });
        }

        res.status(200).json({ success: true, message: "Task deleted successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error while deleting the task" });
    }
};

// ==========================================
// SUB-TASK CRUD CONTROLLERS
// ==========================================

// @desc    Get sub-tasks for a task
// @route   GET /api/task/:id/subtasks
export const getSubtasks = async (req, res) => {
    try {
        const { id } = req.params;
        const { userId } = req.body;

        // Verify task ownership
        const [tasks] = await pool.query("SELECT * FROM tasks WHERE id = ? AND user_id = ?", [id, userId]);
        if (tasks.length === 0) {
            return res.status(404).json({ success: false, message: "Task not found or unauthorized" });
        }

        const [subtasks] = await pool.query("SELECT * FROM sub_tasks WHERE task_id = ? ORDER BY id ASC", [id]);

        res.status(200).json({
            success: true,
            subtasks
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error while fetching sub-tasks" });
    }
};

// @desc    Add a manual sub-task
// @route   POST /api/task/:id/subtasks/add
export const addSubtask = async (req, res) => {
    try {
        const { id } = req.params;
        const { userId, title, estimated_time, schedule_date } = req.body;

        if (!title) {
            return res.status(400).json({ success: false, message: "Subtask title is required" });
        }

        // Verify task ownership
        const [tasks] = await pool.query("SELECT * FROM tasks WHERE id = ? AND user_id = ?", [id, userId]);
        if (tasks.length === 0) {
            return res.status(404).json({ success: false, message: "Task not found or unauthorized" });
        }

        // Enforce max 20 subtasks per task
        const [[{ subtaskCount }]] = await pool.query(
            "SELECT COUNT(*) as subtaskCount FROM sub_tasks WHERE task_id = ?",
            [id]
        );
        if (subtaskCount >= 20) {
            return res.status(400).json({ success: false, message: "Maximum limit of 20 sub-tasks per task reached." });
        }

        const [result] = await pool.query(
            "INSERT INTO sub_tasks (task_id, title, estimated_time, actual_time, is_completed, schedule_date) VALUES (?, ?, ?, 0, 0, ?)",
            [id, title, estimated_time || 0, schedule_date || null]
        );

        res.status(201).json({
            success: true,
            message: "Subtask added successfully",
            subtaskId: result.insertId
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error while adding subtask" });
    }
};

// @desc    Update a sub-task
// @route   PUT /api/task/subtasks/:subtaskId
export const updateSubtask = async (req, res) => {
    try {
        const { subtaskId } = req.params;
        const { userId, title, estimated_time, actual_time, is_completed, schedule_date } = req.body;

        // Verify task ownership through a join
        const [subtasks] = await pool.query(
            "SELECT s.* FROM sub_tasks s JOIN tasks t ON s.task_id = t.id WHERE s.id = ? AND t.user_id = ?",
            [subtaskId, userId]
        );

        if (subtasks.length === 0) {
            return res.status(404).json({ success: false, message: "Subtask not found or unauthorized" });
        }

        const currentSubtask = subtasks[0];

        await pool.query(
            "UPDATE sub_tasks SET title = ?, estimated_time = ?, actual_time = ?, is_completed = ?, schedule_date = ? WHERE id = ?",
            [
                title !== undefined ? title : currentSubtask.title,
                estimated_time !== undefined ? estimated_time : currentSubtask.estimated_time,
                actual_time !== undefined ? actual_time : currentSubtask.actual_time,
                is_completed !== undefined ? (is_completed ? 1 : 0) : currentSubtask.is_completed,
                schedule_date !== undefined ? schedule_date : currentSubtask.schedule_date,
                subtaskId
            ]
        );

        res.status(200).json({ success: true, message: "Subtask updated successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error while updating subtask" });
    }
};

// @desc    Complete a sub-task with actual time taken
// @route   PATCH /api/task/subtasks/:subtaskId/complete
export const completeSubtask = async (req, res) => {
    try {
        const { subtaskId } = req.params;
        const { userId, actual_time_minutes } = req.body;

        const minutes = Number(actual_time_minutes);
        if (!Number.isFinite(minutes) || minutes <= 0) {
            return res.status(400).json({ success: false, message: "Actual time must be a positive number" });
        }

        const [subtasks] = await pool.query(
            "SELECT s.* FROM sub_tasks s JOIN tasks t ON s.task_id = t.id WHERE s.id = ? AND t.user_id = ?",
            [subtaskId, userId]
        );

        if (subtasks.length === 0) {
            return res.status(404).json({ success: false, message: "Subtask not found or unauthorized" });
        }

        await pool.query(
            "UPDATE sub_tasks SET is_completed = 1, actual_time = ?, completed_at = NOW() WHERE id = ?",
            [Math.round(minutes), subtaskId]
        );

        res.status(200).json({
            success: true,
            message: "Subtask completed successfully",
            subtask: {
                id: Number(subtaskId),
                actual_time: Math.round(minutes),
                is_completed: 1
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error while completing subtask" });
    }
};

// @desc    Delete a sub-task
// @route   DELETE /api/task/subtasks/:subtaskId
export const deleteSubtask = async (req, res) => {
    try {
        const { subtaskId } = req.params;
        const { userId } = req.body;

        // Verify task ownership
        const [subtasks] = await pool.query(
            "SELECT s.* FROM sub_tasks s JOIN tasks t ON s.task_id = t.id WHERE s.id = ? AND t.user_id = ?",
            [subtaskId, userId]
        );

        if (subtasks.length === 0) {
            return res.status(404).json({ success: false, message: "Subtask not found or unauthorized" });
        }

        await pool.query("DELETE FROM sub_tasks WHERE id = ?", [subtaskId]);

        res.status(200).json({ success: true, message: "Subtask deleted successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error while deleting subtask" });
    }
};

// @desc    Get daily sub-tasks across all active tasks for a user
// @route   GET /api/task/daily-subtasks
export const getDailySubtasks = async (req, res) => {
    try {
        const { userId } = req.body;

        // Fetch incomplete sub-tasks scheduled for today or the next 7 days
        const [subtasks] = await pool.query(
            `SELECT s.*, t.task_title, t.category, t.due_date as task_due_date 
             FROM sub_tasks s 
             JOIN tasks t ON s.task_id = t.id 
             WHERE t.user_id = ? 
             AND (s.is_completed = 0 OR s.is_completed IS NULL)
             AND (s.schedule_date IS NULL OR s.schedule_date <= DATE_ADD(CURDATE(), INTERVAL 7 DAY))
             ORDER BY s.schedule_date ASC`,
            [userId]
        );

        res.status(200).json({
            success: true,
            subtasks
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error while fetching daily sub-tasks" });
    }
};

// @desc    Get heatmap contributions (completed tasks count per date)
// @route   GET /api/task/heatmap
export const getHeatmapData = async (req, res) => {
    try {
        const { userId } = req.body;

        // Fetch all dates and count of tasks completed on each date for the past year
        const [heatmap] = await pool.query(
            `SELECT DATE_FORMAT(updated_at, '%Y-%m-%d') as date, COUNT(*) as count 
             FROM tasks 
             WHERE user_id = ? AND status = 'Completed' 
             AND updated_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR)
             GROUP BY date
             ORDER BY date ASC`,
            [userId]
        );

        res.status(200).json({
            success: true,
            heatmap
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error while fetching productivity heatmap logs" });
    }
};
