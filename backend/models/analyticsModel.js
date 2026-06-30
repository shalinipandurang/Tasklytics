import pool from '../config/db.js';

export const analyticsModel = {
    getSummary: async (userId) => {
        const query = `
            SELECT 
                COUNT(*) as totalTasks,
                SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completedTasks,
                SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pendingTasks,
                SUM(CASE WHEN due_date < CURDATE() AND status != 'Completed' THEN 1 ELSE 0 END) as overdueTasks,
                (SELECT COALESCE(SUM(s.estimated_time), 0) FROM sub_tasks s JOIN tasks t ON s.task_id = t.id WHERE t.user_id = ?) as totalEstimatedTime,
                (SELECT COALESCE(SUM(s.actual_time), 0) FROM sub_tasks s JOIN tasks t ON s.task_id = t.id WHERE t.user_id = ?) as totalActualTime
            FROM tasks
            WHERE user_id = ?
        `;
        const [rows] = await pool.query(query, [userId, userId, userId]);
        return rows[0];
    },

    getCategoryAnalytics: async (userId) => {
        const query = `
            SELECT 
                t.category as name,
                COUNT(t.id) as value,
                SUM(CASE WHEN t.status = 'Completed' THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN t.status = 'Pending' THEN 1 ELSE 0 END) as pending,
                COALESCE(SUM(s.est_time), 0) as total_estimated_time,
                COALESCE(SUM(s.act_time), 0) as total_actual_time
            FROM tasks t
            LEFT JOIN (
                SELECT task_id, SUM(estimated_time) as est_time, SUM(actual_time) as act_time
                FROM sub_tasks
                GROUP BY task_id
            ) s ON t.id = s.task_id
            WHERE t.user_id = ?
            GROUP BY t.category
        `;
        const [rows] = await pool.query(query, [userId]);
        return rows;
    },

    getWeeklyAnalytics: async (userId) => {
        // Fetch tasks that were due in the last 7 days or upcoming in the next 7 days, 
        // to show a trend. But the requirement says "last 7 days".
        const query = `
            SELECT 
                DATE_FORMAT(due_date, '%b %d') as date,
                SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending
            FROM tasks
            WHERE user_id = ? 
              AND due_date IS NOT NULL
              AND due_date >= CURDATE() - INTERVAL 7 DAY
              AND due_date <= CURDATE()
            GROUP BY due_date
            ORDER BY due_date ASC
        `;
        const [rows] = await pool.query(query, [userId]);
        return rows;
    },

    getWeeklyTimeAnalytics: async (userId) => {
        const query = `
            SELECT 
                DATE_FORMAT(s.schedule_date, '%b %d') as date,
                COALESCE(SUM(s.estimated_time), 0) as estimated,
                COALESCE(SUM(s.actual_time), 0) as actual
            FROM sub_tasks s
            JOIN tasks t ON s.task_id = t.id
            WHERE t.user_id = ? 
              AND s.schedule_date IS NOT NULL
              AND s.schedule_date >= CURDATE() - INTERVAL 7 DAY
              AND s.schedule_date <= CURDATE()
            GROUP BY s.schedule_date
            ORDER BY s.schedule_date ASC
        `;
        const [rows] = await pool.query(query, [userId]);
        return rows;
    }
};
