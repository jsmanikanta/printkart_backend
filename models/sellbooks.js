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
    enum: [
      "School Books",
      "College & University Books",
      "Competitive Exam Books",
      "Fictional Books",
      "Novels & Storybooks",
      "Notes & Study Materials",
      "Previous Year Papers",
      "Non-Fiction Books",
      "others",
    ],
    required: true,
  },
  subcategeory: {
    type: String,
    "School Books": [
      "NCERT Books",
      "State Board Books ",
      "CBSE Books",
      "Sample Papers & Workbook",
      "English Medium Textbooks",
      "Telugu Medium Textbooks",
      "Hindi Medium Textbooks",
    ],
    "College & University Books": [
      "Engineering Books",
      "Medical Books",
      "Commerce & Management Books",
      "Arts & Humanities Books",
      "Science & Technology Books",
      "Semester-wise Guides",
      "University Question Banks",
      "Reference & Research Material",
    ],
    "Competitive Exam Books": [
      "UPSC Exam Preparation",
      "SSC Exams",
      "Banking Exams (IBPS, SBI PO)",
      "Railway Exams",
      "Teaching & TET Exams",
      "Defence Exams (NDA, CDS)",
      "State PSCs (MPPSC, UPPSC etc.)",
      "Mock Tests & Practice Papers",
    ],
    "Fictional Books": [
      "Contemporary Fiction",
      "Historical Fiction",
      "Mythological Fiction",
      "Mystery & Thriller",
      "Fantasy & Sci-Fi",
      "Romance",
      "Short Stories & Novellas",
      "Classics & Translations",
    ],
    "Novels & Storybooks": [
      "Indian English Novels",
      "Regional Language Novels",
      "Mythology & Epics",
      "Children’s Storybooks",
      "Young Adult Novels",
      "Biographies & Memoirs",
      "Literary Award Winners",
      "Book Series",
    ],
    "Notes & Study Materials": [
      "Handwritten Notes",
      "Printed Study Guides",
      "Previous Year Question Papers",
      "Model Answers",
      "Lecture Notes & Summaries",
      "Topic Wise Practice Sets",
      "Solved Examples",
      "Sample Question Papers",
    ],
    "Previous Year Papers": [
      "UPSC Previous Papers",
      "SSC Exam Past Papers",
      "Bank Exam Previous Papers",
      "State-Level Exams Papers",
      "University Exam Papers",
      "IIT JEE Question Papers",
      "Medical Entrance Previous Papers",
      "NET/SLET Previous Question Papers",
    ],
    "Non-Fiction Books": [
      "Biography & Autobiography",
      "Self-Help & Motivational",
      "Indian History & Culture",
      "Politics & Current Affairs",
      "Religion & Philosophy",
      "Science & Technology",
      "Travel & Exploration",
      "Cookbooks & DIY",
    ],
  },
  selltype: {
    type: String,
    enum: ["sell", "donate"],
    required: true,
  },

  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
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
});

const Sellbooks = mongoose.model("Sellbooks", sellbooksschema);
module.exports = Sellbooks;
