// controllers/couponController.js
const mongoose = require("mongoose");
const Couponstatus = require("../models/Couponstatus");

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

    // 1) Check if coupon code exists in couponCodes collection
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

    const discount = couponDoc.discount;

    // 2) Check if user already has a status record for this coupon
    const existingStatus = await Couponstatus.findOne({
      userid: userId,
      code: couponCode,
    });

    // Already used
    if (existingStatus && existingStatus.status === true) {
      return res.status(200).json({
        success: true,
        status: "used",
        message: "Coupon already used by this user",
        data: {
          code: couponCode,
          discountPercentage: existingStatus.discountPercentage,
        },
      });
    }

    // Not used yet: create status record if missing
    if (!existingStatus) {
      await Couponstatus.create({
        userid: userId,
        code: couponCode,
        status: false,
        discountPercentage: discount,
        usedDate: null,
      });
    }

    return res.status(200).json({
      success: true,
      status: "available",
      message: "Coupon available to claim",
      data: {
        code: couponCode,
        discountPercentage: discount,
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
