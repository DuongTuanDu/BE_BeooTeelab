import Product from "../models/product.model.js";
import slugify from "slugify";

//Product Action
export const createProduct = async (req, res) => {
    try {
        const { name, category, price, description, mainImage, variants } =
            req.body;
        const newProduct = new Product({
            name,
            category,
            price,
            description,
            mainImage,
            variants,
        });
        const savedProduct = await newProduct.save();
        return res.status(201).json({
            success: true,
            message: "Tạo mới sản phẩm thành công",
            data: savedProduct,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message,
        });
    }
};

export const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        let updateData = req.body;

        if (updateData.name) {
            const newSlug = slugify(updateData.name, { lower: true, locale: "vi" });
            updateData.slug = newSlug;
        }

        const updatedProduct = await Product.findByIdAndUpdate(id, updateData, {
            new: true,
        });

        if (!updatedProduct) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy sản phẩm",
            });
        }
        return res.status(200).json({
            success: true,
            message: "Cập nhật sản phẩm thành công",
            data: updatedProduct,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message,
        });
    }
};

export const removeProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedProduct = await Product.findByIdAndDelete(id);
        if (!deletedProduct) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy sản phẩm",
            });
        }
        return res.status(200).json({
            success: true,
            message: "Xóa sản phẩm thành công",
            data: deletedProduct,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message,
        });
    }
};

export const getAllProduct = async (req, res) => {
    try {
        const { page, pageSize, search } = req.query;

        const pageNumber = page ? parseInt(page) : null;
        const pageSizeNumber = pageSize ? parseInt(pageSize) : null;
        const skip =
            pageNumber && pageSizeNumber ? (pageNumber - 1) * pageSizeNumber : 0;

        let filter = {};

        if (search) {
            filter = Object.assign(filter, {
                name: {
                    $regex: search,
                    $options: "i",
                },
            });
        }

        const [total, products] = await Promise.all([
            Product.countDocuments(filter),
            Product.find(filter)
                .populate({ path: "category", select: "name" })
                .skip(pageSizeNumber ? skip : 0)
                .limit(pageSizeNumber || 0)
                .lean()
                .exec(),
        ]);

        const enrichedProducts = await Promise.all(
            products.map((product) => enrichProductWithPromotion(product))
        );

        return res.status(200).json({
            success: true,
            pagination: pageSizeNumber
                ? {
                    page: pageNumber,
                    totalPage: Math.ceil(total / pageSizeNumber),
                    pageSize: pageSizeNumber,
                    totalItems: total,
                }
                : null,
            data: enrichedProducts,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            data: [],
            error: error.message,
        });
    }
};