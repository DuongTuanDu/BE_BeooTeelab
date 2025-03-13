import express from "express";
import {
  getAccountCustomer,
  loginCustomer,
  registerCustomer,
  sendOtp,
  verifyOtp,
  resetPassword
} from "../controllers/auth.controller.js";
import { validateMiddleWare } from "../middleware/validate.middleware.js";
import {
  loginCustomerValidate,
  registerCustomerValidate,
  resetPasswordValidate,
} from "../validates/auth.validate.js";
import {
  getProductHome,
  getFilterOptions,
  getProductPromotion,
} from "../controllers/product.controller.js";
import { getAllCategory } from "../controllers/category.controller.js";
import { authMiddlewareCustomer } from "../middleware/auth.middleware.js";

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
router.get("/categories", getAllCategory);

export default router;