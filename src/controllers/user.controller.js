import User from "../models/user.model.js";

export const getAllUser = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 10;
        const { search } = req.query;
        const skip = (page - 1) * pageSize;
        let filter = {};
        if (search) {
            filter = {
                $or: [
                    { name: { $regex: search, $options: "i" } },
                    { email: { $regex: search, $options: "i" } },
                ],
            };
        }
        const [users, total] = await Promise.all([
            User.find(filter).select("-password").skip(skip).limit(pageSize).lean(),
            User.countDocuments(filter),
        ]);
        res.status(200).json({
            success: true,
            data: users,
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
            data: [],
            message: "Internal Server Error",
        });
    }
};

export const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, address, isActive } = req.body;

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy người dùng",
            });
        }

        if (name !== undefined) user.name = name;
        if (email !== undefined) user.email = email;
        if (address !== undefined) user.address = address;
        if (isActive !== undefined) user.isActive = isActive;

        await user.save();

        res.status(200).json({
            success: true,
            message: "Cập nhật thông tin người dùng thành công",
            data: user,
        });
    } catch (error) {
        console.error("Error in updateUser:", error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};