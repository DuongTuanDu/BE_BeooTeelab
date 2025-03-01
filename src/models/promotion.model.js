import mongoose from "mongoose";
import slugify from "slugify";

export const PromotionSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
        },
        description: {
            type: String,
            required: true,
        },
        type: {
            type: String,
            enum: ["PERCENTAGE", "FIXED_AMOUNT"],
            required: true,
        },
        value: {
            type: Number,
            required: true,
            min: 0,
        },
        startDate: {
            type: Date,
            required: true,
        },
        endDate: {
            type: Date,
            required: true,
        },
        banner: {
            url: {
                type: String,
                required: true,
            },
            publicId: {
                type: String,
                required: true,
            },
        },
        maxDiscountAmount: {
            type: Number,
            default: null,
        },
        applicableProducts: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Product",
            },
        ],
        applicableCategories: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Category",
            },
        ],
        status: {
            type: String,
            enum: ["ACTIVE", "INACTIVE", "EXPIRED"],
            default: "INACTIVE",
        },
        usageLimit: {
            type: Number,
            default: null,
        },
        usedCount: {
            type: Number,
            default: 0,
        },
        slug: {
            type: String,
            lowercase: true,
            unique: true,
        },
    },
    { timestamps: true }
);

// Middleware để tự động cập nhật trạng thái dựa trên ngày
PromotionSchema.pre("save", function (next) {
    const now = new Date();
    if (this.status !== "INACTIVE") {
        if (now > this.endDate) {
            this.status = "EXPIRED";
        } else if (now >= this.startDate) {
            this.status = "ACTIVE";
        }
    }
    next();
});

PromotionSchema.pre("save", function (next) {
    this.slug = slugify(this.name, { lower: true, locale: "vi" });
    next();
});

// Điều chỉnh Product Schema để hỗ trợ khuyến mãi
export const ProductSchemaUpdate = {
    promotions: [
        {
            promotion: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Promotion",
                required: true,
            },
            discountedPrice: {
                type: Number,
                required: true,
            },
        },
    ],
};

const Promotion = mongoose.model("Promotion", PromotionSchema);

export default Promotion;