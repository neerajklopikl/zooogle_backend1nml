const mongoose = require('mongoose');
const { nanoid } = require('nanoid');

const companySchema = new mongoose.Schema({
    company_code: {
        type: String,
        required: true,
        unique: true,
        default: () => nanoid(10)
    },
    name: {
        type: String,
        required: [true, 'Company name is required'],
        trim: true
    },
    gstin: {
        type: String,
        trim: true,
        match: [/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Please fill a valid GSTIN']
    },
    phone: {
        type: String,
        trim: true
    },
    address: {
        street: String,
        city: String,
        state: String,
        zipCode: String,
        country: { type: String, default: 'India' }
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Company', companySchema);
