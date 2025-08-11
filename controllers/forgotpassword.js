import bcrypt from "bcryptjs";
import User from "../models/user.js";

export const resetPasswordWithoutOTP = async (req, res) => {
  const { identifier, newPassword } = req.body;

  if (!identifier || !newPassword)
    return res.status(400).json({ error: "Identifier and new password are required" });

  try {
    let user;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^\d{10}$/;

    if (emailRegex.test(identifier)) {
      user = await User.findOne({ email: identifier });
    } else if (phoneRegex.test(identifier)) {
      user = await User.findOne({ mobileNumber: identifier });
    } else {
      return res.status(400).json({ error: "Invalid email or phone number format" });
    }

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.status(200).json({ message: "Password reset successful without OTP/token" });
  } catch (error) {
    console.error("Error resetting password without OTP:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
