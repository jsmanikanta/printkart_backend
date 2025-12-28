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
    // Handle BOTH old (userid) AND new (user) books
    const books = await Sellbooks.find()
      .populate({
        path: "user",
        select: "fullname email mobileNumber"
      })
      .populate({
        path: "userid", 
        select: "fullname email mobileNumber"
      })
      .sort({ date_added: -1 });

    const formattedBooks = books.map((book) => {
      // Try user first, then userid fallback
      const userData = book.user || book.userid;
      
      return {
        _id: book._id,
        name: book.name || "-",
        image: book.image || "-",
        status: book.status || "Pending",
        price: book.price ?? "-",
        updatedPrice: book.updatedPrice ?? "-",
        condition: book.condition || "-",
        description: book.description || "-",
        location: book.location || "-",
        category: book.category || book.categeory || "-",  // Handle both
        subcategory: book.subcategory || book.subcategeory || "-",  // Handle both
        selltype: book.selltype || "-",
        soldstatus: book.soldstatus || "Instock",
        userFullName: userData?.fullname || "-",
        userEmail: userData?.email || "-",
        userMobile: userData?.mobileNumber || "-",
        date_added: book.date_added,
      };
    });

    res.status(200).json({
      success: true,
      count: formattedBooks.length,
      books: formattedBooks
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
    if (stockStatus !== undefined) book.soldstatus = stockStatus;

    await book.save();

    // Return with populated user
    const updatedBook = await Sellbooks.findById(bookId)
      .populate("user", "fullname email mobileNumber")
      .populate("userid", "fullname email mobileNumber");

    const userData = updatedBook.user || updatedBook.userid;
    
    res.status(200).json({
      success: true,
      message: `Book ${status.toLowerCase()}d`,
      book: {
        ...updatedBook.toObject(),
        userFullName: userData?.fullname || "-",
        userEmail: userData?.email || "-",
        userMobile: userData?.mobileNumber || "-",
      }
    });
  } catch (error) {
    console.error("Update error:", error);
    res.status(500).json({ error: "Server error" });
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
