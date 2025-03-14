import { body } from "express-validator";

export const loginAdminValidate = [
    body("username").notEmpty().withMessage("Vui lòng nhập username"),
    body("password").notEmpty().withMessage("Vui lòng nhập mật khẩu"),
];

export const loginCustomerValidate = [
    body("email")
        .notEmpty()
        .withMessage("Vui lòng nhập email")
        .isEmail()
        .withMessage("Email không hợp lệ"),
    body("password")
        .notEmpty()
        .withMessage("Vui lòng nhập mật khẩu")
        .isLength({ min: 6 })
        .withMessage("Mật khẩu phải có ít nhất 6 ký tự"),
];

export const registerCustomerValidate = [
    body("name")
        .notEmpty()
        .withMessage("Vui lòng nhập họ tên")
        .isLength({ min: 2 })
        .withMessage("Tên phải có ít nhất 2 ký tự"),
    body("email")
        .notEmpty()
        .withMessage("Vui lòng nhập email")
        .isEmail()
        .withMessage("Email không hợp lệ")
        .normalizeEmail(),
    body("password")
        .notEmpty()
        .withMessage("Vui lòng nhập mật khẩu")
        .isLength({ min: 6 })
        .withMessage("Mật khẩu phải có ít nhất 6 ký tự")
        .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9]).{8,}$/, "i")
        .withMessage(
            "Mật khẩu phải chứa ít nhất 1 chữ hoa, 1 chữ thường, 1 số và 1 ký tự đặc biệt"
        ),
];

export const resetPasswordValidate = [
    body("email")
        .notEmpty()
        .withMessage("Vui lòng nhập email")
        .isEmail()
        .withMessage("Email không hợp lệ")
        .normalizeEmail(),
    body("password")
        .notEmpty()
        .withMessage("Vui lòng nhập mật khẩu")
        .isLength({ min: 6 })
        .withMessage("Mật khẩu phải có ít nhất 6 ký tự")
        .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9]).{8,}$/, "i")
        .withMessage(
            "Mật khẩu phải chứa ít nhất 1 chữ hoa, 1 chữ thường, 1 số và 1 ký tự đặc biệt"
        ),
];

export const updateAccountValidate = [
    body("email")
        .notEmpty()
        .withMessage("Vui lòng nhập email")
        .isEmail()
        .withMessage("Email không hợp lệ")
        .normalizeEmail(),
    body("name").optional().notEmpty().withMessage("Vui lòng nhập họ tên"),
    body("password")
        .optional()
        .notEmpty()
        .withMessage("Vui lòng nhập mật khẩu")
        .isLength({ min: 6 })
        .withMessage("Mật khẩu phải có ít nhất 6 ký tự")
        .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9]).{8,}$/, "i")
        .withMessage(
            "Mật khẩu phải chứa ít nhất 1 chữ hoa, 1 chữ thường, 1 số và 1 ký tự đặc biệt"
        ),
];