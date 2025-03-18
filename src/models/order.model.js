import mongoose from "mongoose";

export const OrderSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        name: {
            type: String,
            required: true,
        },
        products: [
            {
                productId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "Product",
                    required: true,
                },
                name: {
                    type: String,
                    required: true,
                },
                image: {
                    type: String,
                    required: true,
                },
                size: {
                    type: String,
                    required: true,
                },
                color: {
                    type: String,
                    required: true,
                },
                price: {
                    type: Number,
                    required: true,
                },
                quantity: {
                    type: Number,
                    required: true,
                },
                isReviewed: {
                    type: Boolean,
                    default: false,
                },
            },
        ],
        status: {
            type: String,
            enum: ["pending", "processing", "shipping", "delivered", "cancelled"],
            default: "pending",
        },
        province: {
            id: {
                type: Number,
                required: true,
            },
            name: {
                type: String,
                required: true,
            },
        },
        district: {
            id: {
                type: Number,
                required: true,
            },
            name: {
                type: String,
                required: true,
            },
        },
        ward: {
            id: {
                type: String,
                required: true,
            },
            name: {
                type: String,
                required: true,
            },
        },
        phone: {
            type: String,
            required: true,
        },
        address: {
            type: String,
            required: true,
        },
        paymentMethod: {
            type: String,
            required: true,
            enum: ["COD", "STRIPE", "VNPAY"],
        },
        note: {
            type: String,
            default: "KHÔNG CÓ",
        },
        totalAmount: {
            type: Number,
            required: true,
        },
        stripeSessionId: {
            type: String,
            default: "",
        },
        isReviewed: {
            type: Boolean,
            default: false,
        }
    },
    { timestamps: true }
);

const Order = mongoose.model("Order", OrderSchema);

export default Order;