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
        fullName: order.name || "-", // required field "name"
        mobile: order.mobile || "-", // required field "mobile"
        file: order.file || "-", // required field "file"
        color: order.color || "-", // required field "color"
        sides: order.sides || "-", // required field "sides"
        price: order.price !== undefined ? order.price : "-", // required "price"
        binding: order.binding || "none", // optional with default
        copies: order.copies !== undefined ? order.copies : 1, // required with default 1
        rollno: order.rollno || "-", // optional
        college: order.college || "-", // optional
        year: order.year || "-", // optional
        section: order.section || "-", // optional
        address: order.address || "-", // optional
        description: order.description || "-", // optional
        transactionId: order.transctionid || "", // required per schema
        orderDate: order.orderDate || null, // default Date.now in schema
        status: order.status || "Pending", // not in schema but used, fallback "Pending"
      })),
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getAllBooks = async (req, res) => {
  try {
    const books = await Sellbooks.find()
      .sort({ date_added: -1 })
      .populate("user", "fullname email mobileNumber");

    res.status(200).json({
      books: books.map((book) => ({
        _id: book._id,
        name: book.name || "-",
        image: book.image || "-",
        status: book.status,
        price: book.price !== undefined ? book.price : "-",
        updatedPrice: book.updatedPrice !== undefined ? book.updatedPrice : "-",
        condition: book.condition || "-",
        description: book.description || "-",
        location: book.location || "-",
        category: book.categeory || "-",
        subcategeory: book.subcategeory,
        selltype: book.selltype || "-",
        userFullName: book.user?.fullname || "-",
        userEmail: book.user?.email || "-",
        userMobile: book.user?.mobileNumber || "-",
        date_added: book.date_added,
      })),
    });
  } catch (error) {
    console.error("Error fetching books:", error);
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
      book.updatedPrice = sellingPrice;
    }

    await book.save();
    return res
      .status(200)
      .json({ message: `Book ${status} successfully`, book });
  } catch (error) {
    console.error("Error updating book status and selling price:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const OrderedBooks = require("../models/orderedbooks");

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
};
