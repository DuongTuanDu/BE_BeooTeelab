import Product from "../models/product.model.js";
import slugify from "slugify";
import Promotion from "../models/promotion.model.js";
import Category from "../models/category.model.js";
import Review from "../models/review.model.js";

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

export const getProductHome = async (req, res) => {
    try {
        const { categories } = req.query;

        if (!categories || typeof categories !== "string")
            throw new Error("Không tìm thấy sản phẩm");

        const categorySlugs = categories
            .split(",")
            .filter((id) => id.trim() !== "");
        if (categorySlugs.length === 0) throw new Error("Không tìm thấy sản phẩm");

        const productsByCategory = await Promise.all(
            categorySlugs.map(async (slug) => {
                const category = await Category.findOne({ slug }).lean();
                const products = await Product.find({ category: category._id })
                    .limit(8)
                    .populate("category")
                    .lean();

                const productIds = products.map(product => product._id);
                const reviews = await Review.aggregate([
                    {
                        $match: {
                            product: { $in: productIds },
                            display: true
                        }
                    },
                    {
                        $group: {
                            _id: "$product",
                            averageRating: { $avg: "$rate" },
                            totalReviews: { $sum: 1 }
                        }
                    }
                ]);

                const reviewsMap = reviews.reduce((acc, review) => {
                    acc[review._id.toString()] = {
                        averageRating: parseFloat(review.averageRating.toFixed(1)),
                        totalReviews: review.totalReviews
                    };
                    return acc;
                }, {});

                const enrichedProducts = await Promise.all(
                    products.map(async (product) => {
                        const promotionData = await enrichProductWithPromotion(product);
                        const reviewData = reviewsMap[product._id.toString()] || {
                            averageRating: 0,
                            totalReviews: 0
                        };

                        return {
                            ...promotionData,
                            averageRating: reviewData.averageRating || 0,
                            totalReviews: reviewData.totalReviews || 0
                        };
                    })
                );

                return {
                    category,
                    products: enrichedProducts,
                };
            })
        );

        return res.status(200).json({
            success: true,
            data: productsByCategory,
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

export const getProductSearch = async (req, res) => {
    try {
        const { search } = req.query;
        const products = await Product.find({
            name: {
                $regex: search,
                $options: "i",
            },
        }).lean();

        const productIds = products.map(product => product._id);
        const reviews = await Review.aggregate([
            {
                $match: {
                    product: { $in: productIds },
                    display: true
                }
            },
            {
                $group: {
                    _id: "$product",
                    averageRating: { $avg: "$rate" },
                    totalReviews: { $sum: 1 }
                }
            },
            {
                $project: {
                    averageRating: { $round: ["$averageRating", 1] },
                    totalReviews: 1
                }
            }
        ]);

        const reviewsMap = reviews.reduce((acc, review) => {
            acc[review._id.toString()] = {
                averageRating: review.averageRating,
                totalReviews: review.totalReviews
            };
            return acc;
        }, {});

        const enrichedProducts = await Promise.all(
            products.map(async (product) => {
                const promotionData = await enrichProductWithPromotion(product);
                const reviewData = reviewsMap[product._id.toString()] || {
                    averageRating: 0,
                    totalReviews: 0
                };

                return {
                    ...promotionData,
                    averageRating: reviewData.averageRating || 0,
                    totalReviews: reviewData.totalReviews || 0
                };
            })
        );

        return res.status(200).json({
            success: true,
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

export const getFilterOptions = async (req, res) => {
    try {
        const [priceData, categories, colors] = await Promise.all([
            Product.aggregate([
                {
                    $group: {
                        _id: null,
                        minPrice: { $min: "$price" },
                        maxPrice: { $max: "$price" },
                    },
                },
            ]),

            Category.aggregate([
                {
                    $lookup: {
                        from: "products",
                        localField: "_id",
                        foreignField: "category",
                        as: "products",
                    },
                },
                {
                    $project: {
                        name: 1,
                        slug: 1,
                        productCount: { $size: "$products" },
                    },
                },
            ]),

            Product.aggregate([
                { $unwind: "$variants" },
                {
                    $group: {
                        _id: null,
                        colors: { $addToSet: "$variants.color" },
                    },
                },
            ]),
        ]);

        // Tạo khoảng giá động dựa trên min/max
        const minPrice = priceData[0].minPrice;
        const maxPrice = priceData[0].maxPrice;
        const step = (maxPrice - minPrice) / 6; // Chia thành 6 khoảng

        const priceRanges = [];
        for (let i = 0; i < 6; i++) {
            priceRanges.push({
                min: Math.round(minPrice + step * i),
                max: Math.round(minPrice + step * (i + 1)),
            });
        }

        // Thêm khoảng cuối
        priceRanges.push({
            min: Math.round(minPrice + step * 6),
            max: maxPrice,
        });

        return res.status(200).json({
            success: true,
            data: {
                priceRanges,
                categories,
                ratings: [
                    { value: 5, label: "5 sao" },
                    { value: 4, label: "4 sao trở lên" },
                    { value: 3, label: "3 sao trở lên" },
                    { value: 2, label: "2 sao trở lên" },
                    { value: 1, label: "1 sao trở lên" },
                ],
                colors: colors[0].colors,
            },
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
            data: [],
        });
    }
};

export const getListFromCategory = async (req, res) => {
    try {
        const { page = 1, pageSize = 12 } = req.query;
        const { priceRange, colors, rating, categories } = req.query;
        const { slug } = req.params;

        let filter = {};

        // Category filter
        if (slug) {
            const category = await Category.findOne({ slug });
            filter.category = category._id;
        }

        if (categories?.length) {
            filter.category = { $in: categories.split(",") };
        }

        // Price range filter
        if (priceRange) {
            const [min, max] = priceRange.split(",");
            filter.price = {};
            if (min) filter.price.$gte = Number(min);
            if (max) filter.price.$lte = Number(max);
        }

        // Colors filter
        if (colors?.length) {
            filter["variants.color"] = { $in: colors.split(",") };
        }

        // Get product ratings first if rating filter is applied
        let productsWithRating = [];
        if (rating) {
            productsWithRating = await Review.aggregate([
                {
                    $match: {
                        display: true
                    }
                },
                {
                    $group: {
                        _id: "$product",
                        avgRating: { $avg: "$rate" },
                        totalReviews: { $sum: 1 }
                    }
                },
                {
                    $match: {
                        avgRating: { $gte: Number(rating) }
                    }
                }
            ]);

            filter._id = { $in: productsWithRating.map(r => r._id) };
        }

        // Get products with pagination
        const [total, products] = await Promise.all([
            Product.countDocuments(filter),
            Product.find(filter)
                .skip((Number(page) - 1) * Number(pageSize))
                .limit(Number(pageSize))
                .populate("category")
                .lean()
        ]);

        // Get ratings for current page products
        const productIds = products.map(product => product._id);
        const reviews = await Review.aggregate([
            {
                $match: {
                    product: { $in: productIds },
                    display: true
                }
            },
            {
                $group: {
                    _id: "$product",
                    averageRating: { $avg: "$rate" },
                    totalReviews: { $sum: 1 }
                }
            },
            {
                $project: {
                    averageRating: { $round: ["$averageRating", 1] },
                    totalReviews: 1
                }
            }
        ]);

        // Create reviews map
        const reviewsMap = reviews.reduce((acc, review) => {
            acc[review._id.toString()] = {
                averageRating: review.averageRating,
                totalReviews: review.totalReviews
            };
            return acc;
        }, {});

        // Enrich products with both promotions and reviews
        const enrichedProducts = await Promise.all(
            products.map(async (product) => {
                const promotionData = await enrichProductWithPromotion(product);
                const reviewData = reviewsMap[product._id.toString()] || {
                    averageRating: 0,
                    totalReviews: 0
                };

                return {
                    ...promotionData,
                    averageRating: reviewData.averageRating || 0,
                    totalReviews: reviewData.totalReviews || 0
                };
            })
        );

        return res.status(200).json({
            success: true,
            data: {
                products: enrichedProducts,
                pagination: {
                    page: Number(page),
                    totalPage: Math.ceil(total / Number(pageSize)),
                    totalItems: total,
                    pageSize: Number(pageSize),
                },
            },
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message,
        });
    }
};

export const getProductPromotion = async (req, res) => {
    try {
        const { page = 1, pageSize = 12 } = req.query;
        const { priceRange, colors, rating, categories } = req.query;
        const now = new Date();

        const activePromotions = await Promotion.find({
            status: "ACTIVE",
            startDate: { $lte: now },
            endDate: { $gt: now },
        });

        const promotedProductIds = [
            ...new Set([
                ...activePromotions.flatMap((p) => p.applicableProducts),
                ...(await Product.find({
                    category: {
                        $in: activePromotions.flatMap((p) => p.applicableCategories),
                    },
                }).distinct("_id")),
            ]),
        ];

        let filter = {
            _id: { $in: promotedProductIds },
        };

        if (categories?.length) {
            filter.category = { $in: categories.split(",") };
        }

        if (priceRange) {
            const [min, max] = priceRange.split(",");
            filter.price = {};
            if (min) filter.price.$gte = Number(min);
            if (max) filter.price.$lte = Number(max);
        }

        if (colors?.length) {
            filter["variants.color"] = { $in: colors.split(",") };
        }

        let productRatings = [];
        if (rating) {
            productRatings = await Review.aggregate([
                {
                    $match: {
                        display: true
                    }
                },
                {
                    $group: {
                        _id: "$product",
                        avgRating: { $avg: "$rate" },
                        totalReviews: { $sum: 1 }
                    }
                },
                {
                    $match: {
                        avgRating: { $gte: Number(rating) }
                    }
                }
            ]);

            filter._id = {
                $in: productRatings.map(r => r._id),
                $in: promotedProductIds
            };
        }

        const [total, products] = await Promise.all([
            Product.countDocuments(filter),
            Product.find(filter)
                .skip((Number(page) - 1) * Number(pageSize))
                .limit(Number(pageSize))
                .populate("category", "name slug")
                .lean(),
        ]);

        const productIds = products.map(product => product._id);
        const reviews = await Review.aggregate([
            {
                $match: {
                    product: { $in: productIds },
                    display: true
                }
            },
            {
                $group: {
                    _id: "$product",
                    averageRating: { $avg: "$rate" },
                    totalReviews: { $sum: 1 }
                }
            },
            {
                $project: {
                    averageRating: { $round: ["$averageRating", 1] },
                    totalReviews: 1
                }
            }
        ]);

        const reviewsMap = reviews.reduce((acc, review) => {
            acc[review._id.toString()] = {
                averageRating: review.averageRating,
                totalReviews: review.totalReviews
            };
            return acc;
        }, {});

        const enrichedProducts = await Promise.all(
            products.map(async (product) => {
                const productPromotions = activePromotions.filter(
                    (p) =>
                        p.applicableProducts.includes(product._id) ||
                        p.applicableCategories.includes(product.category._id)
                );

                let bestDiscount = null;
                let bestPrice = product.price;

                productPromotions.forEach((promotion) => {
                    let discountedPrice = product.price;
                    if (promotion.type === "PERCENTAGE") {
                        discountedPrice = product.price * (1 - promotion.value / 100);
                    } else if (promotion.type === "FIXED_AMOUNT") {
                        discountedPrice = product.price - promotion.value;
                    }

                    if (promotion.maxDiscountAmount) {
                        const discount = product.price - discountedPrice;
                        if (discount > promotion.maxDiscountAmount) {
                            discountedPrice = product.price - promotion.maxDiscountAmount;
                        }
                    }

                    discountedPrice = Math.max(0, Math.round(discountedPrice));

                    if (discountedPrice < bestPrice) {
                        bestPrice = discountedPrice;
                        bestDiscount = {
                            finalPrice: discountedPrice,
                            promotionInfo: {
                                id: promotion._id,
                                name: promotion.name,
                                type: promotion.type,
                                value: promotion.value,
                                banner: promotion.banner,
                            },
                        };
                    }
                });

                const reviewData = reviewsMap[product._id.toString()] || {
                    averageRating: 0,
                    totalReviews: 0
                };

                return {
                    ...product,
                    isPromotion: true,
                    promotion: bestDiscount,
                    averageRating: reviewData.averageRating || 0,
                    totalReviews: reviewData.totalReviews || 0
                };
            })
        );

        return res.status(200).json({
            success: true,
            data: {
                products: enrichedProducts,
                pagination: {
                    page: Number(page),
                    totalPage: Math.ceil(total / Number(pageSize)),
                    totalItems: total,
                    pageSize: Number(pageSize),
                },
            },
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message,
        });
    }
};