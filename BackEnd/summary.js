 
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
    
    contentHash: {
        type: String,
        required: true,  
        index: true,     
    },
    summary: {
        type: String,
        required: true,
    },
    modelVersion: {
        type: String,  
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('Summary', summarySchema);