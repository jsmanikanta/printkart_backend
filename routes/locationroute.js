import express from "express";
import { verifyToken } from "../verifyToken.js";
import locationcontrol from "../controllers/locationcontroller.js";

const router = express.Router();

router.post("/add-location",verifyToken,locationcontrol.addLocation);
router.get("/mylocations",verifyToken,locationcontrol.getLocationsbyId);

module.exports = router;
