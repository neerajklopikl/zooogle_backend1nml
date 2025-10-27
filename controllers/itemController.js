const Item = require('../models/Item');

// Helper to handle Mongoose Validation and Duplicate errors (Copied for consistency)
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


// @desc    Get all items for the current company
// @route   GET /api/items
// @access  Private
exports.getItems = async (req, res) => {
    try {
        const { company_code } = req.user;
        // Sorting by name is good for user experience
        const items = await Item.find({ company_code }).sort({ name: 1 });
        res.status(200).json(items);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Create an item for the current company
// @route   POST /api/items
// @access  Private
exports.createItem = async (req, res) => {
    try {
        const { company_code } = req.user;
        const newItem = new Item({
            ...req.body,
            company_code: company_code
        });
        
        const savedItem = await newItem.save();

        // Check for "Save & New" mode using a query parameter.
        // Client sends: POST /api/items?mode=save_and_new
        if (req.query.mode === 'save_and_new') {
            // Success + Signal to client to clear form: HTTP 202 Accepted
            return res.status(202).json({
                message: 'Item successfully created. Ready for new entry.',
                item: savedItem,
                mode: 'save_and_new'
            });
        }

        // Default "Save" mode: HTTP 201 Created
        return res.status(201).json({
            message: 'Item successfully saved.',
            item: savedItem,
            mode: 'save'
        });

    } catch (error) {
        handleMongooseError(error, res, 'Item', req.body);
    }
};

// @desc    Update an item for the current company
// @route   PUT /api/items/:id
// @access  Private
exports.updateItem = async (req, res) => {
    try {
        const { company_code } = req.user;
        const { id } = req.params;
        const updatedItem = await Item.findOneAndUpdate(
            { _id: id, company_code },
            req.body,
            { new: true, runValidators: true }
        );
        if (!updatedItem) {
            return res.status(404).json({ message: 'Item not found' });
        }
        res.status(200).json({ message: 'Item updated successfully', item: updatedItem });
    } catch (error) {
        handleMongooseError(error, res, 'Item', req.body);
    }
};

// @desc    Save or update an item
// @route   POST /api/items/save
// @access  Private
exports.saveItem = async (req, res) => {
    try {
        const { _id, ...itemData } = req.body;
        const { company_code } = req.user;
        let savedItem;

        if (_id) {
            // If an _id is provided, update the existing item.
            savedItem = await Item.findOneAndUpdate(
                { _id, company_code },
                { ...itemData, company_code },
                { new: true, runValidators: true, upsert: true }
            );
        } else {
            // If no _id, create a new item.
            const newItem = new Item({ ...itemData, company_code });
            savedItem = await newItem.save();
        }

        const isSaveAndNew = req.query.mode === 'save_and_new';
        const status = _id ? 200 : (isSaveAndNew ? 202 : 201);
        const message = _id ? 'Item updated successfully' : (isSaveAndNew ? 'Item successfully created. Ready for new entry.' : 'Item successfully saved.');

        res.status(status).json({
            message,
            item: savedItem,
            mode: isSaveAndNew ? 'save_and_new' : 'save'
        });

    } catch (error) {
        handleMongooseError(error, res, 'Item', req.body);
    }
};
