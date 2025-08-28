const prints = require("../models/prints");

const getAllOrders = async (req, res) => {
  try {
    const orders = await prints.find().populate("userid");
    res.status(200).json({
      success: true,
      orders,
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching orders",
    });
  }
};

module.exports = { getAllOrders };
