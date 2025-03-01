import { body } from "express-validator";

export const createProductValidate = [
    body("name")
        .notEmpty()
        .withMessage("Tên sản phẩm không được để trống")
        .isString()
        .withMessage("Tên sản phẩm phải là chuỗi"),
    body("category")
        .notEmpty()
        .withMessage("Danh mục sản phẩm không được để trống")
        .isMongoId()
        .withMessage("ID danh mục không hợp lệ"),
    body("price")
        .notEmpty()
        .withMessage("Giá sản phẩm không được để trống")
        .isNumeric()
        .withMessage("Giá sản phẩm phải là số")
        .isFloat({ min: 0 })
        .withMessage("Giá sản phẩm không được âm"),
    body("description")
        .notEmpty()
        .withMessage("Mô tả sản phẩm không được để trống")
        .isString()
        .withMessage("Mô tả sản phẩm phải là chuỗi"),
    body("mainImage")
        .notEmpty()
        .withMessage("Ảnh chính của sản phẩm không được để trống")
        .isObject()
        .withMessage("Ảnh chính phải là một đối tượng"),
    body("mainImage.url")
        .notEmpty()
        .withMessage("URL ảnh chính không được để trống")
        .isURL()
        .withMessage("URL ảnh chính không hợp lệ"),
    body("mainImage.publicId")
        .notEmpty()
        .withMessage("Public ID của ảnh chính không được để trống")
        .isString()
        .withMessage("Public ID của ảnh chính phải là chuỗi"),
    body("variants")
        .optional()
        .isArray()
        .withMessage("Biến thể sản phẩm phải là một mảng"),
    body("variants.*.color")
        .notEmpty()
        .withMessage("Màu sắc của biến thể không được để trống")
        .isString()
        .withMessage("Màu sắc của biến thể phải là chuỗi"),
    body("variants.*.image")
        .notEmpty()
        .withMessage("Ảnh của biến thể không được để trống")
        .isObject()
        .withMessage("Ảnh của biến thể phải là một đối tượng"),
    body("variants.*.image.url")
        .notEmpty()
        .withMessage("URL ảnh của biến thể không được để trống")
        .isURL()
        .withMessage("URL ảnh của biến thể không hợp lệ"),
    body("variants.*.image.publicId")
        .notEmpty()
        .withMessage("Public ID của ảnh biến thể không được để trống")
        .isString()
        .withMessage("Public ID của ảnh biến thể phải là chuỗi"),
    body("enable")
        .optional()
        .isBoolean()
        .withMessage("Trạng thái kích hoạt phải là boolean"),
];

export const updateProductValidate = [
    body("name")
        .optional()
        .notEmpty()
        .withMessage("Tên sản phẩm không được để trống")
        .isString()
        .withMessage("Tên sản phẩm phải là chuỗi"),
    body("category")
        .optional()
        .isMongoId()
        .withMessage("ID danh mục không hợp lệ"),
    body("price")
        .optional()
        .isNumeric()
        .withMessage("Giá sản phẩm phải là số")
        .isFloat({ min: 0 })
        .withMessage("Giá sản phẩm không được âm"),
    body("description")
        .optional()
        .isString()
        .withMessage("Mô tả sản phẩm phải là chuỗi"),
    body("mainImage")
        .optional()
        .isObject()
        .withMessage("Ảnh chính phải là một đối tượng"),
    body("mainImage.url")
        .optional()
        .isURL()
        .withMessage("URL ảnh chính không hợp lệ"),
    body("mainImage.publicId")
        .optional()
        .isString()
        .withMessage("Public ID của ảnh chính phải là chuỗi"),
    body("variants")
        .optional()
        .isArray()
        .withMessage("Biến thể sản phẩm phải là một mảng"),
    body("variants.*.color")
        .optional()
        .notEmpty()
        .withMessage("Màu sắc của biến thể không được để trống")
        .isString()
        .withMessage("Màu sắc của biến thể phải là chuỗi"),
    body("variants.*.image")
        .optional()
        .isObject()
        .withMessage("Ảnh của biến thể phải là một đối tượng"),
    body("variants.*.image.url")
        .optional()
        .isURL()
        .withMessage("URL ảnh của biến thể không hợp lệ"),
    body("variants.*.image.publicId")
        .optional()
        .isString()
        .withMessage("Public ID của ảnh biến thể phải là chuỗi"),
    body("enable")
        .optional()
        .isBoolean()
        .withMessage("Trạng thái kích hoạt phải là boolean"),
];