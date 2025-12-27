const express = require('express');
const { getPreviousYears } = require('../controllers/previousYearsController'); // Adjust path as needed

const router = express.Router();

router.get('/previous-years', getPreviousYears);

module.exports = router;
