const express = require('express');
const router = express.Router();
const { getMastersByType, createMaster } = require('../controllers/masterController');

// Route to create a new master
// e.g., POST /api/masters
router.post('/', createMaster);

// Route to get all masters of a specific type
// e.g., GET /api/masters/sale_series
// IMPORTANT: This route must come AFTER the more specific POST route.
router.get('/:type', getMastersByType);

module.exports = router;
