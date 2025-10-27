const Company = require('../models/Company');

// @desc    Create a new company
// @route   POST /api/companies
// @access  Private
exports.createCompany = async (req, res) => {
    try {
        const { name, gstin, phone, address } = req.body;

        // The owner is the logged-in user, which we get from our auth middleware
        const owner = req.user.id;

        if (!name) {
            return res.status(400).json({ message: 'Company name is required.' });
        }

        const newCompany = new Company({
            name,
            gstin,
            phone,
            address,
            owner
        });

        const savedCompany = await newCompany.save();
        res.status(201).json(savedCompany);

    } catch (error) {
        console.error("Company Creation Error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// @desc    Get all companies for the logged-in user
// @route   GET /api/companies
// @access  Private
exports.getUserCompanies = async (req, res) => {
    try {
        const companies = await Company.find({ owner: req.user.id });
        res.status(200).json(companies);
    } catch (error) {
        console.error("Get Companies Error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// @desc    Get a single company by its ID
// @route   GET /api/companies/:id
// @access  Private
exports.getCompanyById = async (req, res) => {
    try {
        const company = await Company.findById(req.params.id);

        if (!company) {
            return res.status(404).json({ message: 'Company not found.' });
        }

        // Ensure the user owns this company
        if (company.owner.toString() !== req.user.id) {
            return res.status(401).json({ message: 'Not authorized to access this company.' });
        }

        res.status(200).json(company);

    } catch (error) {
        console.error("Get Company Error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// @desc    Update a company
// @route   PUT /api/companies/:id
// @access  Private
exports.updateCompany = async (req, res) => {
    try {
        let company = await Company.findById(req.params.id);

        if (!company) {
            return res.status(404).json({ message: 'Company not found.' });
        }

        if (company.owner.toString() !== req.user.id) {
            return res.status(401).json({ message: 'Not authorized to update this company.' });
        }

        company = await Company.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });

        res.status(200).json(company);

    } catch (error) {
        console.error("Update Company Error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// @desc    Delete a company
// @route   DELETE /api/companies/:id
// @access  Private
exports.deleteCompany = async (req, res) => {
    try {
        const company = await Company.findById(req.params.id);

        if (!company) {
            return res.status(404).json({ message: 'Company not found.' });
        }

        if (company.owner.toString() !== req.user.id) {
            return res.status(401).json({ message: 'Not authorized to delete this company.' });
        }
        
        // For now, we will perform a hard delete for simplicity.
        await company.deleteOne(); 

        res.status(200).json({ message: 'Company removed successfully.' });

    } catch (error) {
        console.error("Delete Company Error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};
