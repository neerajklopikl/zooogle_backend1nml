const express = require('express');
const router = express.Router();

const { 
    createTransaction, 
    getAllTransactions,
    getTransactionById,
    updateTransaction,
    deleteTransaction,
    getNextTransactionNumber
} = require('../controllers/transactionController');

// This route MUST be defined before the /:id route to avoid conflicts
router.route('/next-number/:type').get(getNextTransactionNumber);

// Routes for getting all transactions and creating a new one
router.route('/')
    .post(createTransaction)
    .get(getAllTransactions);

// Routes for a single transaction (get, update, delete)
router.route('/:id')
    .get(getTransactionById)
    .put(updateTransaction)
    .delete(deleteTransaction);

module.exports = router;
