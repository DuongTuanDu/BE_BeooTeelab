// promotion.controller.js
import Promotion from "../models/promotion.model.js";
import Product from "../models/product.model.js";
import mongoose from "mongoose";

export const createPromotion = async (req, res) => {
  try {
    const {
      name,
      description,
      type,
      value,
      startDate,
      endDate,
      maxDiscountAmount,
      applicableProducts,
      applicableCategories,
      usageLimit,
      banner,
    } = req.body;

    const promotion = new Promotion({
      name,
      description,
      type,
      value,
      startDate,
      endDate,
      maxDiscountAmount,
      applicableProducts,
      applicableCategories,
      usageLimit,
      banner,
    });

    const savedPromotion = await promotion.save();

    return res.status(201).json({
      success: true,
      message: "Tạo khuyến mãi thành công",
      data: savedPromotion,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Lỗi khi tạo khuyến mãi",
      error: error.message,
    });
  }
};

export const updatePromotion = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const promotion = await Promotion.findById(id);
    if (!promotion) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy khuyến mãi",
      });
    }

    Object.assign(promotion, updateData);
    const updatedPromotion = await promotion.save();

    return res.status(200).json({
      success: true,
      message: "Cập nhật khuyến mãi thành công",
      data: updatedPromotion,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Lỗi khi cập nhật khuyến mãi",
      error: error.message,
    });
  }
};

export const getPromotions = async (req, res) => {
  try {
    const { status, page = 1, pageSize = 10 } = req.query;
    const query = {};

    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * pageSize;

    const [promotions, total] = await Promise.all([
      Promotion.find(query)
        .skip(skip)
        .limit(Number(pageSize))
        .populate("applicableProducts", "name price")
        .populate("applicableCategories", "name"),
      Promotion.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        promotions,
        pagination: {
          page: Number(page),
          pageSize: Number(pageSize),
          totalPage: Math.ceil(total / pageSize),
          totalItems: total,
        },
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách khuyến mãi",
      error: error.message,
    });
  }
};

export const getActivePromotions = async (req, res) => {
  try {
    const now = new Date();
    const promotions = await Promotion.find({
      status: "ACTIVE",
      enable: true,
      startDate: { $lte: now },
      endDate: { $gt: now },
    })
      .populate("applicableProducts", "name price")
      .populate("applicableCategories", "name");

    return res.status(200).json({
      success: true,
      data: promotions,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách khuyến mãi đang hoạt động",
      error: error.message,
    });
  }
};

export const deletePromotion = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedPromotion = await Promotion.findByIdAndDelete(id);
    if (!deletedPromotion) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy khuyến mãi",
      });
    }

    res.status(200).json({
      success: true,
      message: "Xóa khuyến mãi thành công",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi xóa khuyến mãi",
      error: error.message,
    });
  }
};

export const updatePromotionUsage = async (orderDetails) => {
  try {
    console.log("=== Starting updatePromotionUsage ===");

    const { products } = orderDetails;
    if (!products || products.length === 0) {
      console.log("No products found in order");
      return;
    }

    // Get full product details
    const productIds = products.map(
      (p) => new mongoose.Types.ObjectId(p.productId)
    );
    console.log("Product IDs to check:", productIds);

    const productDetails = await Product.find({ _id: { $in: productIds } })
      .populate("category")
      .lean();

    // Get active promotions
    const now = new Date();
    const activePromotions = await Promotion.find({
      status: "ACTIVE",
      startDate: { $lte: now },
      endDate: { $gt: now },
      $or: [
        {
          $expr: {
            $or: [
              { $lt: ["$usedCount", "$usageLimit"] }, // Chưa đạt giới hạn
              { $eq: ["$usedCount", null] }, // Chưa có lượt sử dụng
            ],
          },
        },
      ],
    }).lean();

    console.log("Found active promotions:", activePromotions.length);

    // Track which promotions need updating
    const promotionsToUpdate = new Set();

    // Check each product against promotions
    for (const product of productDetails) {
      const productId = product._id.toString();
      const productCategory = product.category?._id.toString();

      for (const promotion of activePromotions) {
        const applicableProducts =
          promotion.applicableProducts?.map((id) => id.toString()) || [];
        const applicableCategories =
          promotion.applicableCategories?.map((id) => id.toString()) || [];

        // Kiểm tra xem sản phẩm có được áp dụng trực tiếp
        const isProductApplicable = applicableProducts.includes(productId);

        // Kiểm tra xem danh mục của sản phẩm có được áp dụng
        const isCategoryApplicable =
          productCategory && applicableCategories.includes(productCategory);

        if (isProductApplicable || isCategoryApplicable) {
          promotionsToUpdate.add(promotion._id.toString());
        }
      }
    }

    // Update promotion usage counts
    if (promotionsToUpdate.size > 0) {
      console.log(`Updating ${promotionsToUpdate.size} promotions`);

      const updateResults = await Promise.all(
        Array.from(promotionsToUpdate).map(async (promotionId) => {
          // Tìm và cập nhật promotion với điều kiện vẫn còn active
          const promotion = await Promotion.findOne({
            _id: promotionId,
            status: "ACTIVE",
          });

          if (!promotion) {
            console.log(
              `Promotion ${promotionId} not found or no longer active`
            );
            return null;
          }

          // Tăng số lượt sử dụng
          promotion.usedCount = (promotion.usedCount || 0) + 1;

          // Kiểm tra nếu đạt giới hạn
          if (
            promotion.usageLimit &&
            promotion.usedCount >= promotion.usageLimit
          ) {
            promotion.status = "INACTIVE";
            console.log(
              `Promotion ${promotionId} reached usage limit and was deactivated`
            );
          }

          return promotion.save();
        })
      );

      // Log kết quả cập nhật
      const successfulUpdates = updateResults.filter(Boolean);
      console.log(
        `Successfully updated ${successfulUpdates.length} promotions`
      );
      return successfulUpdates;
    }

    console.log("No promotions to update");
    return [];
  } catch (error) {
    console.error("Error updating promotion usage:", error);
    throw error;
  }
};

export const checkAndUpdatePromotionStatus = async () => {
  try {
    const now = new Date();

    // Tìm tất cả promotion active
    const activePromotions = await Promotion.find({
      status: "ACTIVE",
    });

    const updatePromises = activePromotions.map(async (promotion) => {
      let shouldUpdate = false;

      // Kiểm tra giới hạn sử dụng
      if (promotion.usageLimit && promotion.usedCount >= promotion.usageLimit) {
        promotion.status = "INACTIVE";
        shouldUpdate = true;
      }

      // Kiểm tra hết hạn
      if (promotion.endDate < now) {
        promotion.status = "EXPIRED";
        shouldUpdate = true;
      }

      if (shouldUpdate) {
        return promotion.save();
      }
    });

    const results = await Promise.all(updatePromises.filter(Boolean));
    return results;
  } catch (error) {
    console.error("Error checking promotion status:", error);
    throw error;
  }
};

export const resetPromotionUsage = async (promotionId) => {
  try {
    const promotion = await Promotion.findById(promotionId);

    if (!promotion) {
      throw new Error("Promotion not found");
    }

    promotion.usedCount = 0;

    // Nếu promotion bị tắt do đạt giới hạn và chưa hết hạn, kích hoạt lại
    if (promotion.status === "INACTIVE" && promotion.endDate > new Date()) {
      promotion.status = "ACTIVE";
    }

    return await promotion.save();
  } catch (error) {
    console.error("Error resetting promotion usage:", error);
    throw error;
  }
};