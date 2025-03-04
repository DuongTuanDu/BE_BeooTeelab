import express from "express";
import {
  loginCustomer,
  registerCustomer,
  sendOtp,
  verifyOtp,
} from "../controllers/auth.controller.js";
import { validateMiddleWare } from "../middleware/validate.middleware.js";
import {
  loginCustomerValidate,
  registerCustomerValidate,
} from "../validates/auth.validate.js";

const router = express.Router();

router.post("/login", loginCustomerValidate, validateMiddleWare, loginCustomer);
router.post(
  "/register",
  registerCustomerValidate,
  validateMiddleWare,
  registerCustomer
);
router.post("/verify-otp", verifyOtp);
router.post("/send-otp", sendOtp);

export default router;