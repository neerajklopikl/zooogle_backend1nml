// zooogle_backend/routes/report_routes.js

const express = require('express');
const router = express.Router();

// This import list now includes ALL 12 functions from your controller
const { 
    getProfitAndLoss,
    getBalanceSheet,
    getTrialBalance,
    getStatementOfCashFlows,
    getGstr1Summary,
    getGstr2Summary,
    getHsnSummary,
    getGstr3bSummary,
    getGstr9Summary,
    getConsolidatedReport,
    getGstrReconciliation,  // <-- ADDED
    getBankReconciliation   // <-- ADDED
} = require('../controllers/report_controller');

// Core Financial Reports
router.get('/profit-and-loss', getProfitAndLoss);
router.get('/balance-sheet', getBalanceSheet);
router.get('/trial-balance', getTrialBalance);
router.get('/cash-flow', getStatementOfCashFlows);

// GST Reports
router.get('/gstr1', getGstr1Summary);
router.get('/gstr2', getGstr2Summary);
router.get('/hsn-summary', getHsnSummary);
router.get('/gstr3b', getGstr3bSummary);
router.get('/gstr9', getGstr9Summary);

// Utility Reports
router.get('/consolidated', getConsolidatedReport);

// Reconciliation Reports
router.get('/gstr-reconciliation', getGstrReconciliation); // <-- ADDED
router.get('/bank-reconciliation', getBankReconciliation); // <-- ADDED

module.exports = router;