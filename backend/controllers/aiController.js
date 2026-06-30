import { GoogleGenerativeAI } from "@google/generative-ai";
import pool from "../config/db.js";
import dotenv from 'dotenv';

dotenv.config();

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export const generateTaskBreakdown = async (req, res) => {
    try {
        const { taskId } = req.params;
        const { userId } = req.body;

        // Verify task exists and belongs to the user
        const [tasks] = await pool.query("SELECT * FROM tasks WHERE id = ? AND user_id = ?", [taskId, userId]);
        if (tasks.length === 0) {
            return res.status(404).json({ success: false, message: "Task not found or unauthorized" });
        }

        const task = tasks[0];

        // Format system instructions prompt
        const prompt = `
            As an expert academic AI study assistant, help a student break down their task into highly structured sub-tasks.
            Task Title: ${task.task_title}
            Task Description: ${task.description || "No description provided"}
            Category/Course: ${task.category || "General"}

            Please break down this task into exactly 4 to 6 actionable academic sub-tasks.
            For each sub-task, provide:
            1. An actionable step title (be specific and detailed).
            2. An estimated time commitment in MINUTES (e.g., 30, 45, 60, 90, 120).

            Also provide:
            - A brief, tailored "success strategy" tip for this task.
            - Total estimated effort level ("low", "medium", "high").

            Format the response strictly as a single JSON object. DO NOT wrap it in markdown block quotes or HTML. The JSON must match this structure exactly:
            {
                "subtasks": [
                    { "title": "Sub-task 1 Title", "estimated_time": 45 },
                    { "title": "Sub-task 2 Title", "estimated_time": 60 }
                ],
                "tips": "Tailored success strategy...",
                "estimatedTime": "medium"
            }
        `;

        let parsedData = null;

        if (process.env.GEMINI_API_KEY) {
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text().trim();
            
            try {
                // Extract JSON block in case markdown blocks are present
                const jsonMatch = text.match(/\{[\s\S]*\}/);
                parsedData = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(text);
            } catch (err) {
                console.error("Failed to parse Gemini JSON output:", text);
            }
        }

        // Fallback or Mock data in case API key is missing or parsing failed
        if (!parsedData) {
            parsedData = {
                subtasks: [
                    { title: "Perform initial planning & background literature review", estimated_time: 45 },
                    { title: "Draft structural outline & select key reference materials", estimated_time: 30 },
                    { title: "Write primary draft & expand core content sections", estimated_time: 120 },
                    { title: "Proofread structural arguments & refine formatting", estimated_time: 45 }
                ],
                tips: "Break this task into dedicated 25-minute Pomodoro study sessions. Take short breaks to maintain peak analytical cognitive performance.",
                estimatedTime: "medium"
            };
        }

        // --- EISENHOWER + DAILY-CAP SCHEDULING ALGORITHM ---
        // Priority order: Urgent+Important (Q1) → Important only (Q2) → Urgent only (Q3) → Neither (Q4)
        // Hard limit: no more than 20 sub-tasks scheduled per calendar day across ALL tasks for this user.
        const DAILY_CAP = 20;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Determine Eisenhower quadrant for this task
        const isUrgent    = !!task.is_urgent;
        const isImportant = !!task.is_important;
        // Q1 tasks start from today; Q2 from mid-window; Q3/Q4 pushed toward due date
        let quadrantOffset = 0; // days to shift the entire block forward from today
        if (isUrgent && isImportant)  quadrantOffset = 0;   // Q1 – do first
        else if (!isUrgent && isImportant) quadrantOffset = 0; // Q2 – schedule soon but can spread
        else if (isUrgent && !isImportant) quadrantOffset = 1; // Q3 – delegate/shift slightly
        else quadrantOffset = 2;                                 // Q4 – lowest priority, push further

        // Fetch existing per-day subtask counts for this user (so we can respect the cap)
        const [existingRows] = await pool.query(
            `SELECT schedule_date, COUNT(*) as cnt
             FROM sub_tasks s
             JOIN tasks t ON s.task_id = t.id
             WHERE t.user_id = ?
               AND s.schedule_date >= CURDATE()
             GROUP BY schedule_date`,
            [userId]
        );
        // Build a map: dateStr -> count
        const dayCounts = {};
        for (const row of existingRows) {
            const key = new Date(row.schedule_date).toISOString().split('T')[0];
            dayCounts[key] = row.cnt;
        }

        // Helper: next available day >= startDate with room under the cap
        const nextAvailableDay = (startDate) => {
            const d = new Date(startDate);
            while (true) {
                const key = d.toISOString().split('T')[0];
                if ((dayCounts[key] || 0) < DAILY_CAP) return d;
                d.setDate(d.getDate() + 1);
            }
        };

        // Reserve a slot on a given date in our local map
        const reserveSlot = (date) => {
            const key = date.toISOString().split('T')[0];
            dayCounts[key] = (dayCounts[key] || 0) + 1;
        };

        let datesArray = [];
        const numSubtasks = parsedData.subtasks.length;

        // Eisenhower-aware start date: shift window by quadrantOffset days
        const windowStart = new Date(today);
        windowStart.setDate(today.getDate() + quadrantOffset);

        if (task.due_date) {
            const dueDate = new Date(task.due_date);
            dueDate.setHours(0, 0, 0, 0);

            const diffTime = dueDate.getTime() - windowStart.getTime();
            const diffDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

            if (diffDays === 0) {
                // Due today (or overdue after offset) — pack into first available day
                for (let i = 0; i < numSubtasks; i++) {
                    const slot = nextAvailableDay(windowStart);
                    datesArray.push(new Date(slot));
                    reserveSlot(slot);
                }
            } else {
                // Spread subtasks evenly across the window, but honour the daily cap
                for (let i = 0; i < numSubtasks; i++) {
                    // Ideal target day within the window
                    const fraction = i / (numSubtasks - 1 || 1);
                    const idealOffset = Math.round(fraction * diffDays);
                    const idealDate = new Date(windowStart);
                    idealDate.setDate(windowStart.getDate() + idealOffset);

                    // Find nearest available day from the ideal date
                    const slot = nextAvailableDay(idealDate);
                    datesArray.push(new Date(slot));
                    reserveSlot(slot);
                }
            }
        } else {
            // No due date — place each subtask on the next available day from windowStart
            let cursor = new Date(windowStart);
            for (let i = 0; i < numSubtasks; i++) {
                const slot = nextAvailableDay(cursor);
                datesArray.push(new Date(slot));
                reserveSlot(slot);
                // Move cursor forward to allow natural spread (don't always pile on same day)
                cursor = new Date(slot);
                cursor.setDate(slot.getDate() + 1);
            }
        }

        // Delete existing subtasks for this task if regenerating
        await pool.query("DELETE FROM sub_tasks WHERE task_id = ?", [taskId]);

        // Insert new sub-tasks into database
        const insertedSubtasks = [];
        for (let i = 0; i < numSubtasks; i++) {
            const subtask = parsedData.subtasks[i];
            const scheduleDateStr = datesArray[i].toISOString().split('T')[0];

            const [result] = await pool.query(
                "INSERT INTO sub_tasks (task_id, title, estimated_time, actual_time, is_completed, schedule_date) VALUES (?, ?, ?, 0, 0, ?)",
                [taskId, subtask.title, subtask.estimated_time, scheduleDateStr]
            );

            insertedSubtasks.push({
                id: result.insertId,
                task_id: parseInt(taskId),
                title: subtask.title,
                estimated_time: subtask.estimated_time,
                actual_time: 0,
                is_completed: 0,
                schedule_date: scheduleDateStr
            });
        }

        res.status(200).json({
            success: true,
            message: "Subtasks generated and scheduled successfully!",
            subtasks: insertedSubtasks,
            tips: parsedData.tips,
            estimatedTime: parsedData.estimatedTime
        });

    } catch (error) {
        console.error("AI Generation Error:", error);
        res.status(500).json({ success: false, message: "AI breakdown scheduler is currently unavailable." });
    }
};

