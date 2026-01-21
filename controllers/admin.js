const Prints = require("../models/prints");
const mongoose = require("mongoose");
const Sellbooks = require("../models/sellbooks");
const OrderedBooks = require("../models/orderedbooks");

const getAllOrders = async (req, res) => {
  try {
    const orders = await Prints.find()
      .sort({ orderDate: -1 })
      .populate("userid", "fullname email mobileNumber");

    res.status(200).json({
      orders: orders.map((order) => ({
        _id: order._id,
        fullName: order.name || "-",
        mobile: order.mobile || "-",
        file: order.file || "-",
        color: order.color || "-",
        sides: order.sides || "-",
        originalprice:
          order.originalprice !== undefined ? order.originalprice : "-",
        discountprice:
          order.discountprice !== undefined
            ? order.discountprice
            : order.originalprice,
        binding: order.binding || "none",
        copies: order.copies !== undefined ? order.copies : 1,
        rollno: order.rollno || "-",
        college: order.college || "-",
        year: order.year || "-",
        section: order.section || "-",
        address: order.address || "-",
        description: order.description || "-",
        payment: order.payment || "-",
        transctionid: order.transctionid || "-",
        orderDate: order.orderDate || null,
        status: order.status || "Order placed",
        userid: order.userid || null,
      })),
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
const updatePrintStatus = async (req, res) => {
  const { orderId } = req.params;
  const { status, discountprice } = req.body;

  const validStatuses = [
    "Order placed",
    "Verified",
    "Ready to dispatch",
    "Out for delivery",
    "Delivered",
    "Cancelled"
  ];

  // Validate status
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: "Invalid status value" });
  }

  // Validate orderId format
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    return res.status(400).json({ error: "Invalid orderId format" });
  }

  try {
    const order = await Prints.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    order.status = status;
    if (discountprice !== undefined && !isNaN(discountprice)) {
      order.discountprice = discountprice;
    }

    await order.save();

    return res
      .status(200)
      .json({ message: "Print order updated successfully", order });
  } catch (error) {
    console.error("Error updating print order status:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
const getAllBooks = async (req, res) => {
  try {
    const books = await Sellbooks.find()
      .populate({
        path: "user",
        select: "fullname email mobileNumber",
      })
      .sort({ date_added: -1 })
      .lean();

    const formattedBooks = books.map((book) => ({
      _id: book._id,
      name: book.name || "-",
      image: book.image || "-",
      status: book.status || "Pending",
      price: book.price ?? "-",
      updatedPrice: book.updatedPrice ?? "-",
      condition: book.condition || "-",
      description: book.description || "-",
      location: book.location || "-",
      category: book.categeory || "-",
      subcategory: book.subcategeory || "-",
      selltype: book.selltype || "-",
      soldstatus: book.soldstatus || "Instock",
      userFullName: book.user?.fullname || "-",
      userEmail: book.user?.email || "-",
      userMobile: book.user?.mobileNumber || "-",
      userId: book.user?._id || "-",
      date_added: book.date_added,
    }));

    res.status(200).json({
      success: true,
      count: formattedBooks.length,
      books: formattedBooks,
    });
  } catch (error) {
    console.error("Admin books error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

const updateStatus = async (req, res) => {
  try {
    const { bookId } = req.params;
    const { status, sellingPrice, stockStatus } = req.body;

    if (!["Accepted", "Rejected"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const book = await Sellbooks.findById(bookId);
    if (!book) return res.status(404).json({ error: "Book not found" });

    book.status = status;
    if (sellingPrice !== undefined) book.updatedPrice = Number(sellingPrice);
    if (stockStatus !== undefined && ["Instock", "Soldout", "Orderd"].includes(stockStatus)) {
      book.soldstatus = stockStatus;
    }

    await book.save();

    // ✅ Return WITH populated user details
    const updatedBook = await Sellbooks.findById(bookId)
      .populate("user", "fullname email mobileNumber");

    res.status(200).json({
      success: true,
      message: `Book ${status.toLowerCase()}d successfully`,
      book: {
        _id: updatedBook._id,
        name: updatedBook.name,
        image: updatedBook.image,
        status: updatedBook.status,
        price: updatedBook.price,
        updatedPrice: updatedBook.updatedPrice,
        condition: updatedBook.condition,
        categeory: updatedBook.categeory, 
        subcategeory: updatedBook.subcategeory, 
        selltype: updatedBook.selltype,
        soldstatus: updatedBook.soldstatus,
        userFullName: updatedBook.user?.fullname || "-",
        userEmail: updatedBook.user?.email || "-",
        userMobile: updatedBook.user?.mobileNumber || "-",
        userId: updatedBook.user?._id || "-",
      }
    });
  } catch (error) {
    console.error("Update error:", error);
    res.status(500).json({ error: "Server error" });
  }
};


module.exports = {
  getAllOrders,
  updatePrintStatus,
  getAllBooks,
  updateStatus,
};
