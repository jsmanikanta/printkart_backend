<<<<<<< HEAD
const mongoose = require("mongoose");

const bookCategorySchema = new mongoose.Schema(
  {
    categeory: {
      type: String,
      default: "",
      trim: true,
    },
    subcategeory: {
      type: String,
      default: "",
      trim: true,
    },
    image: {
      type: String,
      required: true,
    },
    folderType: {
      type: String,
      enum: ["category", "subcategory"],
      required: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("BookCategory", bookCategorySchema);
=======
const mongoose = require("mongoose");

const bookCategorySchema = new mongoose.Schema(
  {
    categeory: {
      type: String,
      default: "",
      trim: true,
    },
    subcategeory: {
      type: String,
      default: "",
      trim: true,
    },
    image: {
      type: String,
      required: true,
    },
    folderType: {
      type: String,
      enum: ["category", "subcategory"],
      required: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("BookCategory", bookCategorySchema);
>>>>>>> 4e81323cd22d291208993d243c6528e215fc18a3
