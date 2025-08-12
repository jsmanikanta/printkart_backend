const User = require("./models/user");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const secretkey = process.env.secretkey;

const verifyToken = async (req, res, next) => {
  const token =
    req.headers.token ||
    (req.headers.authorization && req.headers.authorization.split(" ")[1]);

  if (!token) {
    return res.status(401).json({ error: "Token is required" });
  }

  try {
    const decoded = jwt.verify(token, secretkey);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    req.userId = user._id;
    next();
  } catch (error) {
    console.error(error);
    if (error.name === "TokenExpiredError") {
      return res
        .status(401)
        .json({ error: "Token expired, please login again" });
    }
    return res.status(403).json({ error: "Invalid or expired token" });
  }
};

module.exports = verifyToken;
