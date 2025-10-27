/**
 * @desc    Get a list of all Indian States and Union Territories
 * @route   GET /api/data/states
 * @access  Public
 */
exports.getIndianStates = (req, res) => {
    // This list contains all states and union territories of India
    // along with their official two-letter codes.
    const indianStates = [
        { "code": "AN", "name": "Andaman & Nicobar Islands" },
        { "code": "AP", "name": "Andhra Pradesh" },
        { "code": "AR", "name": "Arunachal Pradesh" },
        { "code": "AS", "name": "Assam" },
        { "code": "BR", "name": "Bihar" },
        { "code": "CG", "name": "Chhattisgarh" },
        { "code": "CH", "name": "Chandigarh" },
        { "code": "DD", "name": "Dadra & Nagar Haveli and Daman & Diu" },
        { "code": "DL", "name": "Delhi" },
        { "code": "GA", "name": "Goa" },
        { "code": "GJ", "name": "Gujarat" },
        { "code": "HP", "name": "Himachal Pradesh" },
        { "code": "HR", "name": "Haryana" },
        { "code": "JH", "name": "Jharkhand" },
        { "code": "JK", "name": "Jammu & Kashmir" },
        { "code": "KA", "name": "Karnataka" },
        { "code": "KL", "name": "Kerala" },
        { "code": "LA", "name": "Ladakh" },
        { "code": "LD", "name": "Lakshadweep" },
        { "code": "MH", "name": "Maharashtra" },
        { "code": "ML", "name": "Meghalaya" },
        { "code": "MN", "name": "Manipur" },
        { "code": "MP", "name": "Madhya Pradesh" },
        { "code": "MZ", "name": "Mizoram" },
        { "code": "NL", "name": "Nagaland" },
        { "code": "OR", "name": "Odisha" },
        { "code": "PB", "name": "Punjab" },
        { "code": "PY", "name": "Puducherry" },
        { "code": "RJ", "name": "Rajasthan" },
        { "code": "SK", "name": "Sikkim" },
        { "code": "TG", "name": "Telangana" },
        { "code": "TN", "name": "Tamil Nadu" },
        { "code": "TR", "name": "Tripura" },
        { "code": "UP", "name": "Uttar Pradesh" },
        { "code": "UT", "name": "Uttarakhand" },
        { "code": "WB", "name": "West Bengal" }
    ];

    try {
        res.status(200).json(indianStates);
    } catch (error) {
        console.error('Error fetching Indian states:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};
