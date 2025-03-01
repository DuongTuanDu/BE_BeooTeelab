import Order from "../models/order.model.js";

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