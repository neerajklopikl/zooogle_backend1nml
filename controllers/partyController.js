const Party = require('../models/Party');

// Helper to handle Mongoose Validation and Duplicate errors
const handleMongooseError = (error, res, entityName, entityData) => {
    if (error.code === 11000) {
        // Duplicate Key Error (E11000) for unique indices (company_code + name)
        return res.status(409).json({
            message: `A ${entityName} with the name "${entityData.name}" already exists in this company.`,
            errorType: 'DuplicateEntry'
        });
    }

    if (error.name === 'ValidationError') {
        // Handle Mongoose Schema Validation errors
        let messages = [];
        for (let field in error.errors) {
            messages.push(error.errors[field].message);
        }
        return res.status(400).json({
            message: `Validation failed for ${entityName}.`,
            errors: messages,
            errorType: 'ValidationError'
        });
    }

    // Default 500 Server Error
    res.status(500).json({ message: 'Server Error during save.', error: error.message, errorType: 'InternalError' });
};

// @desc    Get all parties for the current company
// @route   GET /api/parties
// @access  Private
exports.getParties = async (req, res) => {
    try {
        const { company_code } = req.user;
        const filter = req.query.type ? { type: req.query.type, company_code } : { company_code };
        // Sorting by name is good for user experience
        const parties = await Party.find(filter).sort({ name: 1 });
        res.status(200).json(parties);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Create a party for the current company
// @route   POST /api/parties
// @access  Private
exports.createParty = async (req, res) => {
    try {
        const { company_code } = req.user;
        const newParty = new Party({
            ...req.body,
            company_code: company_code
        });
        
        const savedParty = await newParty.save();

        // Check for "Save & New" mode using a query parameter.
        // Client sends: POST /api/parties?mode=save_and_new
        if (req.query.mode === 'save_and_new') {
            // Success + Signal to client to clear form: HTTP 202 Accepted
            return res.status(202).json({
                message: 'Party successfully created. Ready for new entry.',
                party: savedParty,
                mode: 'save_and_new'
            });
        }

        // Default "Save" mode: HTTP 201 Created
        return res.status(201).json({
            message: 'Party successfully saved.',
            party: savedParty,
            mode: 'save'
        });

    } catch (error) {
        handleMongooseError(error, res, 'Party', req.body);
    }
};
