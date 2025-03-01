import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import Admin from "../models/admin.model.js";
dotenv.config();

const generateTokenAdmin = (admin) => {
    return jwt.sign(
        { id: admin._id, username: admin.email, role: admin.role },
        process.env.JWT_SECRET_KEY_ADMIN,
        { expiresIn: process.env.JWT_EXPIRES_IN_ADMIN }
    );
};

export const loginAdmin = async (req, res) => {
    try {
        const { username, password } = req.body;
        const admin = await Admin.findOne({ username });

        if (!admin || !(await bcrypt.compare(password, admin.password))) {
            return res.status(400).json({
                success: false,
                message: "Thông tin đăng nhập không chính xác",
            });
        }

        const token = generateTokenAdmin(admin);
        return res.status(200).json({
            success: true,
            message: "Đăng nhập thành công",
            data: {
                id: admin._id,
                username: admin.username,
                avatar: admin.avatar,
                accessToken: token,
            },
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Lỗi server: " + error.message,
        });
    }
};

export const getAccountAdmin = async (req, res) => {
    try {
        const admin = await Admin.findById(req.admin._id).select("-password -__v");

        if (!admin) {
            return res.status(404).json({
                success: false,
                message: "Vui lòng đăng nhập",
            });
        }

        return res.status(200).json({
            success: true,
            data: admin,
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Lỗi server: " + error.message,
        });
    }
};