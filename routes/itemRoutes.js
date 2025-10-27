const express = require('express');
const router = express.Router();
const { getItems, createItem, updateItem, saveItem } = require('../controllers/itemController');

router.route('/').get(getItems).post(createItem);
router.route('/:id').put(updateItem);
router.route('/save').post(saveItem);

module.exports = router;
