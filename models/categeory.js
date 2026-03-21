import mongoose from "mongoose";

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
      trim: true,
    },
    folderType: {
      type: String,
      enum: ["category", "subcategory"],
      required: true,
    },
  },
  { timestamps: true }
);

const BookCategory =
  mongoose.models.BookCategory ||
  mongoose.model("BookCategory", bookCategorySchema);

export default BookCategory;
