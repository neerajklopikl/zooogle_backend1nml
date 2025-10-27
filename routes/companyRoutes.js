const express = require('express');
const router = express.Router();
const {
    createCompany,
    getUserCompanies,
    getCompanyById,
    updateCompany,
    deleteCompany
} = require('../controllers/companyController');

// I will assume you have a `protect` middleware for authentication
// const { protect } = require('../middleware/authMiddleware');

router.route('/')
    .post(/*protect,*/ createCompany)
    .get(/*protect,*/ getUserCompanies);

router.route('/:id')
    .get(/*protect,*/ getCompanyById)
    .put(/*protect,*/ updateCompany)
    .delete(/*protect,*/ deleteCompany);

module.exports = router;
