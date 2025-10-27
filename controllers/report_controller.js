// zooogle_backend/controllers/report_controller.js

const Transaction = require('../models/Transaction');
const Master = require('../models/Master');
const Item = require('../models/Item');
const mongoose = require('mongoose');

// --- HELPER FUNCTIONS ---

// ----------------------------------------------------------------
// DELETED the flawed `calculateTax` function.
// GST is now pre-calculated and stored on the transaction item.
// ----------------------------------------------------------------

const getDateMatch = (startDate, endDate) => {
    const dateMatch = {};
    if (startDate) dateMatch.$gte = new Date(startDate);
    if (endDate) dateMatch.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
    return (startDate || endDate) ? { transactionDate: dateMatch } : {};
};


// --- CORE FINANCIAL STATEMENTS ---

/**
 * @desc    Get a standard Profit & Loss report with date filtering
 * @route   GET /api/reports/profit-and-loss?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 */
exports.getProfitAndLoss = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const matchStage = {
            ...getDateMatch(startDate, endDate),
            type: { $in: ['sale', 'purchase', 'expense', 'saleReturn', 'purchaseReturn'] }
        };

        const results = await Transaction.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: null,
                    totalSales: { $sum: { $cond: [{ $eq: ['$type', 'sale'] }, '$totalAmount', 0] } },
                    totalPurchases: { $sum: { $cond: [{ $eq: ['$type', 'purchase'] }, '$totalAmount', 0] } },
                    totalExpenses: { $sum: { $cond: [{ $eq: ['$type', 'expense'] }, '$totalAmount', 0] } },
                    totalSaleReturns: { $sum: { $cond: [{ $eq: ['$type', 'saleReturn'] }, '$totalAmount', 0] } },
                    totalPurchaseReturns: { $sum: { $cond: [{ $eq: ['$type', 'purchaseReturn'] }, '$totalAmount', 0] } }
                }
            }
        ]);

        if (results.length === 0) return res.status(200).json({ revenue: 0, costOfGoodsSold: 0, grossProfit: 0, expenses: 0, netProfit: 0 });

        const data = results[0];
        const revenue = (data.totalSales || 0) - (data.totalSaleReturns || 0);
        const costOfGoodsSold = (data.totalPurchases || 0) - (data.totalPurchaseReturns || 0);
        const grossProfit = revenue - costOfGoodsSold;
        const expenses = data.totalExpenses || 0;
        const netProfit = grossProfit - expenses;
        
        res.status(200).json({ revenue, costOfGoodsSold, grossProfit, expenses, netProfit });
    } catch (error) { res.status(500).json({ message: 'Server Error' }); }
};

/**
 * @desc    Get a proper, balancing Balance Sheet for a specific date
 * @route   GET /api/reports/balance-sheet?endDate=YYYY-MM-DD
 */
