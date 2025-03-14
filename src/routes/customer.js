import express from "express";
import {
  getAccountCustomer,
  loginCustomer,
  registerCustomer,
  sendOtp,
  verifyOtp,
  resetPassword,
  updateAccount,
} from "../controllers/auth.controller.js";
import {
  createOrderCod,
  createOrderStripe,
  createOrderVnpay,
  getOrderByCustomer,
  orderStripeReturn,
  orderVnpayReturn,
  updateOrder,
} from "../controllers/order.controller.js";
import { validateMiddleWare } from "../middleware/validate.middleware.js";
import {
  loginCustomerValidate,
  registerCustomerValidate,
  resetPasswordValidate,
  updateAccountValidate,
} from "../validates/auth.validate.js";
import {
  getProductHome,
  getFilterOptions,
  getProductSearch,
  getListFromCategory,
  getProductPromotion,
  getProductDetailBySlug,
} from "../controllers/product.controller.js";
import { getAllCategory } from "../controllers/category.controller.js";
import { authMiddlewareCustomer } from "../middleware/auth.middleware.js";
import { createOrderValidate } from "../validates/order.validate.js";

const router = express.Router();

router.post("/login", loginCustomerValidate, validateMiddleWare, loginCustomer);
router.post(
  "/register",
  registerCustomerValidate,
  validateMiddleWare,
  registerCustomer
);

router.get("/products-home", getProductHome);
router.get("/filter-options", getFilterOptions);
router.get("/products-search", getProductSearch);
router.get("/products-by-category/:slug", getListFromCategory);
router.get("/product-detail/:slug", getProductDetailBySlug);
router.get("/products-by-promotion", getProductPromotion);

router.post("/verify-otp", verifyOtp);
router.post("/send-otp", sendOtp);
router.post(
  "/reset-password",
  resetPasswordValidate,
  validateMiddleWare,
  resetPassword
);
router.put(
  "/account",
  authMiddlewareCustomer,
  validateMiddleWare,
);
router.get("/account", authMiddlewareCustomer, getAccountCustomer);
router.put(
  "/account",
  authMiddlewareCustomer,
  updateAccountValidate,
  validateMiddleWare,
  updateAccount
);
router.get("/categories", getAllCategory);
router.post(
  "/order-cod",
  authMiddlewareCustomer,
  createOrderValidate,
  createOrderCod
);
router.post(
  "/order-vnpay",
  authMiddlewareCustomer,
  createOrderValidate,
  createOrderVnpay
);
router.post(
  "/order-stripe",
  authMiddlewareCustomer,
  createOrderValidate,
  createOrderStripe
);
router.post("/order-vnpay-return", authMiddlewareCustomer, orderVnpayReturn);
router.get("/order-stripe-return", authMiddlewareCustomer, orderStripeReturn);
router.put("/order-status/:id", authMiddlewareCustomer, updateOrder);
router.get("/orders", authMiddlewareCustomer, getOrderByCustomer);

export default router;