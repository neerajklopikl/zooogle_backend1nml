const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

/**
 * Reads a CSV file from the given path and returns its content as a promise.
 * @param {string} filePath - The full path to the CSV file.
 * @returns {Promise<object[]>} A promise that resolves to an array of objects from the CSV.
 */
const readCsv = (filePath) => {
    return new Promise((resolve, reject) => {
        const results = [];
        fs.createReadStream(filePath)
            .pipe(csv({
                // Automatically trim whitespace from the header names
                mapHeaders: ({ header }) => header.trim(),
            }))
            .on('data', (data) => {
                // Get the headers from the current row
                const headers = Object.keys(data);
                // Ensure the row has at least two columns to be valid
                if (headers.length >= 2) {
                    results.push({
                        code: data[headers[0]] || '', // First column is the code
                        description: data[headers[1]] || '' // Second column is the description
                    });
                }
            })
            .on('end', () => {
                // Successfully finished reading the file
                resolve(results);
            })
            .on('error', (error) => {
                // An error occurred during reading
                reject(error);
            });
    });
};

/**
 * @desc    Get all HSN and SAC codes by reading and combining two CSV files.
 * @route   GET /api/hsn-sac
 * @access  Public
 */
exports.getHsnSacCodes = async (req, res) => {
    try {
        // Define the full paths to the CSV files within the 'data' directory
        const hsnPath = path.join(__dirname, '..', 'data', 'HSN_MSTR.csv');
        const sacPath = path.join(__dirname, '..', 'data', 'SAC_MSTR.csv');

        // Before trying to read, check if the files physically exist on the server
        if (!fs.existsSync(hsnPath) || !fs.existsSync(sacPath)) {
            const message = 'HSN_MSTR.csv or SAC_MSTR.csv not found in the `zooogle_backend/data` directory.';
            console.error(message);
            return res.status(500).json({ message });
        }
        
        // Read both files concurrently for better performance
        const [hsnCodes, sacCodes] = await Promise.all([
            readCsv(hsnPath),
            readCsv(sacPath)
        ]);

        // Combine the results from both files into a single array
        const allCodes = [...hsnCodes, ...sacCodes];
        
        // Send the combined list back to the Flutter app as a JSON response
        res.status(200).json(allCodes);

    } catch (error) {
        // If any error occurs during the process, log it and send a server error response
        console.error('Error processing HSN/SAC CSV files:', error);
        res.status(500).json({ message: 'Server error while fetching HSN/SAC codes' });
    }
};