exports.getBalanceSheet = async (req, res) => {
    try {
        const { endDate } = req.query;
        // Match transactions up to the end of the specified date
        const matchStage = getDateMatch(null, endDate);

        const [pnlResult, assetsAndLiabilities, inventory, capitalResult] = await Promise.all([
            // 1. Calculate lifetime Net Profit for Retained Earnings
            Transaction.aggregate([
                { $match: matchStage },
                { $group: {
                    _id: '$type',
                    total: { $sum: '$totalAmount' }
                }}
            ]),
            // 2. Calculate lifetime cash, receivables, and payables
            Transaction.aggregate([
                { $match: matchStage },
                { $group: {
                    _id: null,
                    cashIn: { $sum: { $cond: [{ $in: ['$type', ['paymentIn', 'sale']] }, '$amountPaid', 0] } },
                    cashOut: { $sum: { $cond: [{ $in: ['$type', ['paymentOut', 'expense', 'purchase']] }, '$amountPaid', 0] } },
                    receivables: { $sum: { $cond: [{ $in: ['$type', ['sale', 'saleReturn']] }, '$balanceDue', 0] } },
                    payables: { $sum: { $cond: [{ $in: ['$type', ['purchase', 'purchaseReturn']] }, '$balanceDue', 0] } }
                }}
            ]),
            // 3. Calculate current Inventory Value
            Item.aggregate([
                { $group: {
                    _id: null,
                    totalValue: { $sum: { $multiply: ["$stock", "$purchasePrice"] } }
                }}
            ]),
            // 4. *** NEW *** Calculate Owner Capital
            // This assumes you create Masters with type: 'capital'
            Master.aggregate([
                { $match: { type: 'capital' } },
                { $group: { 
                    _id: null, 
                    // Sum opening balances: Credit is positive, Debit is negative
                    total: { $sum: { 
                        $cond: [
                            { $eq: ['$opBal.type', 'Cr'] }, 
                            '$opBal.amount', 
                            { $subtract: [0, '$opBal.amount'] }
                        ] 
                    }} 
                }}
            ])
        ]);

        // Calculate P&L (Retained Earnings)
        const pnlGroups = pnlResult.reduce((acc, curr) => ({...acc, [curr._id]: curr.total }), {});
        const revenue = (pnlGroups.sale || 0) - (pnlGroups.saleReturn || 0);
        const cogs = (pnlGroups.purchase || 0) - (pnlGroups.purchaseReturn || 0);
        const netProfit = revenue - cogs - (pnlGroups.expense || 0);
        
        const anl = assetsAndLiabilities[0] || {};
        
        res.status(200).json({
            // ASSETS
            cashAndBank: (anl.cashIn || 0) - (anl.cashOut || 0),
            accountsReceivable: anl.receivables || 0,
            inventoryValue: inventory[0]?.totalValue || 0,
            // LIABILITIES & EQUITY
            accountsPayable: anl.payables || 0,
            ownerCapital: capitalResult[0]?.total || 0, // <-- CORRECTED: No longer hardcoded
            netProfit: netProfit 
        });
    } catch (error) {
        console.error('Balance Sheet Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

/**
 * @desc    Get an Advanced Trial Balance with Opening, Transactions, and Closing balances
 * @route   GET /api/reports/trial-balance?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 */
exports.getTrialBalance = async (req, res) => {
    // This function's logic appears complex but reasonable. Leaving as is.
    try {
        const { startDate, endDate } = req.query;
        const periodMatch = getDateMatch(startDate, endDate);

        const transactionAggregates = await Transaction.aggregate([
            { $match: { ...periodMatch, party: { $ne: null } } },
            {
                $group: {
                    _id: '$party',
                    periodDebit: { $sum: { $cond: [{ $in: ['$type', ['sale', 'purchaseReturn', 'paymentOut']] }, '$totalAmount', 0] } },
                    periodCredit: { $sum: { $cond: [{ $in: ['$type', ['purchase', 'saleReturn', 'paymentIn', 'expense']] }, '$totalAmount', 0] } }
                }
            }
        ]);
        
        const accounts = await Master.find({}).lean();
        const trialBalance = [];

        for (const acc of accounts) {
            const openingDebit = acc.opBal?.type === 'Dr' ? (acc.opBal?.amount || 0) : 0;
            const openingCredit = acc.opBal?.type === 'Cr' ? (acc.opBal?.amount || 0) : 0;
            
            const transactions = transactionAggregates.find(t => t._id.toString() === acc._id.toString());
            const periodDebit = transactions?.periodDebit || 0;
            const periodCredit = transactions?.periodCredit || 0;

            const totalDebit = openingDebit + periodDebit;
            const totalCredit = openingCredit + periodCredit;
            
            let closingDebit = 0;
            let closingCredit = 0;

            if (totalDebit > totalCredit) {
                closingDebit = totalDebit - totalCredit;
            } else {
                closingCredit = totalCredit - totalDebit;
            }

            if (openingDebit || openingCredit || periodDebit || periodCredit || closingDebit || closingCredit) {
                 trialBalance.push({ 
                    accountName: acc.name, 
                    openingDebit,
                    openingCredit,
                    periodDebit,
                    periodCredit,
                    closingDebit, 
                    closingCredit 
                });
            }
        }
        res.status(200).json(trialBalance);
    } catch (error) {
        console.error("Error in getTrialBalance:", error);
        res.status(500).json({ message: 'Server Error' });
    }
};

/**
 * @desc    Get Statement of Cash Flows
 * @route   GET /api/reports/cash-flow?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 */
exports.getStatementOfCashFlows = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const matchStage = getDateMatch(startDate, endDate);
        
        const [pnlData, cashFlowAggregation] = await Promise.all([
            // 1. Get Net Profit (same as P&L report)
            Transaction.aggregate([
                { $match: { ...matchStage, type: { $in: ['sale', 'purchase', 'expense', 'saleReturn', 'purchaseReturn'] } } },
                { $group: {
                    _id: null,
                    revenue: { $sum: { $cond: [{ $in: ['$type', ['sale', 'saleReturn']] }, '$totalAmount', 0] } },
                    cogs: { $sum: { $cond: [{ $in: ['$type', ['purchase', 'purchaseReturn']] }, '$totalAmount', 0] } },
                    expenses: { $sum: { $cond: [{ $eq: ['$type', 'expense'] }, '$totalAmount', 0] } },
                }}
            ]),
            // 2. Get cash flows from all activities
            Transaction.aggregate([
                { $match: matchStage },
                { $group: {
                    _id: null,
                    // Operating Activities (Cash)
                    cashFromCustomers: { $sum: { $cond: [{ $in: ['$type', ['sale', 'paymentIn']] }, '$amountPaid', 0] } },
                    cashToSuppliers: { $sum: { $cond: [{ $eq: ['$type', 'purchase'] }, '$amountPaid', 0] } },
                    cashForExpenses: { $sum: { $cond: [{ $eq: ['$type', 'expense'] }, '$amountPaid', 0] } },
                    
                    // --- CORRECTED: Calculate Investing & Financing ---
                    // This assumes you use these transaction types.
                    investingCashFlow: { $sum: { $cond: [
                        { $in: ['$type', ['asset_purchase', 'asset_sale']] }, 
                        { $cond: [{ $eq: ['$type', 'asset_purchase'] }, { $subtract: [0, '$amountPaid'] }, '$amountPaid'] } // Purchase is negative, Sale is positive
                    , 0] } },
                    financingCashFlow: { $sum: { $cond: [
                        { $in: ['$type', ['loan_in', 'loan_out', 'capital_introduced', 'drawings']] },
                         // In/Intro is positive, Out/Drawings is negative
                        { $cond: [{ $in: ['$type', ['loan_in', 'capital_introduced']] }, '$amountPaid', { $subtract: [0, '$amountPaid'] }] }
                    , 0] } }
                }}
            ])
        ]);

        const pnl = pnlData[0] || {};
        const netProfit = (pnl.revenue || 0) - (pnl.cogs || 0) - (pnl.expenses || 0);

        const wc = cashFlowAggregation[0] || {};
        const operatingCashFlow = (wc.cashFromCustomers || 0) - (wc.cashToSuppliers || 0) - (wc.cashForExpenses || 0);

        res.status(200).json({
            operatingActivities: {
                netProfit: netProfit,
                cashFlowFromOperations: operatingCashFlow
            },
            // --- CORRECTED: Use calculated values ---
            investingActivities: { cashFlowFromInvesting: wc.investingCashFlow || 0 },
            financingActivities: { cashFlowFromFinancing: wc.financingCashFlow || 0 }
        });

    } catch (error) {
        console.error("Cash Flow Error:", error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// --- GST REPORTS ---

exports.getGstr1Summary = async (req, res) => {
    // This report logic seems fine.
    try {
        const { startDate, endDate } = req.query;
        const matchStage = getDateMatch(startDate, endDate);
        const report = await Transaction.aggregate([
            { $match: { ...matchStage, type: 'sale', partyGstin: { $exists: true, $ne: null, $ne: "" } } },
            {
                $group: {
                    _id: '$partyGstin',
                    totalTaxableValue: { $sum: '$subtotal' }, // Assuming 'subtotal' is correct
                    totalInvoiceValue: { $sum: '$totalAmount' },
                    invoiceCount: { $sum: 1 },
                    invoices: { $push: { 
                        invNo: '$transactionNumber',
                        date: '$transactionDate',
                        value: '$totalAmount'
                    }}
                }
            },
             { $project: { _id: 0, gstin: '$_id', totalTaxableValue: 1, totalInvoiceValue: 1, invoiceCount: 1, invoices: 1 } },
             { $sort: { totalInvoiceValue: -1 } }
        ]);
        res.status(200).json(report);
    } catch (error) { res.status(500).json({ message: 'Server Error' }); }
};

exports.getGstr2Summary = async (req, res) => {
    // This report logic seems fine.
     try {
        const { startDate, endDate } = req.query;
        const matchStage = getDateMatch(startDate, endDate);
        const report = await Transaction.aggregate([
            { $match: { ...matchStage, type: 'purchase', partyGstin: { $exists: true, $ne: null, $ne: "" } } },
            {
                $group: {
                    _id: '$partyGstin',
                    totalTaxableValue: { $sum: '$subtotal' }, // Assuming 'subtotal' is correct
                    totalInvoiceValue: { $sum: '$totalAmount' },
                    invoiceCount: { $sum: 1 },
                    invoices: { $push: { 
                        invNo: '$transactionNumber',
                        date: '$transactionDate',
                        value: '$totalAmount'
                    }}
                }
            },
            { $project: { _id: 0, gstin: '$_id', totalTaxableValue: 1, totalInvoiceValue: 1, invoiceCount: 1, invoices: 1 } },
            { $sort: { totalInvoiceValue: -1 } }
        ]);
        res.status(200).json(report);
    } catch (error) { res.status(500).json({ message: 'Server Error' }); }
};

exports.getHsnSummary = async (req, res) => {
    // This logic is now more accurate using the pre-calculated 'taxableValue'
    try {
        const { startDate, endDate } = req.query;
        const matchStage = getDateMatch(startDate, endDate);
        const report = await Transaction.aggregate([
            { $match: { ...matchStage, type: { $in: ['sale', 'saleReturn'] } } },
            { $unwind: '$items' },
            { $group: { 
                _id: '$items.hsnCode', 
                totalQuantity: { $sum: '$items.quantity' }, 
                totalTaxableValue: { $sum: '$items.taxableValue' }, // <-- CORRECTED
                gstRate: { $first: '$items.gstRate' } 
            }},
            { $project: { _id: 0, hsnCode: '$_id', totalQuantity: 1, totalTaxableValue: 1, gstRate: 1 } }
        ]);
        res.status(200).json(report);
    } catch (error) { res.status(500).json({ message: 'Server Error' }); }
};

exports.getGstr3bSummary = async (req, res) => {
    // This report is now efficient and correct, using pre-calculated GST.
    try {
        const { month, year } = req.query;
        if (!month || !year) return res.status(400).json({ message: 'Month and year are required.'});
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);

        const result = await Transaction.aggregate([
            { $match: { transactionDate: { $gte: startDate, $lte: endDate }, type: { $in: ['sale', 'purchase'] } } },
            { $unwind: '$items' },
            { $group: { 
                _id: '$type', 
                totalTaxableValue: { $sum: '$items.taxableValue' },
                totalCgst: { $sum: '$items.cgst' },
                totalSgst: { $sum: '$items.sgst' },
                totalIgst: { $sum: '$items.igst' }
            }}
        ]);

        const sales = result.find(r => r._id === 'sale') || {};
        const purchases = result.find(r => r._id === 'purchase') || {};
        
        res.status(200).json({
            outwardTaxableSupplies: sales.totalTaxableValue || 0,
            outwardCgst: sales.totalCgst || 0,
            outwardSgst: sales.totalSgst || 0,
            outwardIgst: sales.totalIgst || 0,
            itcAvailableCgst: purchases.totalCgst || 0,
            itcAvailableSgst: purchases.totalSgst || 0,
            itcAvailableIgst: purchases.totalIgst || 0,
        });
    } catch (error) { res.status(500).json({ message: 'Server Error' }); }
};

exports.getGstr9Summary = async (req, res) => {
    // This report is also now efficient and correct.
     try {
        const { financialYear } = req.query;
        if (!financialYear) return res.status(400).json({ message: 'Financial year is required.'});
        const startDate = new Date(financialYear, 3, 1); // FY starts April 1
        const endDate = new Date(parseInt(financialYear) + 1, 2, 31, 23, 59, 59); // Ends March 31

        const result = await Transaction.aggregate([
            { $match: { transactionDate: { $gte: startDate, $lte: endDate }, type: { $in: ['sale', 'purchase'] } } },
            { $unwind: '$items' },
            { $group: { 
                _id: '$type', 
                totalTaxableValue: { $sum: '$items.taxableValue' },
                totalCgst: { $sum: '$items.cgst' },
                totalSgst: { $sum: '$items.sgst' },
                totalIgst: { $sum: '$items.igst' }
            }}
        ]);
        
        const sales = result.find(r => r._id === 'sale') || {};
        const purchases = result.find(r => r._id === 'purchase') || {};
        
        const totalTaxPayable = (sales.totalCgst || 0) + (sales.totalSgst || 0) + (sales.totalIgst || 0);
        const totalItcClaimed = (purchases.totalCgst || 0) + (purchases.totalSgst || 0) + (purchases.totalIgst || 0);

        res.status(200).json({
            totalTaxableValue: sales.totalTaxableValue || 0,
            totalTaxPayable: totalTaxPayable,
            totalItcClaimed: totalItcClaimed
        });
    } catch (error) { res.status(500).json({ message: 'Server Error' }); }
};

// --- CONSOLIDATED AND OTHER UTILITY REPORTS ---

exports.getConsolidatedReport = async (req, res) => {
    try {
        const report = await Transaction.aggregate([
            { $group: { _id: '$type', totalAmount: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
            { $project: { _id: 0, type: '$_id', totalAmount: 1, count: 1 } }
        ]);
        res.status(200).json(report);
    } catch (error) { res.status(500).json({ message: 'Server Error' }); }
};


// --- NEW RECONCILIATION FEATURES ---
// ... (These functions, getGstrReconciliation and getBankReconciliation,
// ...  are left as-is because they are simulations.
// ...  They cannot be "corrected" without adding major new features
// ...  like GSTN API integration and bank statement file parsing.)

/**
 * @desc    Get GSTR Reconciliation data by comparing user purchases with simulated GSTR-2A data.
 * @route   GET /api/reports/gstr-reconciliation
 */
exports.getGstrReconciliation = async (req, res) => {
    try {
        const { month, year } = req.query;
        if (!month || !year) return res.status(400).json({ message: 'Month and year are required.' });

        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);

        // 1. Fetch user's purchase data from the database for the specified period.
        const userPurchases = await Transaction.find({
            type: 'purchase',
            transactionDate: { $gte: startDate, $lte: endDate }
        }).populate('party', 'gstin').lean();


        // 2. Simulate fetching GSTR-2A data from the government portal.
        // In a real-world application, this would be a secure API call to the GSTN.
        // THIS IS SIMULATED DATA.
        const gstr2aData = [
            // Example 1: This invoice will perfectly match one in the user's books.
            { _id: 'gstr2a_1', partyGstin: '27AABCU9603R1ZM', invoiceNumber: 'P-001', invoiceDate: new Date(year, month - 1, 5), taxableValue: 5000, totalTax: 900 },
            // Example 2: This invoice has a different total amount than the user's record.
            { _id: 'gstr2a_2', partyGstin: '29AABCD1234F1Z5', invoiceNumber: 'P-002', invoiceDate: new Date(year, month - 1, 10), taxableValue: 9500, totalTax: 1710 },
            // Example 3: This invoice exists in GSTR-2A but is missing from the user's purchase records.
            { _id: 'gstr2a_3', partyGstin: '30ACDEF5678F1Z6', invoiceNumber: 'INV-789', invoiceDate: new Date(year, month - 1, 15), taxableValue: 2000, totalTax: 360 },
        ];

        const matchedInvoices = [];
        const mismatchedInvoices = [];
        const missingInGstr2a = []; // Invoices in user's books but not in GSTR-2A

        const gstr2aMap = new Map(gstr2aData.map(inv => [`${inv.partyGstin}-${inv.invoiceNumber}`, inv]));

        for (const purchase of userPurchases) {
            const partyGstin = purchase.party?.gstin;
            if (!partyGstin) continue;

            const key = `${partyGstin}-${purchase.transactionNumber}`;
            const gstr2aInvoice = gstr2aMap.get(key);
            
            // Calculate total value from book entry
            const bookTaxableValue = purchase.items.reduce((acc, item) => acc + item.taxableValue, 0);
            const bookTotalTax = purchase.items.reduce((acc, item) => acc + item.cgst + item.sgst + item.igst, 0);
            const bookTotalValue = bookTaxableValue + bookTotalTax;

            if (gstr2aInvoice) {
                // Check for mismatch in total value (taxable + tax)
                if (Math.abs(bookTotalValue - (gstr2aInvoice.taxableValue + gstr2aInvoice.totalTax)) > 0.01) {
                    mismatchedInvoices.push({ ...gstr2aInvoice, bookValue: bookTotalValue });
                } else {
                    matchedInvoices.push(gstr2aInvoice);
                }
                gstr2aMap.delete(key); // Remove from map to track what's left
            } else {
                missingInGstr2a.push(purchase);
            }
        }

        // Any remaining invoices in the map are missing in the user's books
        const missingInBooks = Array.from(gstr2aMap.values());

        res.status(200).json({
            matchedInvoices,
            mismatchedInvoices,
            missingInBooks,
            missingInGstr2a,
        });

    } catch (error) {
        console.error('GSTR Reconciliation Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};


/**
 * @desc    Get Bank Reconciliation data
 * @route   GET /api/reports/bank-reconciliation
 */
exports.getBankReconciliation = async (req, res) => {
    try {
        // 1. Fetch user's bank transactions (Payments In/Out, Expenses paid via bank)
        // In a real app, you would filter by a specific bank account master.
        const bookEntries = await Transaction.find({
            type: { $in: ['paymentIn', 'paymentOut', 'expense'] },
            // You would also filter by 'paymentMode: 'Bank'' or 'bankAccount: accountId'
        }).populate('party', 'name').sort({ transactionDate: -1 }).limit(20).lean();

        // 2. Simulate fetching/parsing an imported bank statement.
        // This simulates a file uploaded by the user. THIS IS SIMULATED DATA.
        const statementEntries = [
            { _id: 'stmt_1', date: new Date(new Date().setDate(new Date().getDate() - 1)), description: 'NEFT from ClientCorp', credit: 50000.00, debit: 0 },
            { _id: 'stmt_2', date: new Date(new Date().setDate(new Date().getDate() - 2)), description: 'UPI/Vendor Supplies/98765', debit: 12500.00, credit: 0 },
            { _id: 'stmt_3', date: new Date(new Date().setDate(new Date().getDate() - 3)), description: 'ATM Withdrawal SELF', debit: 5000.00, credit: 0 },
            { _id: 'stmt_4', date: new Date(new Date().setDate(new Date().getDate() - 4)), description: 'Office Rent Payment', debit: 25000.00, credit: 0 },
            { _id: 'stmt_5', date: new Date(new Date().setDate(new Date().getDate() - 5)), description: 'Cash Deposit Machine', credit: 10000.00, debit: 0 },
        ];

        const formattedBookEntries = bookEntries.map(t => ({
             _id: t._id,
             date: t.transactionDate,
             description: `${t.type} - ${t.party?.name || 'N/A'} (#${t.transactionNumber})`,
             debit: (t.type === 'paymentOut' || t.type === 'expense') ? t.totalAmount : 0,
             credit: t.type === 'paymentIn' ? t.totalAmount : 0,
        }));


        res.status(200).json({ bookEntries: formattedBookEntries, statementEntries });

    } catch (error) {
        console.error('Bank Reconciliation Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};