require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const partyRoutes = require('./routes/partyRoutes');
const itemRoutes = require('./routes/itemRoutes');
const masterRoutes = require('./routes/masterRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const dataRoutes = require('./routes/dataRoutes');
const hsnSacRoutes = require('./routes/hsnSacRoutes');
const reportRoutes = require('./routes/report_routes');
const companyRoutes = require('./routes/companyRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const authMiddleware = (req, res, next) => {
    req.user = {
        id: '60d5ecb8b394e13ab8e8a3a5',
        company_code: 'default_company'
    };
    next();
};

app.use(authMiddleware);

const dbURI = process.env.MONGODB_URI;

if (!dbURI) {
  console.error('Error: MONGODB_URI is not defined in your .env file.');
  process.exit(1);
}

console.log('Attempting to connect to MongoDB Atlas cluster...');

mongoose.connect(dbURI)
  .then(() => console.log('MongoDB Atlas connected successfully.'))
  .catch(err => {
    console.error('MongoDB connection error:', err.message);
    console.error('\nThis is a network error. Please ensure your IP address is whitelisted in MongoDB Atlas under "Network Access".');
  });

app.get('/', (req, res) => {
  res.send('Zooogle Backend API is running...');
});

app.use('/api/parties', partyRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/masters', masterRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/data', dataRoutes);
app.use('/api/hsnsac', hsnSacRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/companies', companyRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
