import Review from "../models/review.model.js";
import Product from "../models/product.model.js";
import User from "../models/user.model.js";

export const updateReview = async (req, res) => {
    try {
        const { id } = req.params;
        const { display, reply } = req.body;
        const review = await Review.findById(id);

        if (!review) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy đánh giá hoặc bạn không có quyền chỉnh sửa",
            });
        }

        if (display !== undefined) review.display = display;
        if (reply !== undefined) review.reply = reply;

        const updatedReview = await review.save();

        res.status(200).json({
            success: true,
            message: "Cập nhật thông tin đánh giá thành công",
            data: updatedReview,
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

export const removeReview = async (req, res) => {
    try {
        const { id } = req.params;
        const review = await Review.findByIdAndDelete(id);

        if (!review) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy đánh giá hoặc bạn không có quyền xóa",
            });
        }

        res.status(200).json({
            success: true,
            message: "Xóa đánh giá thành công",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message,
        });
    }
};

export const getReviewByAdmin = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 10;
        const { rate, customerName, productName, fromDate, toDate } = req.query;

        const skip = (page - 1) * pageSize;

        let filter = {};

        if (rate) {
            filter.rate = parseInt(rate);
        }

        if (productName) {
            const product = await Product.findOne({
                name: { $regex: productName, $options: "i" },
            });
            if (product) filter.product = product._id;
        }

        if (customerName) {
            const user = await User.findOne({
                name: { $regex: customerName, $options: "i" },
            });
            if (user) filter.user = user._id;
        }

        if (fromDate && toDate) {
            filter.createdAt = {
                $gte: new Date(fromDate),
                $lte: new Date(toDate),
            };
        }

        const [reviews, total] = await Promise.all([
            Review.find(filter)
                .populate({
                    path: "user",
                    select: "name email",
                })
                .populate({
                    path: "product",
                    select: "name mainImage",
                })
                .skip(skip)
                .limit(pageSize)
                .sort({ createdAt: -1 })
                .lean(),
            Review.countDocuments(filter),
        ]);

        res.status(200).json({
            success: true,
            data: reviews,
            pagination: {
                page,
                totalPage: Math.ceil(total / pageSize),
                totalItems: total,
                pageSize,
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Internal Server Error",
            data: [],
            error: error.message,
        });
    }
};