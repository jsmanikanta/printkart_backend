const Prints = require("../models/prints");

// Get all orders for admin view
const getAllOrders = async (req, res) => {
  try {
    const orders = await Prints.find()
      .sort({ orderDate: -1 })
      .populate("userid", "fullname email mobileNumber");

    res.status(200).json({
      orders: orders.map((order) => ({
        _id: order._id,
        fullName:
          order.fullName || (order.userid && order.userid.fullname) || "-",
        email: order.email || (order.userid && order.userid.email) || "-",
        mobile:
          order.mobile || (order.userid && order.userid.mobileNumber) || "-",
        file: order.file,
        color: order.color,
        sides: order.sides,
        binding: order.binding || "none",
        copies: order.copies,
        college: order.college || "-",
        year: order.year || "-",
        section: order.section || "-",
        address: order.address,
        description: order.description || "-",
        transctionid: order.transctionid,
        orderDate: order.orderDate,
        status: order.status || "Pending",
      })),
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getOrderById = async (req, res) => {
  const { orderId } = req.params;
  try {
    const order = await Prints.findById(orderId).populate(
      "userid",
      "fullname email mobileNumber"
    );
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }
    res.status(200).json({
      id: order._id,
      name: order.name,
      email: order.email,
      mobile: order.mobile,
      file: order.file,
      color: order.color,
      sides: order.sides,
      delivery: order.delivery,
      address: order.address,
      college: order.college,
      year: order.year,
      section: order.section,
      description: order.description,
      orderDate: order.orderDate,
      transctionid: order.transctionid,
      binding: order.binding || "none",
      status: order.status || "Pending",
      copies: order.copies,
      user: order.userid
        ? {
            id: order.userid._id,
            fullname: order.userid.fullname,
            email: order.userid.email,
            mobileNumber: order.userid.mobileNumber,
          }
        : null,
    });
  } catch (error) {
    console.error("Error fetching order details:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = { getAllOrders, getOrderById };
