// promotion.controller.js
import Promotion from "../models/promotion.model.js";

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
