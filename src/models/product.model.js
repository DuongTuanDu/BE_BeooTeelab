import mongoose from "mongoose";
import slugify from "slugify";

export const ProductSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true,
        },
        category: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Category",
            required: true,
        },
        slug: {
            type: String,
            lowercase: true,
            unique: true,
        },
        price: {
            type: Number,
            required: true,
        },
        description: {
            type: String,
            required: true,
        },
        mainImage: {
            url: {
                type: String,
                required: true,
            },
            publicId: {
                type: String,
                required: true,
            },
        },
        variants: [
            {
                color: {
                    type: String,
                    required: true,
                },
                image: {
                    url: {
                        type: String,
                        required: true,
                    },
                    publicId: {
                        type: String,
                        required: true,
                    },
                },
            },
        ],
        enable: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true }
);

ProductSchema.pre("save", function (next) {
    this.slug = slugify(this.name, { lower: true, locale: "vi" });
    next();
});

const Product = mongoose.model("Product", ProductSchema);

export default Product;