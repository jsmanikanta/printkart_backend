const Prints = require("../models/prints");
const Sellbooks = require("../models/sellbooks");

const getAllOrders = async (req, res) => {
  try {
    const orders = await Prints.find()
      .sort({ orderDate: -1 })
      .populate("userid", "fullname email mobileNumber");

    res.status(200).json({
      orders: orders.map((order) => ({
        _id: order._id,
        fullName: order.userid?.fullname || order.name || "-",
        email: order.userid?.email || order.email || "-",
        mobile: order.userid?.mobileNumber || order.mobile || "-",
        file: order.file,
        color: order.color,
        sides: order.sides,
        binding: order.binding || "none",
        copies: order.copies,
        college: order.college || "-",
        year: order.year || "-",
        section: order.section || "-",
        address: order.address || "-",
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

const getAllBooks = async (req, res) => {
  try {
    const orders = await Prints.find()
      .sort({ orderDate: -1 })
      .populate("userid", "fullname email mobileNumber");

    res.status(200).json({
      orders: orders.map((order) => ({
        _id: order._id,
        fullName: order.userid?.fullname || order.name || "-",
        email: order.userid?.email || order.email || "-",
        mobile: order.userid?.mobileNumber || order.mobile || "-",
        file: order.file,
        color: order.color,
        sides: order.sides,
        binding: order.binding || "none",
        copies: order.copies,
        college: order.college || "-",
        year: order.year || "-",
        section: order.section || "-",
        address: order.address || "-",
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



const updateStatus = async (req, res) => {
  const { bookId } = req.params;
  const { status, sellingPrice } = req.body;

  try {
    if (!["Accepted", "Rejected"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const book = await Sellbooks.findById(bookId);
    if (!book) {
      return res.status(404).json({ error: "Book not found" });
    }

    book.status = status;
    if (sellingPrice !== undefined) {
      book.updatedPrice = sellingPrice; // Only update updatedPrice
    }

    await book.save();
    return res.status(200).json({ message: `Book ${status} successfully`, book });
  } catch (error) {
    console.error("Error updating book status and selling price:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};


module.exports = { getAllOrders, getAllBooks, updateStatus };
