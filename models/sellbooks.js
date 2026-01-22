const mongoose = require("mongoose");

const sellbooksschema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  image: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  condition: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  location: {
    type: String,
    required: true,
  },
  categeory: {
    type: String,
    enum:[
  "Class 12",
  "Class 11",
  "Class 10",
  "Class 9",
  "Class 1-8"
],
    required: true,
  },
  subcategeory: {
    type: String,
    "School Books": [
      "NCERT Books",
      "State Board Books",
      "CBSE Books",
      "Sample Papers & Workbook",
      "English Medium Textbooks",
      "Telugu Medium Textbooks",
      "Hindi Medium Textbooks",
    ],
    "College & University Books": [
  "B.A",
  "B.COM",
  "B.SC",
  "B.TECH",
  "BCA",
  "BBA",
  "LLB",
  "MBBS",
  "M.A",
  "M.COM",
  "M.SC",
  "M.TECH",
  "MCA",
  "MBA",
  "MD/MS",
  "LLM",
  "Certificate",
  "Diploma",
  "MPhil/PhD",
  "Others"
],
    "Competitive Exam Books": [
  "IIT JEE",
  "NEET",
  "UPSC",
  "SSC",
  "GATE",
  "NDA",
  "CAT",
  "CUET",
  "BITSAT",
  "CLAT",
  "State PCS",
  "IELTS/ TOEFL",
  "Others"
],
    "Fictional Books": [
  "Manga",
  "Children books",
  "Picture books",
  "Romance",
  "Fantasy",
  "Science Fiction",
  "Mystery",
  "Horror",
  "Thriller",
  "Action & Adventure",
  "Young adult",
  "Historical Fiction"
],
    "Non-Fiction Books": [
  "Self-Help",
  "Biographies",
  "Business & Finance",
  "Health",
  "History & Humanities",
  "Language Learning",
  "Lifestyle",
  "Cooking, Food & Wine",
  "Music",
  "Personal & Social Issues",
  "Religion",
  "Sports",
  "Transportation & Travel",
  "Dictionary",
  "Encyclopedia"
],
  },
  selltype: {
    type: String,
    enum: ["sell", "donate"],
    required: true,
  },
  status: {
    type: String,
    enum: ["Pending", "Accepted", "Rejected"],
    default: "Pending",
  },
  updatedPrice: {
    type: Number,
  },
  soldstatus: {
    type: String,
    enum: ["Instock", "Soldout", "Orderd"],
    default: "Instock",
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    required: true,
  },
  date_added: { type: Date, default: Date.now },
});

const Sellbooks = mongoose.model("Sellbooks", sellbooksschema);
module.exports = Sellbooks;
