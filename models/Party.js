const mongoose = require('mongoose');

const partySchema = new mongoose.Schema({
    company_code: {
        type: String,
        required: true,
    },
    name: { type: String, required: true, trim: true },
    type: {
        type: String,
        required: true,
        enum: ['customer', 'supplier']
    },
    gstin: { type: String, trim: true },
    // ... other party details like contact info, address, etc.
}, { timestamps: true });

// Enforce that a party's name is unique within a specific company.
partySchema.index({ company_code: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Party', partySchema);