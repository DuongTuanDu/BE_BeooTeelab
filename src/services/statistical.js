import Order from "../models/order.model.js";
import Product from "../models/product.model.js";
import User from "../models/user.model.js";
import moment from "moment";

export const statisticalDashboard = async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments();
    const totalProducts = await Product.countDocuments();
    const totalCustomers = await User.countDocuments();

    const totalOrderAmount = await Order.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: "$totalAmount" },
        },
      },
    ]);

    const vietnamTz = "Asia/Ho_Chi_Minh";
    const currentYear = moment().tz(vietnamTz).year();
    const startOfYear = moment()
      .tz(vietnamTz)
      .year(currentYear)
      .startOf("year")
      .toDate();
    const endOfYear = moment()
      .tz(vietnamTz)
      .year(currentYear)
      .endOf("year")
      .toDate();

    const sampleOrder = await Order.findOne({
      createdAt: { $gte: startOfYear, $lte: endOfYear },
    }).lean();

    const monthlyRevenue = await Order.aggregate([
      {
        $match: {
          createdAt: {
            $gte: startOfYear,
            $lte: endOfYear,
            $type: "date",
          },
        },
      },
      {
        $group: {
          _id: { $month: "$createdAt" },
          revenue: { $sum: "$totalAmount" },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    const allMonthsRevenue = Array.from({ length: 12 }, (_, index) => ({
      _id: index + 1,
      revenue: 0,
    }));

    monthlyRevenue.forEach((month) => {
      allMonthsRevenue[month._id - 1].revenue = month.revenue;
    });

    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    const invalidDateOrders = await Order.find({
      $or: [
        { createdAt: { $exists: false } },
        { createdAt: null },
        { createdAt: { $type: "string" } },
      ],
    })
      .limit(5)
      .lean();

    const topSellingProducts = await Order.aggregate([
      { $unwind: "$products" },
      {
        $group: {
          _id: "$products.productId",
          totalSold: { $sum: "$products.quantity" },
        },
      },
      {
        $sort: { totalSold: -1 },
      },
      {
        $limit: 5,
      },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "productInfo",
        },
      },
      {
        $unwind: "$productInfo",
      },
      {
        $project: {
          _id: 1,
          name: "$productInfo.name",
          totalSold: 1,
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      data: {
        totalOrders,
        totalProducts,
        totalCustomers,
        totalOrderAmount: totalOrderAmount[0]?.total || 0,
        monthlyRevenue: allMonthsRevenue,
        topSellingProducts,
      },
    });
  } catch (error) {
    console.error("Error in statisticalDashboard:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
      data: {},
    });
  }
};