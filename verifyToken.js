import User from "./models/user.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

export const verifyToken = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token =
    req.headers.token || (authHeader && authHeader.split(" ")[1]);

  if (!token) {
    return res.status(401).json({ error: "Token is required" });
  }

  try {
    const secretkey = process.env.SECRETKEY;
    const decoded = jwt.verify(token, secretkey);

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    req.userId = user._id;
    req.user = user;

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res
        .status(401)
        .json({ error: "Token expired, please login again" });
    }

    return res.status(403).json({ error: "Invalid token" });
  }
};
