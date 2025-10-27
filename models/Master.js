// mnklop/models/Master.js
const mongoose = require('mongoose');

// Sub-schema for balance fields
const balanceSchema = new mongoose.Schema({
  amount: { type: Number, default: 0 },
  type: { type: String, enum: ['Dr', 'Cr'], default: 'Dr' }
}, { _id: false });

const masterSchema = new mongoose.Schema({
  // General Info
  name: { type: String, required: true, trim: true },
  alias: { type: String, trim: true },
  printName: { type: String, trim: true },
  group: { type: String, trim: true },
  opBal: balanceSchema,
  prevYearBal: balanceSchema,
  address1: { type: String, trim: true },
  address2: { type: String, trim: true },
  address3: { type: String, trim: true },
  address4: { type: String, trim: true },
  country: { type: String, trim: true },
  state: { type: String, trim: true },
  typeOfDealer: { type: String, trim: true },
  gstin: { type: String, trim: true },
  aadhaarNo: { type: String, trim: true },
  itPan: { type: String, trim: true },
  email: { type: String, trim: true },
  mobileNo: { type: String, trim: true },
  telNo: { type: String, trim: true },
  contactPerson: { type: String, trim: true },
  station: { type: String, trim: true },
  distance: { type: Number, default: 0 },
  tin: { type: String, trim: true },
  ward: { type: String, trim: true },
  whatsappNo: { type: String, trim: true },
  fax: { type: String, trim: true },
  transport: { type: String, trim: true },
  pinCode: { type: String, trim: true },
  
  // Other Info
  cstNo: { type: String, trim: true },
  ieCode: { type: String, trim: true },
  bankName: { type: String, trim: true },
  bankAcNo: { type: String, trim: true },
  ifscCode: { type: String, trim: true },
  enableEmailQuery: { type: Boolean, default: false },

  // Extra Info
  lstNo: { type: String, trim: true },
  lbtNo: { type: String, trim: true },
  swiftCode: { type: String, trim: true },
  enableSmsQuery: { type: Boolean, default: false },

  // --- Original Fields ---
  type: {
    type: String,
    required: true,
    enum: [
      'sale_series', 'purchase_series', 'expense_category' // Add others as needed
    ]
  },
  prefix: { type: String, trim: true },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Master', masterSchema);