const express = require('express');
const router = express.Router();
const { getHsnSacCodes } = require('../controllers/hsnSacController');

// This line creates the API endpoint. When a GET request is made to '/api/hsn-sac/',
// it will execute the getHsnSacCodes function from the controller.
router.get('/', getHsnSacCodes);

module.exports = router;

