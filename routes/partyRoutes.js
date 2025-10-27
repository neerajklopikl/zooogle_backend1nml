const express = require('express');
const router = express.Router();
const { getParties, createParty } = require('../controllers/partyController');

router.route('/').get(getParties).post(createParty);

module.exports = router;
