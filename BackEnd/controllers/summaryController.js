 
const fs = require("fs");
const Summary = require("../summary.js");  
const { geminiModel } = require("../config/gemini");  
const summaryCache = require("../config/cache");
const extractText = require("../utils/textExtractor");
const getTextHash = require("../utils/hashHelper");
const { summarizeWithGemini } = require("../services/geminiService");
const uploadConfig = require("../config/multer"); 
const uploadAndSummarize = async (req, res) => {
  const startTime = Date.now();
  let cacheStatus = "disabled";
  let filePath = null;

 
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded or file type not allowed." });
  }

  filePath = req.file.path;
  const originalFilename = req.file.originalname;
  console.log(`\n--- New Request ---`);
  console.log(`File uploaded: ${filePath} (Original: ${originalFilename}, Size: ${req.file.size} bytes)`);

  let extractedText = "";
  let contentHash = null;

  try {
    console.log("Step 1: Extracting text...");
    extractedText = await extractText(filePath);
    console.log(`Text extracted (${extractedText?.length ?? 0} chars).`);

    if (!extractedText || extractedText.trim().length === 0) {
         console.warn(`No text content found in ${originalFilename} after extraction.`);
         return res.status(200).json({
             message: "File processed, but no text content found or file was empty. Cannot summarize.",
             summary: null,
             cacheStatus: "not_applicable",
             processingTimeMs: Date.now() - startTime,
         });
    }

    console.log("Step 2: Calculating content hash...");
    contentHash = getTextHash(extractedText);
    if (!contentHash) throw new Error("Failed to calculate content hash.");
    console.log(`Content hash: ${contentHash.substring(0, 10)}...`);
    cacheStatus = "miss";

    console.log("Step 3: Checking cache...");
    const cachedSummary = summaryCache.get(contentHash);
    let finalSummary = "";

    if (cachedSummary) {
      cacheStatus = "hit";
      finalSummary = cachedSummary;
      console.log(`Cache HIT for hash ${contentHash.substring(0, 10)}...`);
    } else {
      cacheStatus = "miss";
      console.log(`Cache MISS for hash ${contentHash.substring(0, 10)}...`);
      console.log("Step 4: Summarizing with Gemini...");
      finalSummary = await summarizeWithGemini(extractedText, contentHash);
      console.log("Summarization complete.");

      console.log(`Step 5: Storing result in cache (Key: ${contentHash.substring(0, 10)}...)`);
      summaryCache.set(contentHash, finalSummary);

      console.log("Step 6: Saving new summary to database...");
      const newSummary = new Summary({
        originalFilename: originalFilename,
        originalTextLength: extractedText.length,
        contentHash: contentHash,
        summary: finalSummary,
        modelVersion: geminiModel.model,  
      });
      await newSummary.save();
      console.log(`New summary saved with ID: ${newSummary._id}`);
    }

    const processingTimeMs = Date.now() - startTime;
    console.log(`Request completed. Status: ${cacheStatus}, Time: ${processingTimeMs}ms`);
    res.status(200).json({
      message: `File processed successfully. (Cache: ${cacheStatus})`,
      summary: finalSummary,
      cacheStatus: cacheStatus,
      processingTimeMs: processingTimeMs,
    });

  } catch (error) {
    console.error("Error during file processing:", error);
    let statusCode = 500;
    if (error.message.includes("extract text")) statusCode = 422;
    if (error.message.includes("too short")) statusCode = 400;
    if (error.message.includes("API usage limit") || error.message.includes("quota")) statusCode = 429;
    if (error.message.includes("SAFETY") || error.message.includes("blocked")) statusCode = 400;
    if (error.message.includes("Invalid API Key")) statusCode = 503;
     
    if (error.code === 'LIMIT_FILE_SIZE') {
        statusCode = 413;
        error.message = `File too large. Limit is ${uploadConfig.limits.fileSize / 1024 / 1024}MB.`;
    }


    res.status(statusCode).json({
        error: error.message || "An unexpected error occurred during processing.",
      });
  } finally {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlink(filePath, (unlinkErr) => {
        if (unlinkErr) console.error(`Error deleting temp file ${filePath}:`, unlinkErr);
        else console.log(`Deleted temp file: ${filePath}`);
      });
    }
  }
};

const getSummaries = async (req, res) => {
  try {
    const summaries = await Summary.find().sort({ createdAt: -1 }).limit(50);
    res.json(summaries);
  } catch (error) {
    console.error("Error fetching summaries:", error);
    res.status(500).json({ error: "Failed to retrieve summaries." });
  }
};

module.exports = {
  uploadAndSummarize,
  getSummaries,
};