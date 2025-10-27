const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    company_code: {
        type: String,
        required: true,
    },
    type: {
        type: String,
        required: true,
        enum: [
            'sale', 'purchase', 'saleReturn', 'purchaseReturn', 'estimate',
            'saleOrder', 'purchaseOrder', 'paymentIn', 'paymentOut', 'expense'
        ]
    },
    status: {
        type: String,
        default: 'Draft',
        enum: ['Draft', 'Sent', 'Viewed', 'Accepted', 'Rejected', 'Invoiced']
    },
    convertedFrom: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Transaction'
    },
    transactionNumber: { type: String, required: true }, // This is the correct field
    party: { type: mongoose.Schema.Types.ObjectId, ref: 'Party' },
    partyGstin: { type: String }, 
    items: [{
        item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
        quantity: { type: Number, required: true },
        rate: { type: Number, required: true },
        gstRate: { type: Number },
        hsnCode: { type: String },
    }],
    subtotal: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    amountPaid: { type: Number, default: 0 },
    balanceDue: { type: Number, default: 0 },
    transactionDate: { type: Date, default: Date.now },
}, { timestamps: true });

// THIS IS THE FIX:
// It correctly enforces that the transaction number is unique 
// for each type within each company.
transactionSchema.index({ company_code: 1, type: 1, transactionNumber: 1 }, { unique: true });

module.exports = mongoose.model('Transaction', transactionSchema);