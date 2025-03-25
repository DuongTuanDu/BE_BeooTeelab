import Order from "../models/order.model.js";
import { ignoreLogger, ProductCode, VNPay, VnpLocale } from "vnpay";
import Stripe from "stripe";
import OrderSession from "../models/order-session.model.js";
import { updatePromotionUsage } from "./promotion.controller.js";
import { io } from "../socket/index.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const vnpay = new VNPay({
    tmnCode: process.env.TMN_CODE,
    secureSecret: process.env.SECURE_SECRET,
    vnpayHost: "https://sandbox.vnpayment.vn",
    testMode: true,
    hashAlgorithm: "SHA512",
    enableLog: true,
    loggerFn: ignoreLogger,
});

const handleOrderCreation = async (orderData) => {
    try {
        const newOrder = new Order(orderData);
        const savedOrder = await newOrder.save();

        await updatePromotionUsage(savedOrder);

        return savedOrder;
    } catch (error) {
        console.error("Error in order creation:", error);
        throw error;
    }
};

export const createOrderCod = async (req, res) => {
    try {
        const user = req.user;
        const orderData = {
            user: user._id,
            name: req.body.name,
            products: req.body.products,
            phone: req.body.phone,
            address: req.body.address,
            province: req.body.province,
            district: req.body.district,
            ward: req.body.ward,
            paymentMethod: req.body.paymentMethod,
            totalAmount: req.body.totalAmount,
            note: req.body.note || "KHÔNG CÓ",
        };

        const savedOrder = await handleOrderCreation(orderData);

        res.status(201).json({
            success: true,
            message: "Đặt hàng thành công",
            data: savedOrder,
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: "Có lỗi xảy ra khi đặt hàng",
            error: error.message,
        });
    }
};

export const createOrderVnpay = async (req, res) => {
    try {
        const user = req.user;
        const orderData = {
            user: user._id,
            name: req.body.name,
            products: req.body.products,
            phone: req.body.phone,
            address: req.body.address,
            province: req.body.province,
            district: req.body.district,
            ward: req.body.ward,
            paymentMethod: req.body.paymentMethod,
            totalAmount: req.body.totalAmount,
            note: req.body.note || "KHÔNG CÓ",
        };

        const savedOrder = await handleOrderCreation(orderData);

        const ipAddr =
            req.headers["x-forwarded-for"] ||
            req.connection.remoteAddress ||
            req.socket.remoteAddress ||
            req.ip;

        const paymentUrl = vnpay.buildPaymentUrl({
            vnp_Amount: savedOrder.totalAmount,
            vnp_IpAddr: ipAddr,
            vnp_TxnRef: savedOrder._id,
            vnp_OrderInfo: `Thanh toan cho ma GD: ${savedOrder._id}`,
            vnp_OrderType: ProductCode.Other,
            vnp_ReturnUrl: process.env.ORDER_RETURN_URL,
            vnp_Locale: VnpLocale.VN,
        });

        return res.status(200).json({
            success: true,
            data: paymentUrl,
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: "Có lỗi xảy ra khi đặt hàng",
            error: error.message,
        });
    }
};

export const createOrderStripe = async (req, res) => {
    try {
        const user = req.user;
        const orderSessionData = {
            user: user._id,
            name: req.body.name,
            products: req.body.products,
            phone: req.body.phone,
            address: req.body.address,
            province: req.body.province,
            district: req.body.district,
            ward: req.body.ward,
            paymentMethod: req.body.paymentMethod,
            totalAmount: req.body.totalAmount,
            note: req.body.note || "KHÔNG CÓ",
        };

        // Create OrderSession first
        const orderSession = await OrderSession.create(orderSessionData);

        const lineItems = products.map((item) => ({
            price_data: {
                currency: "vnd",
                product_data: {
                    name: item.name,
                    images: [item.image],
                    metadata: {
                        id: item.productId,
                    },
                },
                unit_amount: item.price,
            },
            quantity: item.quantity,
        }));

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            metadata: {
                orderId: JSON.stringify(orderSession._id),
            },
            line_items: lineItems,
            mode: "payment",
            success_url: `${process.env.ORDER_RETURN_URL}?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.ORDER_RETURN_URL}?order_session=${orderSession._id}&session_id={CHECKOUT_SESSION_ID}`,
        });

        return res.status(200).json({
            success: true,
            id: session.id,
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: "Có lỗi xảy ra khi đặt hàng",
            error: error.message,
        });
    }
};

