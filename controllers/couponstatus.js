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
    const { name, email, mobile } = req.user || {};
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
    const limit = couponDoc.limit ?? Infinity;
    const used = couponDoc.used ?? 0;
    
    if (used >= limit) {
      return res.status(400).json({
        success: false,
        status: "invalid",
        error: "Coupon expired",
      });
    }

    let existingStatus = await Couponstatus.findOne({
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
          user: {
            id: userId,
            name: existingStatus.userName,
            email: existingStatus.userEmail,
            mobile: existingStatus.userMobile,
          },
        },
      });
    }

    const now = new Date();

    if (!existingStatus) {
      existingStatus = await Couponstatus.create({
        userid: userId,
        code: couponCode,
        status: true,
        discountPercentage: discount,
        usedDate: now,
        userName: name,
        userEmail: email,
        userMobile: mobile,
      });

      await mongoose
        .connection
        .collection("couponCodes")
        .updateOne({ _id: couponDoc._id }, { $inc: { used: 1 } });
    } else {
      
      existingStatus.status = true;
      existingStatus.discountPercentage = discount;
      existingStatus.usedDate = now;
      existingStatus.userName = name;
      existingStatus.userEmail = email;
      existingStatus.userMobile = mobile;
      await existingStatus.save();

      await mongoose
        .connection
        .collection("couponCodes")
        .updateOne({ _id: couponDoc._id }, { $inc: { used: 1 } });
    }

    return res.status(200).json({
      success: true,
      status: "available",
      message: "Coupon applied successfully",
      data: {
        code: couponCode,
        discountPercentage: discount,
        usedDate: existingStatus.usedDate,
        user: {
          id: userId,
          name,
          email,
          mobile,
        },
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

