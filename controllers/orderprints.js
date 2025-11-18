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
      transctionid,
      payment,
    } = req.body;

    if (!color || !sides)
      return res.status(400).json({ message: "Required fields missing" });

    if (!req.files?.file?.[0])
      return res.status(400).json({ message: "Print PDF file is required" });

    if (!req.files?.transctionid?.[0])
      return res.status(400).json({ message: "Transaction image is required" });

    // Upload files to Cloudinary
    const uploadedPrint = await uploadToCloudinary(
      req.files.file[0].buffer,
      "PrintOrders"
    );
    const uploadedTransaction = await uploadToCloudinary(
      req.files.transctionid[0].buffer,
      "Transactions"
    );

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
      transctionid: uploadedTransaction.secure_url,
      userid: userId,
    });

    await newOrder.save();

    // Send email to admin first
    const adminEmail = await resend.emails.send({
      from: "MyBookHub Admin <onboarding@resend.dev>",
      to: "printkart0001@gmail.com",
      subject: "🖨️ New Print Order Placed - MyBookHub",
      html: `
    <h2>New print order placed by ${user.fullname}</h2>
    <p><b>Transaction ID:</b> ${transctionid}</p>
    <p><b>Order ID:</b> ${newOrder._id}</p>
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
      <li><b>College Info:</b> ${newOrder.college}, ${newOrder.year}, ${
        newOrder.section
      }, ${newOrder.rollno}</li>
      <li><b>Description:</b> ${newOrder.description || "N/A"}</li>
    </ul>
    <li><b>Mode of payment :</b> ${newOrder.payment}</li>
    <p><b>Order Date:</b> ${newOrder.orderDate.toLocaleString()}</p>
    <p>🧾 <a href="${
      uploadedPrint.secure_url
    }" target="_blank">View Print File</a></p>
    <p>💳 <a href="${
      uploadedTransaction.secure_url
    }" target="_blank">View Transaction</a></p>
  `,
    });

    console.log("✅ Admin email sent:", adminEmail);

    // ⏳ Add a small delay before sending the user email
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Send confirmation email to the user
    const userEmail = await resend.emails.send({
      from: "MyBookHub Orders <onboarding@resend.dev>",
      to: user.email,
      subject: "📦 Your Print Order Confirmation - MyBookHub",
      html: `
    <h2>Hello ${user.fullname},</h2>
    <p>Thank you for placing a print order with <b>MyBookHub</b>!</p>
    <p>Here are your order details:</p>
    <ul>
      <li><b>Color:</b> ${newOrder.color}</li>
      <li><b>Sides:</b> ${newOrder.sides}</li>
      <li><b>Binding:</b> ${newOrder.binding}</li>
      <li><b>Copies:</b> ${newOrder.copies}</li>
      <li><b>Offer Price:</b> ₹${newOrder.discountprice}</li>
      <li><b>Order Date:</b> ${newOrder.orderDate.toDateString()}</li>
    </ul>
    <p>Your order is being processed and will be delivered soon.</p>
    <p>Best regards,<br/><b>MyBookHub Team</b></p>
  `,
    });

    console.log("✅ User email sent:", userEmail);

    res
      .status(201)
      .json({ message: "Order placed successfully", order: newOrder });
  } catch (error) {
    console.error("Error placing order:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
