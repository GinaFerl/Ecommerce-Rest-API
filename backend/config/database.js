const mongoose = require('mongoose');

const connectDatabase = () => {
  mongoose.connect(process.env.DB_URI, async (error) => {
    // if (error) throw error;
    console.log('connected to MongoDB');
  });
};

module.exports = connectDatabase;
