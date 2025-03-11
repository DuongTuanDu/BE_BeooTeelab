import jwt from "jsonwebtoken";
import Admin from "../models/admin.model.js";

const verifyToken = (token, secret) => jwt.verify(token, secret);

const findAdminById = async (id) => Admin.findById(id).select("-password");

const handleAuthError = (res, status, message) =>
    res.status(status).json({ success: false, message });

export const authMiddlewareAdmin = async (req, res, next) => {
    try {
        const token = req.header("X-Admin-Header")?.split(" ")[1];
        
        if (!token) {
            return handleAuthError(res, 401, "Quyền truy cập bị từ chối");
        }
        const decoded = verifyToken(token, process.env.JWT_SECRET_KEY_ADMIN);

        const admin = await findAdminById(decoded.id);
        if (!admin) {
            return handleAuthError(res, 403, "Không có quyền truy cập");
        }

        req.admin = admin;
        next();
    } catch (error) {
        if (error.name === "JsonWebTokenError") {
            return handleAuthError(res, 401, "Token không hợp lệ");
        }
        if (error.name === "TokenExpiredError") {
            return handleAuthError(res, 401, "Token đã hết hạn");
        }
        handleAuthError(res, 500, `Lỗi server: ${error.message}`);
    }
};