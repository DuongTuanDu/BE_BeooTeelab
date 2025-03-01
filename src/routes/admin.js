import express from "express";
import {
  createCategory,
  getAllCategory,
  removeCategory,
  updateCategory,
} from "../controllers/category.controller.js";
import {
  createProduct,
  getAllProduct,
  removeProduct,
  updateProduct,
} from "../controllers/product.controller.js";
import { getAccountAdmin, loginAdmin } from "../controllers/auth.controller.js";
import { authMiddlewareAdmin } from "../middleware/auth.middleware.js";
import {
  getOrderByAdmin,
  removeOrder,
  updateOrder,
} from "../controllers/order.controller.js";
import {
  getReviewByAdmin,
  removeReview,
  updateReview,
} from "../controllers/review.controller.js";
import { getAllUser, updateUser } from "../controllers/user.controller.js";
import { validateMiddleWare } from "../middleware/validate.middleware.js";
import { loginAdminValidate } from "../validates/auth.validate.js";
import { statisticalDashboard } from "../services/statistical.js";
import {
  createPromotion,
  updatePromotion,
  getPromotions,
  deletePromotion,
} from "../controllers/promotion.controller.js";

const router = express.Router();

router.post("/login", loginAdminValidate, validateMiddleWare, loginAdmin);
router.get("/account", authMiddlewareAdmin, getAccountAdmin);

// Categories routes
router.post("/categories", authMiddlewareAdmin, createCategory);
router.get("/categories", authMiddlewareAdmin, getAllCategory);
router.put("/categories/:id", authMiddlewareAdmin, updateCategory);
router.delete("/categories/:id", authMiddlewareAdmin, removeCategory);

// Products routes
router.get("/products", authMiddlewareAdmin, getAllProduct);
router.post("/products", authMiddlewareAdmin, createProduct);
router.get("/products/:id", authMiddlewareAdmin, getAllProduct);
router.put("/products/:id", authMiddlewareAdmin, updateProduct);
router.delete("/products/:id", authMiddlewareAdmin, removeProduct);

// Orders routes
router.get("/orders", authMiddlewareAdmin, getOrderByAdmin);
router.put("/orders/:id", authMiddlewareAdmin, updateOrder);
router.delete("/orders/:id", authMiddlewareAdmin, removeOrder);

// Reviews routes
router.get("/reviews", authMiddlewareAdmin, getReviewByAdmin);
router.put("/reviews/:id", authMiddlewareAdmin, updateReview);
router.delete("/reviews/:id", authMiddlewareAdmin, removeReview);

// Users routes
router.get("/users", authMiddlewareAdmin, getAllUser);
router.put("/users/:id", authMiddlewareAdmin, updateUser);

// Promotions routes
router.post("/promotions", authMiddlewareAdmin, createPromotion);
router.get("/promotions", authMiddlewareAdmin, getPromotions);
router.put("/promotions/:id", authMiddlewareAdmin, updatePromotion);
router.delete("/promotions/:id", authMiddlewareAdmin, deletePromotion);

// Statistical routes
router.get("/statistical", authMiddlewareAdmin, statisticalDashboard);

export default router;