import express from "express";
import { 
    registerUser, 
    loginUser, 
    forgotPassword, 
    resetPassword,
    getUserProfile,
    updateUserProfile,
    changePassword,
    getSecurityQuestion,
    changeSecurityQuestion,
    getTimerDuration
} from "../controllers/userController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const userRouter = express.Router();

userRouter.post("/register", registerUser);
userRouter.post("/login", loginUser);
userRouter.post("/forgot-password", forgotPassword);
userRouter.post("/reset-password", resetPassword);
userRouter.get("/security-question", getSecurityQuestion);

// Settings & Profile (Protected)
userRouter.get("/timer-duration", authMiddleware, getTimerDuration);
userRouter.get("/profile", authMiddleware, getUserProfile);
userRouter.put("/profile", authMiddleware, updateUserProfile);
userRouter.put("/change-password", authMiddleware, changePassword);
userRouter.put("/change-security-question", authMiddleware, changeSecurityQuestion);

export default userRouter;
