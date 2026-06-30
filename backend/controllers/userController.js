import pool from "../config/db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import validator from "validator";
import { getAdaptiveTimerDuration } from "../utils/timerDuration.js";

// Helper to create token
const createToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: "30d"
    });
};

// @desc    Register a new user
// @route   POST /api/user/register
export const registerUser = async (req, res) => {
    try {
        const { name, email, password, securityQuestion, securityAnswer } = req.body;

        // Validations
        if (!name || !email || !password || !securityQuestion || !securityAnswer) {
            return res.status(400).json({ success: false, message: "Please fill all fields" });
        }
        if (!validator.isEmail(email)) {
            return res.status(400).json({ success: false, message: "Please enter a valid email" });
        }
        if (password.length < 6) {
            return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
        }

        // Check if user exists
        const [existingUsers] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
        if (existingUsers.length > 0) {
            return res.status(400).json({ success: false, message: "User already exists with this email" });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Hash security answer
        const cleanAnswer = securityAnswer.trim().toLowerCase();
        const answerSalt = await bcrypt.genSalt(10);
        const hashedAnswer = await bcrypt.hash(cleanAnswer, answerSalt);

        // Insert new user
        const [result] = await pool.query(
            "INSERT INTO users (name, email, password, security_question, security_answer) VALUES (?, ?, ?, ?, ?)",
            [name, email, hashedPassword, securityQuestion, hashedAnswer]
        );

        const newUserId = result.insertId;
        const token = createToken(newUserId);

        res.status(201).json({
            success: true,
            token,
            user: {
                id: newUserId,
                name,
                email,
                theme: 'light',
                daily_target: 3,
                default_category: 'Other',
                ai_enabled: 1,
                notifications_enabled: 0
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error during registration" });
    }
};

// @desc    Authenticate user
// @route   POST /api/user/login
export const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validations
        if (!email || !password) {
            return res.status(400).json({ success: false, message: "Please provide email and password" });
        }

        // Check if user exists
        const [users] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
        if (users.length === 0) {
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        }

        const user = users[0];

        // Match password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        }

        const token = createToken(user.id);

        res.status(200).json({
            success: true,
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                theme: user.theme || 'light',
                daily_target: user.daily_target ?? 3,
                default_category: user.default_category || 'Other',
                ai_enabled: user.ai_enabled ?? 1,
                notifications_enabled: user.notifications_enabled ?? 0
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error during login" });
    }
};

// @desc    Get user security question
// @route   GET /api/user/security-question
export const getSecurityQuestion = async (req, res) => {
    try {
        const { email } = req.query;

        if (!email) {
            return res.status(400).json({ success: false, message: "Please provide an email" });
        }

        const [users] = await pool.query("SELECT security_question FROM users WHERE email = ?", [email]);
        if (users.length === 0) {
            return res.status(404).json({ success: false, message: "User not found with this email" });
        }

        const user = users[0];
        if (!user.security_question) {
            return res.status(400).json({ 
                success: false, 
                message: "No security question set for this account. Please contact support." 
            });
        }

        res.status(200).json({ 
            success: true, 
            securityQuestion: user.security_question 
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error retrieving security question" });
    }
};

// @desc    Forgot Password - Request reset
// @route   POST /api/user/forgot-password
export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, message: "Please provide an email" });
        }

        // Check if user exists
        const [users] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
        if (users.length === 0) {
            return res.status(404).json({ success: false, message: "User not found with this email" });
        }

        // In a real app, we would generate a token, save it to DB, and send an email
        // For now, we'll just return success to allow the frontend to proceed
        res.status(200).json({ 
            success: true, 
            message: "Password reset instructions sent to your email" 
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error during forgot password" });
    }
};

// @desc    Reset Password
// @route   POST /api/user/reset-password
export const resetPassword = async (req, res) => {
    try {
        const { email, securityAnswer, newPassword } = req.body;

        if (!email || !securityAnswer || !newPassword) {
            return res.status(400).json({ success: false, message: "Please provide all required fields" });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
        }

        // Fetch user's security answer
        const [users] = await pool.query("SELECT security_answer FROM users WHERE email = ?", [email]);
        if (users.length === 0) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const user = users[0];
        if (!user.security_answer) {
            return res.status(400).json({ success: false, message: "No security question answers set for this account. Please register a new account or contact administration." });
        }

        // Compare answer (case-insensitive & trimmed)
        const cleanAnswer = securityAnswer.trim().toLowerCase();
        
        let isMatch = false;
        if (user.security_answer.startsWith('$2a$') || user.security_answer.startsWith('$2b$')) {
            isMatch = await bcrypt.compare(cleanAnswer, user.security_answer);
        } else {
            // Fallback for plain text
            isMatch = (cleanAnswer === user.security_answer.toLowerCase());
        }

        if (!isMatch) {
            return res.status(400).json({ success: false, message: "Incorrect security answer" });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update password in DB
        await pool.query(
            "UPDATE users SET password = ? WHERE email = ?",
            [hashedPassword, email]
        );

        res.status(200).json({ success: true, message: "Password reset successful" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error during password reset" });
    }
};

// @desc    Get user profile & settings
// @route   GET /api/user/profile
export const getUserProfile = async (req, res) => {
    try {
        const { userId } = req.body;
        
        const [users] = await pool.query(
            "SELECT id, name, email, theme, daily_target, default_category, ai_enabled, notifications_enabled FROM users WHERE id = ?",
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        res.status(200).json({
            success: true,
            user: users[0]
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error while fetching profile" });
    }
};

// @desc    Update user profile & settings
// @route   PUT /api/user/profile
export const updateUserProfile = async (req, res) => {
    try {
        const { userId, name, email, theme, daily_target, default_category, ai_enabled, notifications_enabled } = req.body;

        if (!name || !email) {
            return res.status(400).json({ success: false, message: "Name and Email are required" });
        }

        if (!validator.isEmail(email)) {
            return res.status(400).json({ success: false, message: "Please enter a valid email" });
        }

        // Check if email already taken by another user
        const [existingEmail] = await pool.query("SELECT * FROM users WHERE email = ? AND id != ?", [email, userId]);
        if (existingEmail.length > 0) {
            return res.status(400).json({ success: false, message: "Email is already taken by another user" });
        }

        // Update in DB
        await pool.query(
            "UPDATE users SET name = ?, email = ?, theme = ?, daily_target = ?, default_category = ?, ai_enabled = ?, notifications_enabled = ? WHERE id = ?",
            [
                name,
                email,
                theme || 'light',
                daily_target !== undefined ? parseInt(daily_target) : 3,
                default_category || 'Other',
                ai_enabled ? 1 : 0,
                notifications_enabled ? 1 : 0,
                userId
            ]
        );

        // Fetch the updated user
        const [updatedUsers] = await pool.query(
            "SELECT id, name, email, theme, daily_target, default_category, ai_enabled, notifications_enabled FROM users WHERE id = ?",
            [userId]
        );

        res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            user: updatedUsers[0]
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error while updating profile" });
    }
};

// @desc    Change password securely
// @route   PUT /api/user/change-password
export const changePassword = async (req, res) => {
    try {
        const { userId, currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, message: "Please fill all fields" });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ success: false, message: "New password must be at least 6 characters" });
        }

        // Fetch user's current password hash
        const [users] = await pool.query("SELECT password FROM users WHERE id = ?", [userId]);
        if (users.length === 0) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const user = users[0];

        // Verify current password
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: "Incorrect current password" });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update in DB
        await pool.query("UPDATE users SET password = ? WHERE id = ?", [hashedPassword, userId]);

        res.status(200).json({
            success: true,
            message: "Password updated successfully"
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error while changing password" });
    }
};

// @desc    Change security question securely
// @route   PUT /api/user/change-security-question
export const changeSecurityQuestion = async (req, res) => {
    try {
        const { userId, currentPassword, newSecurityQuestion, newSecurityAnswer } = req.body;

        if (!currentPassword || !newSecurityQuestion || !newSecurityAnswer) {
            return res.status(400).json({ success: false, message: "Please fill all fields" });
        }

        // Fetch user's current password hash
        const [users] = await pool.query("SELECT password FROM users WHERE id = ?", [userId]);
        if (users.length === 0) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const user = users[0];

        // Verify current password
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: "Incorrect current password" });
        }

        // Hash new security answer
        const cleanAnswer = newSecurityAnswer.trim().toLowerCase();
        const salt = await bcrypt.genSalt(10);
        const hashedAnswer = await bcrypt.hash(cleanAnswer, salt);

        // Update in DB
        await pool.query("UPDATE users SET security_question = ?, security_answer = ? WHERE id = ?", [newSecurityQuestion, hashedAnswer, userId]);

        res.status(200).json({
            success: true,
            message: "Security question updated successfully"
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error while changing security question" });
    }
};

// @desc    Get adaptive Pomodoro timer duration based on days since registration
// @route   GET /api/user/timer-duration
export const getTimerDuration = async (req, res) => {
    try {
        const { userId } = req.body;

        const [users] = await pool.query(
            "SELECT registered_at FROM users WHERE id = ?",
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const registeredAt = users[0].registered_at || new Date();
        const { durationMinutes, daysSinceRegistration } = getAdaptiveTimerDuration(registeredAt);

        res.status(200).json({
            success: true,
            durationMinutes,
            daysSinceRegistration,
            showStreakMessage: daysSinceRegistration <= 10
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Failed to fetch timer duration" });
    }
};
