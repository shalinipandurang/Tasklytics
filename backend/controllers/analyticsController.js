import { analyticsService } from '../services/analyticsService.js';

export const getAnalyticsDashboard = async (req, res) => {
    try {
        const { userId } = req.body; // user_id is injected by authMiddleware in the route

        if (!userId) {
            return res.status(400).json({ success: false, message: "User ID is missing" });
        }

        const data = await analyticsService.getDashboardData(userId);

        res.status(200).json({
            success: true,
            data
        });
    } catch (error) {
        console.error("Analytics Error:", error);
        res.status(500).json({ success: false, message: "Server error while fetching analytics" });
    }
};
