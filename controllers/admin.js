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

// Get all books with user details
const getAllBooks = async (req, res) => {
  try {
    const books = await Sellbooks.find()
      .populate({
        path: "user",
        select: "fullname email mobileNumber",  // ✅ Exact User fields
      })
      .sort({ date_added: -1 })
      .lean();  // ✅ Faster queries

    const formattedBooks = books.map((book) => ({
      _id: book._id,
      name: book.name || "-",
      image: book.image || "-",
      status: book.status,
      price: book.price ?? "-",
      updatedPrice: book.updatedPrice ?? "-",
      condition: book.condition || "-",
      description: book.description || "-",
      location: book.location || "-",
      category: book.category || "-",  // ✅ Fixed field name
      subcategory: book.subcategory || "-",
      selltype: book.selltype || "-",
      soldstatus: book.soldstatus || "Instock",
      userFullName: book.user?.fullname || "-",
      userEmail: book.user?.email || "-",
      userMobile: book.user?.mobileNumber || "-",
      date_added: book.date_added,
      createdAt: book.createdAt,
      updatedAt: book.updatedAt,
    }));

    res.status(200).json({
      success: true,
      count: formattedBooks.length,
      books: formattedBooks,
    });
  } catch (error) {
    console.error("Error fetching books:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

// Update book status & stock
const updateStatus = async (req, res) => {
  try {
    const { bookId } = req.params;
    const { status, sellingPrice, stockStatus } = req.body;

    // Validate status
    if (!["Accepted", "Rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        error: "Status must be 'Accepted' or 'Rejected'",
      });
    }

    // Validate stockStatus
    if (stockStatus && !["Instock", "Soldout", "Ordered", "Rejected"].includes(stockStatus)) {
      return res.status(400).json({
        success: false,
        error: "Invalid stock status",
      });
    }

    const book = await Sellbooks.findById(bookId);
    if (!book) {
      return res.status(404).json({
        success: false,
        error: "Book not found",
      });
    }

    // Update fields
    book.status = status;
    if (sellingPrice !== undefined) book.updatedPrice = sellingPrice;
    if (stockStatus !== undefined) book.soldstatus = stockStatus;

    await book.save();

    // Repopulate user for response
    const updatedBook = await Sellbooks.findById(bookId)
      .populate("user", "fullname email mobileNumber")
      .lean();

    res.status(200).json({
      success: true,
      message: `Book ${status.toLowerCase()} successfully`,
      book: updatedBook,
    });
  } catch (error) {
    console.error("Error updating book:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

const getAllOrderedBooks = async (req, res) => {
  try {
    const orderedBooks = await OrderedBooks.find()
      .populate({
        path: "buyerid",
        select: "fullname email mobileNumber",
      })
      .populate({
        path: "bookid",
        select: "name description price updatedPrice condition user",
        populate: {
          path: "user",
          select: "fullname email mobileNumber",
        },
      })
      .sort({ date_added: -1 });

    const formattedOrders = orderedBooks.map((order) => ({
      orderId: order._id,
      buyer: order.buyerid,
      book: order.bookid,
      seller: order.bookid.user,
      review: order.review || "",
    }));

    res.status(200).json({ orderedBooks: formattedOrders });
  } catch (error) {
    console.error("Error in getAllOrderedBooksDetailed:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  getAllOrders,
  getAllBooks,
  updateStatus,
  getAllOrderedBooks,
  updatePrintStatus,
};
