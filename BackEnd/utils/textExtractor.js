 
const fs = require("fs");
const path = require("path");
const pdf = require("pdf-parse");
const mammoth = require("mammoth");

async function extractText(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  let text = "";
  console.log(`Attempting text extraction for: ${filePath} (type: ${ext})`);
  try {
    if (!fs.existsSync(filePath)) {
        throw new Error(`File not found at path: ${filePath}`);
    }
    const stats = fs.statSync(filePath);
    if (stats.size === 0) {
        console.warn(`File ${filePath} is empty.`);
        return "";
    }

    if (ext === ".txt") {
      text = fs.readFileSync(filePath, "utf-8");
    } else if (ext === ".pdf") {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdf(dataBuffer);
      text = data.text;
    } else if (ext === ".docx") {
      const result = await mammoth.extractRawText({ path: filePath });
      text = result.value;
    } else {
      throw new Error(`Unsupported file type for text extraction: ${ext}`);
    }
    console.log(`Extraction successful for ${filePath}. Text length: ${text?.length ?? 0}`);
    return text;
  } catch (error) {
    console.error(`Error extracting text from ${filePath} (type ${ext}):`, error);
    let userMessage = `Failed to extract text from the ${ext} file.`;
    if (error.message.includes('password')) {
        userMessage = `Could not extract text: The ${ext} file seems to be password-protected.`;
    } else if (error.message.includes('corrupted') || error.message.includes('format')) {
        userMessage = `Could not extract text: The ${ext} file might be corrupted or in an unsupported format.`;
    } else if (error.message.includes('not found')) {
         userMessage = `Internal server error: Could not find the uploaded file for processing.`;
    }
    throw new Error(userMessage);
  }
}

module.exports = extractText;