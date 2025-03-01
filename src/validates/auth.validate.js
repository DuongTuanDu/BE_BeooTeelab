import { body } from "express-validator";

export const loginAdminValidate = [
    body("username").notEmpty().withMessage("Vui lòng nhập username"),
    body("password").notEmpty().withMessage("Vui lòng nhập mật khẩu"),
];