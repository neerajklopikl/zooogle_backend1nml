const express = require('express');
const router = express.Router();
const { getIndianStates } = require('../controllers/dataController');

// Route to get the list of Indian states
// e.g., GET /api/data/states
router.get('/states', getIndianStates);

module.exports = router;
