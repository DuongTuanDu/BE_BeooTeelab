import Category from "../models/category.model.js";
import Promotion from "../models/promotion.model.js";

export const getAllCategory = async (req, res) => {
    try {
        const { page, pageSize, name } = req.query;
        const now = new Date();

        const enrichCategory = async (category) => {
            const promotion = await Promotion.findOne({
                applicableCategories: category._id,
                status: "ACTIVE",
                startDate: { $lte: now },
                endDate: { $gt: now },
            }).lean();

            return {
                ...category,
                isPromotion: !!promotion,
                promotion: promotion || null,
            };
        };

        if (!page && !pageSize && !name) {
            const categories = await Category.find().lean();
            const enrichedCategories = await Promise.all(
                categories.map(enrichCategory)
            );
            return res.status(200).json({
                success: true,
                data: enrichedCategories,
            });
        }

        const pageNumber = parseInt(page) || 1;
        const limitNumber = parseInt(pageSize) || 10;
        const skip = (pageNumber - 1) * limitNumber;
        const filter = name ? { name: { $regex: name, $options: "i" } } : {};

        const [categories, total] = await Promise.all([
            Category.find(filter).skip(skip).limit(limitNumber).lean(),
            Category.countDocuments(filter),
        ]);

        const enrichedCategories = await Promise.all(
            categories.map(enrichCategory)
        );

        const response = {
            success: true,
            data: enrichedCategories,
        };

        if (pageSize) {
            response.pagination = {
                page: pageNumber,
                totalPage: Math.ceil(total / limitNumber),
                totalItems: total,
                pageSize: limitNumber,
            };
        }

        return res.status(200).json(response);
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            data: [],
            error: error.message,
        });
    }
};

export const createCategory = async (req, res) => {
    try {
        const data = req.body;

        const existCategory = await Category.findOne({
            name: data.name,
        }).lean();

        if (existCategory) {
            return res.status(400).json({
                success: false,
                message: "Danh mục đã tồn tại",
            });
        }

        const newCategory = await Category.create(data);

        if (newCategory) {
            return res.status(200).json({
                success: true,
                message: "Tạo mới danh mục thành công",
                category: newCategory,
            });
        } else {
            throw new Error("Tạo mới thất bại vui lòng thử lại");
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message,
        });
    }
};

export const updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;

        const category = await Category.findById(id);

        if (!category) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy danh mục cần cập nhật",
            });
        }

        if (name !== undefined) {
            category.name = name;
        }

        const updatedCategory = await category.save({ validateBeforeSave: false });

        return res.status(200).json({
            success: true,
            message: "Cập nhật danh mục thành công",
            category: updatedCategory,
        });
    } catch (error) {
        console.error("Error updating category:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message,
        });
    }
};

export const removeCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const category = await Category.findByIdAndDelete(id);

        if (!category) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy danh mục",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Xóa danh mục thành công",
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message,
        });
    }
};