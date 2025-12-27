const express = require('express');
const { getPreviousYears } = require('../controllers/previous'); 
const { verifyToken } = require("../verifyToken");
const router = express.Router();

router.get('/previous-years', getPreviousYears,verifyToken);

module.exports = router;
