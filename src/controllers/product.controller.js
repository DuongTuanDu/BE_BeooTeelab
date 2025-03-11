import Product from "../models/product.model.js";
import slugify from "slugify";
import Promotion from "../models/promotion.model.js";

//Promotion calculate
const getActivePromotionsForProduct = async (productId, categoryId) => {
    const now = new Date();
    const conditions = {
        status: "ACTIVE",
        startDate: { $lte: now },
        endDate: { $gt: now },
    };

    const [productPromotions, categoryPromotions] = await Promise.all([
        Promotion.find({
            ...conditions,
            applicableProducts: { $in: [productId] },
        }),
        Promotion.find({
            ...conditions,
            applicableCategories: { $in: [categoryId] },
        }),
    ]);

    return [...productPromotions, ...categoryPromotions];
};

const calculateDiscountedPrice = (originalPrice, promotion) => {
    let discountedPrice = originalPrice;

    if (promotion.type === "PERCENTAGE") {
        discountedPrice = originalPrice * (1 - promotion.value / 100);
    } else if (promotion.type === "FIXED_AMOUNT") {
        discountedPrice = originalPrice - promotion.value;
    }

    if (promotion.maxDiscountAmount) {
        const discount = originalPrice - discountedPrice;
        if (discount > promotion.maxDiscountAmount) {
            discountedPrice = originalPrice - promotion.maxDiscountAmount;
        }
    }

    return Math.max(0, Math.round(discountedPrice));
};

const getBestDiscount = (price, promotions) => {
    if (!promotions || promotions.length === 0) return null;

    let bestPrice = price;
    let bestPromotion = null;

    promotions.forEach((promotion) => {
        const discountedPrice = calculateDiscountedPrice(price, promotion);
        if (discountedPrice < bestPrice) {
            bestPrice = discountedPrice;
            bestPromotion = promotion;
        }
    });

    return bestPromotion
        ? {
            finalPrice: bestPrice,
            promotionInfo: {
                id: bestPromotion._id,
                name: bestPromotion.name,
                type: bestPromotion.type,
                value: bestPromotion.value,
                banner: bestPromotion.banner,
            },
        }
        : null;
};

const enrichProductWithPromotion = async (product) => {
    const activePromotions = await getActivePromotionsForProduct(
        product._id,
        product.category
    );
    const discount = getBestDiscount(product.price, activePromotions);

    return {
        ...product,
        isPromotion: activePromotions.length > 0,
        promotion: discount,
    };
};

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