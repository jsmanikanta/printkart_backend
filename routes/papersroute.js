const express = require('express');
const { getPreviousYears } = require('../controllers/previous'); 

const router = express.Router();

router.get('/previous-years', getPreviousYears);

module.exports = router;
