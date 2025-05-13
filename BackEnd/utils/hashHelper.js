 
const crypto = require("crypto");

/**
 * Calculates SHA-256 hash of a string.
 * @param {string} text 
 * @returns {string}  
 */
function getTextHash(text) {
    if (!text) return null;
    return crypto.createHash('sha256').update(text, 'utf-8').digest('hex');
}

module.exports = getTextHash;