// Handle Stripe webhook for successful payments
export const handleWebhookOrder = async (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event;

    try {
        event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            process.env.END_POINT_SECRET
        );
    } catch (err) {
        console.error(`Webhook Error: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    switch (event.type) {
        case "checkout.session.completed": {
            const checkoutCompleted = event.data.object;
            const orderSessionId = JSON.parse(checkoutCompleted.metadata.orderId);

            // Get the order session data
            const orderSession = await OrderSession.findById(orderSessionId);
            if (!orderSession) return;

            // Create the actual order and update promotion usage
            await handleOrderCreation({
                ...orderSession.toObject(),
                stripeSessionId: checkoutCompleted.id,
            });

            // Delete the order session
            await OrderSession.deleteOne({ _id: orderSessionId });
            break;
        }

        case "checkout.session.async_payment_failed":
        case "checkout.session.expired":
        case "payment_intent.canceled": {
            const session = event.data.object;
            const orderSessionId = JSON.parse(session.metadata.orderId);
            await OrderSession.deleteOne({ _id: orderSessionId });
            break;
        }

        default:
            break;
    }

    res.send();
};

export const orderVnpayReturn = async (req, res) => {
    try {
        const { orderId, code } = req.body;
        const order = await Order.findById(orderId).lean();

        if (!order || !orderId) {
            return res.status(404).json({
                success: false,
                message: "Thông tin đặt hàng không tồn tại",
            });
        }

        // Handle failed payment cases
        const failureCases = {
            24: "Giao dịch không thành công do: Khách hàng hủy giao dịch",
            11: "Giao dịch không thành công do: Khách hàng hủy giao dịch",
            12: "Giao dịch không thành công do: Thẻ/Tài khoản của khách hàng bị khóa",
            75: "Ngân hàng thanh toán đang bảo trì",
        };

        if (failureCases[code]) {
            await Order.deleteOne({ _id: orderId });
            return res.status(402).json({
                success: false,
                message: failureCases[code],
            });
        }

        // Handle successful payment
        if (code === "00") {
            // Update promotion usage for successful VNPay payment
            await updatePromotionUsage(order);

            return res.status(200).json({
                success: true,
                message: "Thanh toán đơn hàng thành công",
                data: order,
            });
        }

        // Handle other failure cases
        await Order.deleteOne({ _id: orderId });
        return res.status(402).json({
            success: false,
            message: "Giao dịch không thành công",
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: "Thông tin đặt hàng không tồn tại",
            error: error.message,
        });
    }
};

export const orderStripeReturn = async (req, res) => {
    try {
        const { stripeSessionId, orderSessionId } = req.query;

        if (!stripeSessionId && !orderSessionId) {
            return res.status(400).json({
                success: false,
                message: "Đã xảy ra lỗi khi xử lý thông tin đặt hàng",
            });
        }

        if (stripeSessionId && !orderSessionId) {
            const order = await Order.findOne({ stripeSessionId }).lean();
            if (order) {
                return res.status(200).json({
                    success: true,
                    message: "Thanh toán đơn hàng thành công",
                    data: order,
                });
            }
        }

        if (orderSessionId) {
            await OrderSession.deleteOne({ _id: orderSessionId });
        }

        return res.status(404).json({
            success: false,
            message: "Thanh toán Stripe thất bại, vui lòng thử lại",
        });
    } catch (error) {
        console.error("Lỗi xử lý đơn hàng Stripe:", error);
        res.status(500).json({
            success: false,
            message: "Đã xảy ra lỗi khi xử lý thông tin đặt hàng",
            error: error.message,
        });
    }
};

export const updateOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, note, phone, address, name } = req.body;
        let updateFields = {};
        if (status) updateFields.status = status;
        if (note) updateFields.note = note;
        if (phone) updateFields.phone = phone;
        if (address) updateFields.address = address;
        if (name) updateFields.name = name;

        const updatedOrder = await Order.findOneAndUpdate(
            { _id: id },
            { $set: updateFields },
            { new: true, runValidators: true }
        );

        if (!updatedOrder) {
            return res.status(404).json({
                success: false,
                message: "Đơn hàng không tồn tại",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Cập nhật đơn hàng thành công",
            data: updatedOrder,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Có lỗi xảy ra khi cập nhật đơn hàng",
            error: error.message,
        });
    }
};

export const getOrderByCustomer = async (req, res) => {
    try {
        const user = req.user;
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 10;
        const { status } = req.query;
        const skip = (page - 1) * pageSize;

        let statusCondition;
        if (status === "pending") {
            statusCondition = "pending";
        } else {
            statusCondition = status;
        }

        const [orders, total, counts] = await Promise.all([
            Order.find({ user: user._id, status: statusCondition })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(pageSize)),
            Order.countDocuments({ user: user._id, status: statusCondition }),
            Order.aggregate([
                { $match: { user: user._id } },
                { $group: { _id: "$status", count: { $sum: 1 } } },
            ]),
        ]);

        const statusCounts = {
            pending: 0,
            processing: 0,
            shipping: 0,
            delivered: 0,
            cancelled: 0,
        };

        counts.forEach((item) => {
            statusCounts[item._id] = item.count;
        });

        return res.status(200).json({
            success: true,
            data: orders,
            pagination: {
                page: Number(page),
                totalPage: Math.ceil(total / pageSize),
                totalItems: total,
                pageSize,
            },
            statusCounts,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message,
        });
    }
};

export const getOrderByAdmin = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 10;
        const { status, customerName, fromDate, toDate, paymentMethod } = req.query;
        const skip = (page - 1) * pageSize;

        let filter = {};

        if (status) {
            filter.status = status;
        }

        if (customerName) {
            filter.name = { $regex: customerName, $options: "i" };
        }

        if (fromDate && toDate) {
            filter.createdAt = {
                $gte: new Date(fromDate),
                $lte: new Date(toDate),
            };
        } else if (fromDate) {
            filter.createdAt = { $gte: new Date(fromDate) };
        } else if (toDate) {
            filter.createdAt = { $lte: new Date(toDate) };
        }

        if (paymentMethod) {
            filter.paymentMethod = paymentMethod;
        }

        const [orders, total] = await Promise.all([
            Order.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(pageSize))
                .populate("user", "name email"),
            Order.countDocuments(filter),
        ]);

        res.status(200).json({
            success: true,
            data: orders,
            pagination: {
                page: page,
                totalPage: Math.ceil(total / pageSize),
                totalItems: total,
                pageSize: pageSize,
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message,
            data: [],
        });
    }
};

export const removeOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedOrder = await Order.findByIdAndDelete(id);
        if (!deletedOrder) {
            return res.status(404).json({
                success: false,
                message: "Đơn hàng không tồn tại",
            });
        }
        res.status(200).json({
            success: true,
            message: "Xóa đơn hàng thành công",
            data: deletedOrder,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message,
        });
    }
};

export const getOrderDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const order = await Order.findById(id).populate("userId", "name email");
        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Đơn hàng không tồn tại",
            });
        }
        res.status(200).json({
            success: true,
            data: order,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message,
        });
    }
};

export const createOrderSession = async (req, res) => {
    try {
        const user = req.user;
        const orderSessionData = {
            user: user._id,
            name: req.body.name,
            products: req.body.products,
            phone: req.body.phone,
            address: req.body.address,
            province: req.body.province,
            district: req.body.district,
            ward: req.body.ward,
            paymentMethod: req.body.paymentMethod,
            totalAmount: req.body.totalAmount,
            note: req.body.note || "KHÔNG CÓ",
        };
        const orderSession = await OrderSession.create(orderSessionData);
        if (!orderSession) {
            return res
                .status(500)
                .json({ success: false, message: "Có lỗi xảy ra khi đặt hàng" });
        }
        return res.status(200).json({
            success: true,
            data: orderSession._id,
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: "Có lỗi xảy ra khi đặt hàng",
            error: error.message,
        });
    }
};

export const handleSepayWebhook = async (req, res) => {
    try {
        const data = req.body;
        if (!data) return;

        const orderSessionId = data.content.split(" ")[0];
        console.log({ data });
        console.log({ orderSessionId });

        if (!orderSessionId) return;

        const orderSession = await OrderSession.findOne(
            { _id: orderSessionId },
            { projection: { __v: 0, createdAt: 0, updatedAt: 0 } }
        ).lean();

        const orderData = { ...orderSession };
        delete orderData._id;

        const newOrder = await Order.create(orderData);
        await OrderSession.deleteOne({ _id: orderSessionId });

        console.log({ newOrder });

        io.emit("paymentSuccess", orderSessionId);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: error.message });
    }
};