export const assistTask = async (req, res) => {
    try {
        const { title, description, category } = req.body;

        if (!title) {
            return res.status(400).json({ success: false, message: "Task title is required for AI assistance" });
        }

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `
            As an expert academic AI assistant, help a student with the following task:
            Title: ${title}
            Description: ${description || "No description provided"}
            Category: ${category || "General"}

            Provide:
            1. A breakdown of 5 actionable sub-tasks.
            2. A brief 'Success Strategy' tip for this specific type of task.
            3. Estimated time commitment (low, medium, high).

            Format the response as JSON with the following structure:
            {
                "breakdown": ["subtask 1", "subtask 2", ...],
                "tips": "strategy tip here",
                "estimatedTime": "low/medium/high"
            }
        `;

        if (!process.env.GEMINI_API_KEY) {
            return res.status(200).json({
                success: true,
                suggestions: {
                    breakdown: [
                        "Initial research and data collection",
                        "Outline the key arguments or components",
                        "Draft the first version",
                        "Review and refine against requirements",
                        "Final submission check"
                    ],
                    tips: "Break this task into 25-minute Pomodoro sessions to maintain focus. Ensure you have all necessary materials ready before starting.",
                    strategy: "Since this is a " + (category || "general") + " task, prioritize clarity and accuracy. Good luck!"
                }
            });
        }

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        const jsonData = jsonMatch ? JSON.parse(jsonMatch[0]) : { breakdown: [], tips: text };

        res.status(200).json({
            success: true,
            suggestions: jsonData
        });

    } catch (error) {
        console.error("AI Assist Error:", error);
        res.status(500).json({ success: false, message: "AI Assistant is currently unavailable" });
    }
};
