import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import Admin from "../models/admin.model.js";
import User from "../models/user.model.js";
import Otp from "../models/otp.model.js";
import { sendEmail } from "../configs/mail.js";
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

export const registerCustomer = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: "Email đăng ký đã tồn tại",
            });
        }
        const newUser = new User({
            name,
            email,
            password,
            avatar: {
                url: `https://avatar.iran.liara.run/username?username=${name}`,
                publicId: "",
            },
        });
        const otp = generateOTP();
        const expirationTime = Date.now() + 5 * 60 * 1000;
        const newOtp = new Otp({
            email,
            otp,
            exp: Math.floor(expirationTime / 1000),
        });
        await Promise.all([newUser.save(), newOtp.save()]);
        sendEmail({ name: newUser.name, email, verificationCode: otp });
        res.status(201).json({
            success: true,
            message:
                "Đăng ký tài khoản thành công. Vui lòng kiểm tra email để xác thực OTP.",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Lỗi server: " + error.message,
        });
    }
};

export const loginCustomer = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(400).json({
                success: false,
                message: "Thông tin đăng nhập không chính xác",
            });
        }

        if (!user.isActive) {
            return res.status(400).json({
                success: false,
                message: "Vui lòng xác thực tài khoản",
                data: {
                    verify: false,
                    email,
                },
            });
        }

        const token = generateToken(user);
        res.status(200).json(handleLoginResponse(user, token));
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Lỗi server: " + error.message,
        });
    }
};

export const sendOtp = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "Email không tồn tại trong hệ thống",
            });
        }
        await Otp.deleteMany({ email });
        const otp = generateOTP();
        const expirationTime = Date.now() + 5 * 60 * 1000;
        const newOtp = new Otp({
            email,
            otp,
            exp: Math.floor(expirationTime / 1000),
        });
        await newOtp.save();
        sendEmail({ name: user.name, email, verificationCode: otp });
        res.status(200).json({
            success: true,
            message: "OTP đã được gửi tới email",
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Lỗi server: " + error.message,
        });
    }
};

export const verifyOtp = async (req, res) => {
    try {
        const { otp, email } = req.body;
        if (!otp) {
            return res.status(400).json({
                success: false,
                message: "Vui lòng nhập mã OTP",
            });
        }

        const otpRecord = await Otp.findOne({
            email,
            otp: parseInt(otp),
        });
        if (!otpRecord) {
            return res.status(400).json({
                success: false,
                message: "Mã OTP không hợp lệ",
            });
        }
        const currentTime = Math.floor(Date.now() / 1000);
        if (currentTime > otpRecord.exp) {
            return res.status(400).json({
                success: false,
                message: "Mã OTP đã hết hạn",
            });
        }
        await Promise.all([
            User.findOneAndUpdate({ email }, { isActive: true }),
            Otp.deleteOne({ _id: otpRecord._id }),
        ]);
        return res.status(200).json({
            success: true,
            message: "Xác thực OTP thành công",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Lỗi server: " + error.message,
        });
    }
};