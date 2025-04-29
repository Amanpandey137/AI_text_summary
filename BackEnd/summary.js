// //  Summary.js
// const mongoose = require('mongoose');

// const summarySchema = new mongoose.Schema({
//     originalFilename: {
//         type: String,
//         required: true,
//     },
//     originalTextLength: { 
//         type: Number,
//         required: true,
//     },
    
//     summary: {
//         type: String,
//         required: true,
//     },
//     modelVersion: {  
//          type: String,
//          default: 'gemini-pro'
//     },
//     createdAt: {
//         type: Date,
//         default: Date.now,
//     },
// });

// module.exports = mongoose.model('Summary', summarySchema);
// summary.js
const mongoose = require('mongoose');

const summarySchema = new mongoose.Schema({
    originalFilename: {
        type: String,
        required: true,
    },
    originalTextLength: {
        type: Number,
        required: true,
    },
    // Add the hash used for caching/identification
    contentHash: {
        type: String,
        required: true, // Make it required if saving only new summaries
        index: true,    // Index for faster lookups if needed
    },
    summary: {
        type: String,
        required: true,
    },
    modelVersion: {
        type: String, // e.g., 'gemini-1.5-flash'
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('Summary', summarySchema);