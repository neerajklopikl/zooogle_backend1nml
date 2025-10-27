const Master = require('../models/Master');

/**
 * @desc    Get all masters of a specific type
 * @route   GET /api/masters/:type
 * @access  Public
 */
exports.getMastersByType = async (req, res) => {
    try {
        const masters = await Master.find({ type: req.params.type });
        if (!masters) {
            return res.status(404).json({ message: 'No masters found for this type' });
        }
        res.status(200).json(masters);
    } catch (error) {
        console.error('Error fetching masters by type:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

/**
 * @desc    Create a new master
 * @route   POST /api/masters
 * @access  Private
 */
exports.createMaster = async (req, res) => {
    try {
        const masterData = req.body;

        if (!masterData.name || !masterData.type) {
            return res.status(400).json({ message: 'Name and type are required' });
        }

        const newMaster = new Master(masterData);
        const savedMaster = await newMaster.save();

        res.status(201).json(savedMaster);
    } catch (error) {
        console.error('Error creating master:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};
