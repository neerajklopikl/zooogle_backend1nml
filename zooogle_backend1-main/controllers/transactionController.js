const Transaction = require('../models/Transaction');
const Item = require('../models/Item');
const Party = require('../models/Party');
const Counter = require('../models/Counter');
const mongoose = require('mongoose');

// --- Atomic Counter Function (This part was correct) ---
async function getNextSequenceValue(sequenceName) {
    const sequenceDocument = await Counter.findByIdAndUpdate(
        sequenceName, 
        { $inc: { sequence_value: 1 } },
        { new: true, upsert: true } 
    );
    return sequenceDocument.sequence_value;
}

// --- getNextTransactionNumber (This part was correct) ---
exports.getNextTransactionNumber = async (req, res) => {
    try {
        const { type } = req.params;
        const { company_code } = req.user;
        const sequenceName = `${type}_${company_code}`;
        const nextNumber = await getNextSequenceValue(sequenceName);
        res.status(200).json({ nextNumber: nextNumber.toString() });
    } catch (error) {
        console.error('Error getting next transaction number:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// --- createTransaction (This function contains the fix) ---
exports.createTransaction = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { type, partyId, items, ...otherDetails } = req.body;
        const { company_code } = req.user;

        if (!type || !otherDetails.totalAmount || !otherDetails.transactionNumber) {
             return res.status(400).json({ message: 'Client error: transactionNumber is missing.' });
        }

        const newTransaction = new Transaction({
            ...otherDetails,
            type,
            party: partyId,
            company_code,
            items: [], 
        });

        if (items && items.length > 0) {
            
            // --- THIS IS THE FIX ---
            // This loop atomically finds, creates, or updates items
            // using findOneAndUpdate with `upsert: true`.
            for (const transactionItem of items) {
                const stockChange = (type === 'sale' || type === 'purchaseReturn') ? -transactionItem.quantity : transactionItem.quantity;

                const item = await Item.findOneAndUpdate(
                    // Filter: Find item by name and company
                    { name: transactionItem.name, company_code: company_code }, 
                    // Update:
                    { 
                        $inc: { stock: stockChange }, // Always update the stock
                        $setOnInsert: { // Fields to set ONLY if a new item is created
                            company_code: company_code,
                            name: transactionItem.name,
                            salePrice: transactionItem.rate,
                        }
                    },
                    // Options:
                    { 
                        upsert: true, // IMPORTANT: Creates the document if it doesn't exist
                        new: true, // Returns the modified (or new) document
                        session: session, // Ensures this operation is part of the transaction
                        setDefaultsOnInsert: true // Applies your schema's default values
                    }
                );

                // Add the item (new or existing) to our transaction's item list
                newTransaction.items.push({
                    item: item._id, 
                    quantity: transactionItem.quantity,
                    rate: transactionItem.rate,
                });
            }
            // --- END OF FIX ---
        }

        await newTransaction.save({ session });
        await session.commitTransaction();
        res.status(201).json(newTransaction);

    } catch (error) {
        await session.abortTransaction();
        console.error('Create Transaction Error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    } finally {
        session.endSession();
    }
};

// --- Other functions (getAllTransactions, etc.) ---

exports.getAllTransactions = async (req, res) => {
    try {
        const { company_code } = req.user;
        const transactions = await Transaction.find({ company_code })
            .populate('party', 'name')
            .populate('items.item', 'name');
        res.status(200).json(transactions);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.getTransactionById = async (req, res) => {
    try {
        const { company_code } = req.user;
        const transaction = await Transaction.findOne({ _id: req.params.id, company_code })
            .populate('party').populate('items.item');
        if (!transaction) {
            return res.status(44).json({ message: 'Transaction not found' });
        }
        res.status(200).json(transaction);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.updateTransaction = async (req, res) => {
    try {
        const { company_code } = req.user;
        const updatedTransaction = await Transaction.findOneAndUpdate(
            { _id: req.params.id, company_code }, 
            req.body, 
            { new: true }
        );
        if (!updatedTransaction) {
            return res.status(404).json({ message: 'Transaction not found' });
        }
        res.status(200).json(updatedTransaction);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.deleteTransaction = async (req, res) => {
    try {
        const { company_code } = req.user;
        const deletedTransaction = await Transaction.findOneAndDelete({ _id: req.params.id, company_code });
        if (!deletedTransaction) {
            return res.status(404).json({ message: 'Transaction not found' });
        }
        res.status(200).json({ message: 'Transaction deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};