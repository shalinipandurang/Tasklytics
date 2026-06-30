import { analyticsModel } from '../models/analyticsModel.js';

export const analyticsService = {
    getDashboardData: async (userId) => {
        const summary = await analyticsModel.getSummary(userId);
        const categories = await analyticsModel.getCategoryAnalytics(userId);
        const weekly = await analyticsModel.getWeeklyAnalytics(userId);
        const weeklyTime = await analyticsModel.getWeeklyTimeAnalytics(userId);

        // Calculate productivity percentage
        const total = summary.totalTasks || 0;
        const completed = summary.completedTasks || 0;
        const productivityPercentage = total > 0 ? Math.round((completed / total) * 100) : 0;

        // Calculate total focus times
        const totalEstimatedTime = parseFloat(summary.totalEstimatedTime) || 0;
        const totalActualTime = parseFloat(summary.totalActualTime) || 0;
        const timeEfficiency = totalEstimatedTime > 0 ? Math.round((totalActualTime / totalEstimatedTime) * 100) : 0;

        return {
            summary: {
                totalTasks: total,
                completedTasks: completed,
                pendingTasks: summary.pendingTasks || 0,
                overdueTasks: summary.overdueTasks || 0,
                productivityPercentage,
                totalEstimatedTime,
                totalActualTime,
                timeEfficiency
            },
            categories,
            weekly,
            weeklyTime
        };
    }
};
