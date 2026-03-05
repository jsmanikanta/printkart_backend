const User = require("../models/user");
const Sellbooks = require("../models/sellbooks");
const mongoose = require("mongoose");

exports.getBookById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid book ID",
      });
    }

    const book = await Sellbooks.findById(id).populate(
      "user",
      "fullname email mobileNumber",
    );

    if (!book) {
      return res.status(404).json({
        success: false,
        message: "Book not found",
      });
    }

    return res.status(200).json({
      success: true,
      book,
    });
  } catch (error) {
    console.error("getBookById error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

exports.getAllBooks = async (req, res) => {
  try {
    const books = await Sellbooks.find({})
      .populate("user", "fullname email mobileNumber")
      .sort({ date_added: -1 });

    return res.json({
      success: true,
      total: books.length,
      books,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

exports.getBooksByFilter = async (req, res) => {
  try {
    const { categeory, subcategeory, location } = req.query;

    const filter = {};

    if (categeory && categeory.trim()) {
      filter.categeory = categeory.trim();
    }

    if (subcategeory && subcategeory.trim()) {
      filter.subcategeory = subcategeory.trim();
    }

    if (location && location.trim()) {
      filter.location = {
        $regex: location.trim(),
        $options: "i",
      };
    }

    const books = await Sellbooks.find(filter)
      .populate("user", "fullname email mobileNumber")
      .sort({ date_added: -1 });

    return res.json({
      success: true,
      total: books.length,
      books,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};
