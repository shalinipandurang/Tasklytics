import jwt from "jsonwebtoken";

const authMiddleware = async (req, res, next) => {
    try {
        const { authorization } = req.headers;

        if (!authorization || !authorization.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, message: "Not Authorized. Login to continue" });
        }

        const token = authorization.split(' ')[1];

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Add the user id to the request object
        if (!req.body) req.body = {};
        req.body.userId = decoded.id;
        next();

    } catch (error) {
        console.error(error);
        return res.status(401).json({ success: false, message: "Invalid Token" });
    }
};

export default authMiddleware;
