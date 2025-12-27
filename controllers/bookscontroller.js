const path = require("path");
const dotenv = require("dotenv");
const { Resend } = require("resend");
const User = require("../models/user");
const Prints = require("../models/prints");
const cloudinary = require("cloudinary");
const streamifier = require("streamifier");

dotenv.config();

// Configure Cloudinary
cloudinary.v2.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// Upload buffer to Cloudinary
const uploadToCloudinary = async (buffer, folderName) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.v2.uploader.upload_stream(
      { folder: folderName, resource_type: "auto" },
      (error, result) => (error ? reject(error) : resolve(result))
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
};

exports.orderPrint = async (req, res) => {
  try {
    console.log("DEBUG req.files:", Object.keys(req.files || {}));

    const userId = req.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const {
      name,
      mobile,
      color,
      sides,
      address,
      originalprice,
      discountprice,
      rollno,
      college,
      year,
      section,
      description,
      binding,
      copies,
      payment,
    } = req.body;

    if (!color || !sides)
      return res.status(400).json({ message: "Required fields missing" });

    if (!req.files?.file?.[0])
      return res.status(400).json({ message: "Print PDF file is required" });

    if (!payment)
      return res.status(400).json({ message: "Payment method is required" });

    const MAX_SIZE = 10 * 1024 * 1024;

    const pdfFile = req.files.file[0];
    if (pdfFile.size > MAX_SIZE)
      return res.status(400).json({ message: "PDF file must be under 10MB" });

    const uploadedPrint = await uploadToCloudinary(
      pdfFile.buffer,
      "PrintOrders"
    );

    let uploadedTransaction = null;
    if (payment === "UPI") {
      if (!req.files?.transctionid?.[0]) {
        return res
          .status(400)
          .json({ message: "Transaction screenshot required" });
      }

      const trxFile = req.files.transctionid[0];
      if (trxFile.size > MAX_SIZE)
        return res
          .status(400)
          .json({ message: "Transaction image must be under 10MB" });

      uploadedTransaction = await uploadToCloudinary(
        trxFile.buffer,
        "Transactions"
      );
    }

    const newOrder = new Prints({
      name,
      mobile,
      file: uploadedPrint.secure_url,
      originalprice,
      discountprice,
      color,
      sides,
      binding,
      copies,
      address,
      college,
      year,
      section,
      rollno,
      description,
      payment,
      transctionid: uploadedTransaction ? uploadedTransaction.secure_url : "",
      userid: userId,
    });

    await newOrder.save();

    // Admin email
    await resend.emails.send({
      from: "MyBookHub Admin <onboarding@resend.dev>",
      to: "printkart0001@gmail.com",
      subject: "🖨️ New Print Order Placed - MyBookHub",
      html: `
        <h2>New Print Order</h2>
        <p><b>User:</b> ${user.fullname}</p>
        <p><b>Name:</b> ${name}</p>
        <p><b>Mobile:</b> ${mobile}</p>
        <p><b>Payment:</b> ${payment}</p>
        <p><a href="${uploadedPrint.secure_url}">View Print File</a></p>
        ${
          uploadedTransaction
            ? `<p><a href="${uploadedTransaction.secure_url}">View Transaction</a></p>`
            : ""
        }
      `,
    });

    // User email
    await resend.emails.send({
      from: "MyBookHub Orders <onboarding@resend.dev>",
      to: user.email,
      subject: "📦 Print Order Confirmation",
      html: `
        <h2>Hello ${user.fullname},</h2>
        <p>Your print order has been received.</p>
        <p><b>Price:</b> ₹${discountprice}</p>
        <p>We will notify you when it is ready.</p>
        <br/>
        <b>MyBookHub Team</b>
      `,
    });

    res.status(201).json({
      message: "Order placed successfully",
      order: newOrder,
    });
  } catch (error) {
    console.error("Order error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
