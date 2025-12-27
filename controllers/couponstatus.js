// controllers/couponController.js
const mongoose = require("mongoose");
const Couponstatus = require("../models/coupon");

const verifyCoupon = async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        error: "Database not ready",
      });
    }

    const userId = req.user && req.user.id;
    const { code } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "User not authenticated",
      });
    }

    if (!code || !code.trim()) {
      return res.status(400).json({
        success: false,
        error: "Coupon code is required",
      });
    }

    const couponCode = code.trim().toUpperCase();

    // 1) Find coupon document in couponCodes and check global limit
    const couponDoc = await mongoose
      .connection
      .collection("couponCodes")
      .findOne({ code: couponCode });

    if (!couponDoc) {
      return res.status(404).json({
        success: false,
        status: "invalid",
        error: "Coupon code not found",
      });
    }

    const discount = couponDoc.discount; // percentage
    const limit = couponDoc.limit ?? Infinity;
    const used = couponDoc.used ?? 0;

    // If global usage limit reached
    if (used >= limit) {
      return res.status(400).json({
        success: false,
        status: "invalid",
        error: "Coupon usage limit reached",
      });
    }

    // 2) Check if this user already used this coupon
    const existingStatus = await Couponstatus.findOne({
      userid: userId,
      code: couponCode,
    });

    if (existingStatus && existingStatus.status === true) {
      return res.status(200).json({
        success: true,
        status: "used",
        message: "Coupon already used by this user",
        data: {
          code: couponCode,
          discountPercentage: existingStatus.discountPercentage,
          usedDate: existingStatus.usedDate,
        },
      });
    }

    // 3) Mark as used for this user AND increment global used count
    const now = new Date();

    if (!existingStatus) {
      await Couponstatus.create({
        userid: userId,
        code: couponCode,
        status: true,
        discountPercentage: discount,
        usedDate: now,
      });
    } else {
      existingStatus.status = true;
      existingStatus.discountPercentage = discount;
      existingStatus.usedDate = now;
      await existingStatus.save();
    }

    // increment "used" in couponCodes
    await mongoose
      .connection
      .collection("couponCodes")
      .updateOne(
        { _id: couponDoc._id },
        { $inc: { used: 1 } }
      );

    return res.status(200).json({
      success: true,
      status: "available", 
      message: "Coupon applied successfully",
      data: {
        code: couponCode,
        discountPercentage: discount,
        usedDate: now,
      },
    });
  } catch (err) {
    console.error("Error verifying coupon:", err);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

module.exports = { verifyCoupon };
