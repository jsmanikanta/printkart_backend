import path from "path";
import { Resend } from "resend";
import dotenv from "dotenv";
import User from "../models/user.js";
import Prints from "../models/prints.js";
import cloudinary from "cloudinary";
import streamifier from "streamifier";
dotenv.config();

// Configure Cloudinary
cloudinary.v2.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

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

export const orderPrint = async (req, res) => {
  try {
    // Debug: log files to see what's arriving
    console.log("DEBUG req.files:", Object.keys(req.files || {}));
    // files will be like: { file: [File], transctionid: [File] } if multer configured correctly

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
      payment, // expected "UPI" or "payondelivery"
      // NOTE: do NOT rely on req.body.transctionid for file URL
    } = req.body;

    // validations
    if (!color || !sides)
      return res.status(400).json({ message: "Required fields missing" });

    if (!req.files?.file?.[0])
      return res.status(400).json({ message: "Print PDF file is required" });

    if (!payment)
      return res.status(400).json({ message: "Payment method is required" });

    // SERVER-SIDE file size limits (10 MB)
    const MAX_SIZE = 10 * 1024 * 1024;
    const pdfFile = req.files.file[0];
    if (pdfFile.size > MAX_SIZE)
      return res.status(400).json({ message: "PDF file size must be less than 10MB" });

    // Upload print file
    const uploadedPrint = await uploadToCloudinary(pdfFile.buffer, "PrintOrders");
    if (!uploadedPrint?.secure_url)
      return res.status(500).json({ message: "Failed to upload print file" });

    // Process transaction screenshot (for UPI)
    let uploadedTransaction = null;
    if (payment === "UPI") {
      if (!req.files?.transctionid?.[0]) {
        return res.status(400).json({ message: "Transaction screenshot required for UPI" });
      }
      const trxFile = req.files.transctionid[0];
      if (trxFile.size > MAX_SIZE) {
        return res.status(400).json({ message: "Transaction screenshot must be less than 10MB" });
      }

      uploadedTransaction = await uploadToCloudinary(trxFile.buffer, "Transactions");
      if (!uploadedTransaction?.secure_url)
        return res.status(500).json({ message: "Failed to upload transaction screenshot" });
    }

    // Save order
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
      // store the uploaded image URL (empty string if not provided)
      transctionid: uploadedTransaction ? uploadedTransaction.secure_url : "",
      userid: userId,
    });

    await newOrder.save();

    // Email to Admin (use uploadedTransaction URL, not req.body.transctionid)
    const adminEmailHtml = `
      <h2>New print order placed by ${newOrder.name}</h2>
      <p>From the account ${user.fullname}</p>
      <h3>Order Details:</h3>
      <ul>
        <li><b>Name:</b> ${newOrder.name}</li>
        <li><b>Mobile:</b> ${newOrder.mobile}</li>
        <li><b>Color:</b> ${newOrder.color}</li>
        <li><b>Sides:</b> ${newOrder.sides}</li>
        <li><b>Binding:</b> ${newOrder.binding}</li>
        <li><b>Copies:</b> ${newOrder.copies}</li>
        <li><b>Original Price:</b> ${newOrder.originalprice}</li>
        <li><b>Offer Price:</b> ${newOrder.discountprice}</li>
        <li><b>Address:</b> ${newOrder.address}</li>
        <li><b>College Info:</b> ${newOrder.college}, ${newOrder.year}, ${newOrder.section}, ${newOrder.rollno}</li>
        <li><b>Description:</b> ${newOrder.description || "N/A"}</li>
        <li><b>Payment Mode:</b> ${newOrder.payment}</li>
      </ul>
      <p><b>Order Date:</b> ${newOrder.orderDate.toLocaleString()}</p>
      <p>📄 <a href="${uploadedPrint.secure_url}" target="_blank">View Print File</a></p>
      ${
        uploadedTransaction?.secure_url
          ? `<p>💳 <a href="${uploadedTransaction.secure_url}" target="_blank">View Transaction Screenshot</a></p>`
          : ""
      }
    `;

    await resend.emails.send({
      from: "MyBookHub Admin <onboarding@resend.dev>",
      to: "printkart0001@gmail.com",
      subject: "🖨️ New Print Order Placed - MyBookHub",
      html: adminEmailHtml,
    });

    // Email to user
    const userEmailHtml = `
      <h2>Hello ${user.fullname},</h2>
      <p>Thank you for placing a print order with <b>MyBookHub</b>!</p>
      <p>Your order is being processed.</p>
      <ul>
        <li><b>Color:</b> ${newOrder.color}</li>
        <li><b>Sides:</b> ${newOrder.sides}</li>
        <li><b>Binding:</b> ${newOrder.binding}</li>
        <li><b>Copies:</b> ${newOrder.copies}</li>
        <li><b>Offer Price:</b> ₹${newOrder.discountprice}</li>
        <li><b>Order Date:</b> ${newOrder.orderDate.toDateString()}</li>
      </ul>
      <p>We will notify you when it's ready!</p>
      <p>Regards,<br/><b>MyBookHub Team</b></p>
    `;

    await resend.emails.send({
      from: "MyBookHub Orders <onboarding@resend.dev>",
      to: user.email,
      subject: "📦 Your Print Order Confirmation - MyBookHub",
      html: userEmailHtml,
    });

    // Final response
    res.status(201).json({ message: "Order placed successfully", order: newOrder });
  } catch (error) {
    console.error("Error placing order:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

