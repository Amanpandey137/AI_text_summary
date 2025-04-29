// //  server.js
// require("dotenv").config();
// const express = require("express");
// const cors = require("cors");
// const multer = require("multer");
// const fs = require("fs");
// const path = require("path");
// const pdf = require("pdf-parse");
// const mammoth = require("mammoth");
// const mongoose = require("mongoose");
// const {
//   GoogleGenerativeAI,
//   HarmCategory,
//   HarmBlockThreshold,
// } = require("@google/generative-ai");

// const app = express();
// const port = process.env.PORT || 5001;

// const Summary = require("./summary.js");

// const geminiApiKey = process.env.GEMINI_API_KEY;
// if (!geminiApiKey) {
//   console.error("FATAL ERROR: GEMINI_API_KEY is not defined in .env");
//   process.exit(1);
// }
// const genAI = new GoogleGenerativeAI(geminiApiKey);
// const geminiModel = genAI.getGenerativeModel({
//   model: "gemini-2.0-flash",
// });
// const generationConfig = {
//   maxOutputTokens: 1024,
// };

// const mongoUri = process.env.MONGODB_URI;
// if (!mongoUri) {
//   console.error("FATAL ERROR: MONGODB_URI is not defined in .env");
//   process.exit(1);
// }
// mongoose
//   .connect(mongoUri)
//   .then(() => console.log("MongoDB connected successfully."))
//   .catch((err) => {
//     console.error("MongoDB connection error:", err);
//     process.exit(1);
//   });

// app.use(cors());
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// const UPLOAD_DIR = "uploads/";
// if (!fs.existsSync(UPLOAD_DIR)) {
//   fs.mkdirSync(UPLOAD_DIR);
// }
// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, UPLOAD_DIR);
//   },
//   filename: function (req, file, cb) {
//     cb(null, Date.now() + "-" + file.originalname);
//   },
// });
// const fileFilter = (req, file, cb) => {
//   const allowedTypes =
//     /text\/plain|application\/pdf|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document/;
//   if (allowedTypes.test(file.mimetype)) {
//     cb(null, true);
//   } else {
//     cb(new Error("Invalid file type. Only TXT, PDF, and DOCX allowed."), false);
//   }
// };
// const upload = multer({
//   storage: storage,
//   fileFilter: fileFilter,
//   limits: { fileSize: 15 * 1024 * 1024 },// 15 MB limit
// }).single("file");

// async function extractText(filePath) {
//   const ext = path.extname(filePath).toLowerCase();
//   let text = "";
//   try {
//     if (ext === ".txt") {
//       text = fs.readFileSync(filePath, "utf-8");
//     } else if (ext === ".pdf") {
//       const data = await pdf(fs.readFileSync(filePath));
//       text = data.text;
//     } else if (ext === ".docx") {
//       const result = await mammoth.extractRawText({ path: filePath });
//       text = result.value;
//     } else {
//       throw new Error("Unsupported file type for text extraction.");
//     }
//     return text;
//   } catch (error) {
//     console.error(`Error extracting text from ${filePath}:`, error);
//     throw new Error(`Failed to extract text: ${error.message}`);
//   }
// }

// async function summarizeWithGemini(textToSummarize) {
//   if (!textToSummarize || textToSummarize.trim().length < 50) {
//     throw new Error("Text is too short to provide a meaningful summary.");
//   }

//   const prompt = `Please provide a concise summary of the following text:

//     --- TEXT START ---
//     ${textToSummarize}
//     --- TEXT END ---

//     Summary:`;

//   console.log(
//     `Sending text (length: ${textToSummarize.length}) to Gemini for summarization...`
//   );

//   try {
//     const result = await geminiModel.generateContent(prompt, generationConfig);
//     const response = await result.response;
//     const summaryText = response.text();

//     if (!summaryText || summaryText.trim().length === 0) {
//       console.warn(
//         "Gemini returned an empty summary. Response details:",
//         response
//       );

//       const blockReason = response.promptFeedback?.blockReason;
//       if (blockReason) {
//         throw new Error(
//           `Summarization blocked due to safety filters: ${blockReason}`
//         );
//       }
//       throw new Error(
//         "Failed to generate summary from the model (received empty response)."
//       );
//     }

//     console.log("Summary received from Gemini.");
//     return summaryText.trim();
//   } catch (error) {
//     console.error("Error calling Gemini API:", error);

//     let errorMessage =
//       "An error occurred while communicating with the summarization service.";
//     if (error.message.includes("SAFETY")) {
//       errorMessage =
//         "Summarization failed due to safety settings. The content may have been flagged.";
//     } else if (
//       error.message.includes("quota") ||
//       error.message.includes("limit")
//     ) {
//       errorMessage = "API usage limit reached. Please check your quota.";
//     } else if (error.message.includes("invalid api key")) {
//       errorMessage =
//         "Invalid API Key configured for the summarization service.";
//     }

//     throw new Error(errorMessage);
//   }
// }

// app.post("/upload", (req, res) => {
//   upload(req, res, async (err) => {
//     if (err) {
//       console.error("Upload error:", err.message);
//       return res.status(400).json({ error: err.message });
//     }
//     if (!req.file) {
//       return res
//         .status(400)
//         .json({ error: "No file uploaded or file type rejected." });
//     }

//     const filePath = req.file.path;
//     const originalFilename = req.file.originalname;
//     console.log(`File uploaded: ${filePath} (Original: ${originalFilename})`);

//     let extractedText = "";

//     try {
//       console.log("Extracting text...");
//       extractedText = await extractText(filePath);
//       console.log(`Text extracted (${extractedText.length} chars).`);

//       if (!extractedText || extractedText.trim().length === 0) {
//         throw new Error("Could not extract text from the file.");
//       }

//       console.log("Summarizing with Gemini...");
//       const geminiSummary = await summarizeWithGemini(extractedText);
//       console.log("Summarization complete.");

//       console.log("Saving summary to database...");
//       const newSummary = new Summary({
//         originalFilename: originalFilename,
//         originalTextLength: extractedText.length,
//         summary: geminiSummary,
//         modelVersion: geminiModel.model,
//       });
//       await newSummary.save();
//       console.log(`Summary saved with ID: ${newSummary._id}`);

//       res.json({
//         message: "File processed and summary saved!",
//         summaryId: newSummary._id,
//         summary: geminiSummary,
//       });
//     } catch (error) {
//       console.error("Processing error:", error);
//       res
//         .status(500)
//         .json({
//           error: error.message || "An error occurred during processing.",
//         });
//     } finally {
//       if (fs.existsSync(filePath)) {
//         fs.unlink(filePath, (unlinkErr) => {
//           if (unlinkErr)
//             console.error(`Error deleting temp file ${filePath}:`, unlinkErr);
//           else console.log(`Deleted temp file: ${filePath}`);
//         });
//       }
//     }
//   });
// });

// app.get("/summaries", async (req, res) => {
//   try {
//     const summaries = await Summary.find().sort({ createdAt: -1 }).limit(50);
//     res.json(summaries);
//   } catch (error) {
//     console.error("Error fetching summaries:", error);
//     res.status(500).json({ error: "Failed to retrieve summaries." });
//   }
// });

// app.listen(port, () => {
//   console.log(`Server listening at http://localhost:${port}`);
// });

// server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto"); // <--- Added for hashing
const pdf = require("pdf-parse");
const mammoth = require("mammoth");
const mongoose = require("mongoose");
const { LRUCache } = require("lru-cache"); // <--- Added LRU Cache library

const {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} = require("@google/generative-ai");

const app = express();
const port = process.env.PORT || 5001;

const Summary = require("./summary.js");

// --- Gemini Configuration ---
const geminiApiKey = process.env.GEMINI_API_KEY;
if (!geminiApiKey) {
  console.error("FATAL ERROR: GEMINI_API_KEY is not defined in .env");
  process.exit(1);
}
const genAI = new GoogleGenerativeAI(geminiApiKey);
 
const geminiModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
const generationConfig = {
 
  maxOutputTokens: 8192,  
  temperature: 0.7,  
  topP: 0.9,
  topK: 40,
};
 
const safetySettings = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];


// --- MongoDB Configuration ---
const mongoUri = process.env.MONGODB_URI;
if (!mongoUri) {
  console.error("FATAL ERROR: MONGODB_URI is not defined in .env");
  process.exit(1);
}
mongoose
  .connect(mongoUri)
  .then(() => console.log("MongoDB connected successfully."))
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

// --- Middleware ---
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- File Upload Configuration ---
const UPLOAD_DIR = "uploads/";
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR);
}
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    // Use a more robust unique filename if high concurrency is expected
    cb(null, Date.now() + "-" + Math.random().toString(36).substring(2, 8) + "-" + file.originalname);
  },
});
const fileFilter = (req, file, cb) => {
  const allowedTypes = /text\/plain|application\/pdf|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document/;
  const allowedExts = ['.txt', '.pdf', '.docx'];
  const fileExt = path.extname(file.originalname).toLowerCase();

  if (allowedTypes.test(file.mimetype) && allowedExts.includes(fileExt)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type or extension. Only TXT, PDF, DOCX allowed. Detected mimetype: ${file.mimetype}, ext: ${fileExt}`), false);
  }
};
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 }, // Increased to 20 MB limit
}).single("file");

// --- LRU Cache Configuration ---
const CACHE_MAX_ITEMS = process.env.CACHE_MAX_ITEMS || 100; // Max summaries to cache
const CACHE_TTL_MINUTES = process.env.CACHE_TTL_MINUTES || 60; // Cache item lifetime

const cacheOptions = {
  max: parseInt(CACHE_MAX_ITEMS, 10),
  // Time To Live in milliseconds
  ttl: parseInt(CACHE_TTL_MINUTES, 10) * 60 * 1000,
  // updateAgeOnGet: true // Uncomment if accessing should refresh TTL (true LRU)
};
const summaryCache = new LRUCache(cacheOptions);
console.log(`LRU Cache initialized: Max Items=${cacheOptions.max}, TTL=${cacheOptions.ttl / 60000} minutes`);

// --- Helper Functions ---

/**
 * Calculates SHA-256 hash of a string.
 * @param {string} text - The text content to hash.
 * @returns {string} - The hex digest of the hash.
 */
function getTextHash(text) {
    if (!text) return null;
    return crypto.createHash('sha256').update(text, 'utf-8').digest('hex');
}


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
      // Mammoth works better with path in some cases
      const result = await mammoth.extractRawText({ path: filePath });
      text = result.value;
    } else {
      // This case should technically be prevented by fileFilter
      throw new Error(`Unsupported file type for text extraction: ${ext}`);
    }
    console.log(`Extraction successful for ${filePath}. Text length: ${text?.length ?? 0}`);
    return text;
  } catch (error) {
    console.error(`Error extracting text from ${filePath} (type ${ext}):`, error);
    // Improve error message based on common issues
    let userMessage = `Failed to extract text from the ${ext} file.`;
    if (error.message.includes('password')) {
        userMessage = `Could not extract text: The ${ext} file seems to be password-protected.`;
    } else if (error.message.includes('corrupted') || error.message.includes('format')) {
        userMessage = `Could not extract text: The ${ext} file might be corrupted or in an unsupported format.`;
    } else if (error.message.includes('not found')) {
         userMessage = `Internal server error: Could not find the uploaded file for processing.`; // Should not happen often
    }
    throw new Error(userMessage);  
  }
}

// --- Concurrency Handling for API Calls ---
// Map to track ongoing Gemini requests by content hash
const ongoingRequests = new Map();

async function summarizeWithGemini(textToSummarize, contentHash) {
  // Input validation
  if (!textToSummarize || textToSummarize.trim().length < 30) { // Increased min length slightly
     // Don't treat very short text as an error, just return a specific message
     console.log("Text too short for summarization, returning as is.");
     return "Input text is too short to generate a meaningful summary.";
    // throw new Error("Text is too short to provide a meaningful summary (min 30 chars).");
  }

  // --- Concurrency Check ---
  if (ongoingRequests.has(contentHash)) {
    console.log(`Request for hash ${contentHash.substring(0,8)}... already in progress. Waiting...`);
    // Return the promise of the ongoing request to avoid duplicate API calls
    return ongoingRequests.get(contentHash);
  }

  const prompt = `Provide a concise, well-structured summary of the following text. Focus on the key points and main ideas. Output only the summary text.

TEXT:
"""
${textToSummarize.substring(0, 100000)}
"""

SUMMARY:`; // Limit input length if necessary for the model

  console.log(
    `Sending text (hash: ${contentHash.substring(0,8)}..., length: ${textToSummarize.length}) to Gemini...`
  );

  // Create the promise for the API call
  const apiCallPromise = (async () => {
      try {
        const result = await geminiModel.generateContent(
            { contents: [{ role: "user", parts: [{ text: prompt }] }] },
             generationConfig,
            // safetySettings // Pass safety settings if defined
        );

        // Proper way to access response in v1.0.0+
         if (!result || !result.response) {
            throw new Error("Invalid response structure received from Gemini.");
        }
        const response = result.response;

        // Check for blocked content *before* accessing text()
        const promptFeedback = response.promptFeedback;
        if (promptFeedback?.blockReason) {
          console.warn(`Gemini request blocked. Reason: ${promptFeedback.blockReason}`, promptFeedback);
          throw new Error(
            `Summarization blocked due to safety filters: ${promptFeedback.blockReason}. ${promptFeedback.blockReasonMessage || ''}`
          );
        }

        // Check candidates and text
        if (!response.candidates || response.candidates.length === 0 || !response.candidates[0].content?.parts?.[0]?.text) {
             console.warn("Gemini returned no valid summary text. Full response:", JSON.stringify(response, null, 2));
             // Attempt to get finish reason if available
             const finishReason = response.candidates?.[0]?.finishReason;
             if(finishReason && finishReason !== 'STOP'){
                 throw new Error(`Summarization failed. Reason: ${finishReason}`);
             }
             throw new Error(
                "Failed to generate summary (no text found in response candidates)."
            );
        }

        const summaryText = response.candidates[0].content.parts[0].text;

        if (!summaryText || summaryText.trim().length === 0) {
          console.warn("Gemini returned an empty summary string.");
          throw new Error(
            "Failed to generate summary (received empty string)."
          );
        }

        console.log(`Summary received from Gemini for hash ${contentHash.substring(0,8)}...`);
        return summaryText.trim();
      } catch (error) {
        console.error(`Error calling Gemini API for hash ${contentHash.substring(0,8)}...:`, error);

        // Refine error messages
        let errorMessage = "An error occurred while communicating with the summarization service.";
        if (error.message.includes("SAFETY") || error.message.includes("blocked due to safety")) {
          errorMessage = error.message; // Use the specific safety message
        } else if (error.message.includes("quota") || error.message.includes("limit") || error.response?.status === 429) {
          errorMessage = "API usage limit reached or rate limit exceeded. Please check your quota or try again later.";
        } else if (error.message.includes("API key not valid")) {
          errorMessage = "Invalid API Key configured for the summarization service.";
        } else if (error.response?.status === 400) {
             errorMessage = `Invalid request sent to summarization service. ${error.message}`;
        } else if (error.message.includes("Failed to generate summary")) {
             errorMessage = error.message; // Keep specific generation failure messages
        }
        // Add more specific checks if needed

        throw new Error(errorMessage); // Rethrow with potentially more specific message
      } finally {
          // --- Remove from ongoing requests map once done ---
          ongoingRequests.delete(contentHash);
          console.log(`Removed hash ${contentHash.substring(0,8)}... from ongoing requests.`);
      }
  })(); // Immediately invoke the async function

  // Store the promise in the map
  ongoingRequests.set(contentHash, apiCallPromise);
  console.log(`Added hash ${contentHash.substring(0,8)}... to ongoing requests.`);

  return apiCallPromise; // Return the promise
}


// --- API Endpoints ---

app.post("/upload", (req, res) => {
  // Use Multer middleware first
  upload(req, res, async (err) => {
    const startTime = Date.now(); // Track processing time
    let cacheStatus = "disabled"; // Default if hashing fails or text is empty
    let filePath = null; // Keep track of file path for deletion

    // Handle Multer errors (e.g., file size, type)
    if (err) {
      console.error("Upload error:", err.message);
       // Check for specific Multer errors
       if (err.code === 'LIMIT_FILE_SIZE') {
         return res.status(413).json({ error: `File too large. Limit is ${upload.limits.fileSize / 1024 / 1024}MB.` });
       }
      return res.status(400).json({ error: err.message || "File upload failed." });
    }
    // Check if file exists after Multer processing
    if (!req.file) {
      // This might happen if fileFilter rejected the file silently earlier
      return res.status(400).json({ error: "No file uploaded or file type not allowed." });
    }

    filePath = req.file.path; // Assign file path now that we know upload succeeded
    const originalFilename = req.file.originalname;
    console.log(`\n--- New Request ---`);
    console.log(`File uploaded: ${filePath} (Original: ${originalFilename}, Size: ${req.file.size} bytes)`);

    let extractedText = "";
    let contentHash = null;

    try {
      // --- 1. Extract Text ---
      console.log("Step 1: Extracting text...");
      extractedText = await extractText(filePath);
      console.log(`Text extracted (${extractedText?.length ?? 0} chars).`);

      // Handle cases where extraction yielded no text (e.g., empty file, unsupported format inside container)
      if (!extractedText || extractedText.trim().length === 0) {
           console.warn(`No text content found in ${originalFilename} after extraction.`);
           // Decide how to handle: error or specific message? Let's return a specific message.
           return res.status(200).json({ // Use 200 OK as the file was processed, but no summary possible
               message: "File processed, but no text content found or file was empty. Cannot summarize.",
               summary: null, // Explicitly null
               cacheStatus: "not_applicable",
               processingTimeMs: Date.now() - startTime,
           });
      }

      // --- 2. Calculate Hash ---
      console.log("Step 2: Calculating content hash...");
      contentHash = getTextHash(extractedText);
      if (!contentHash) throw new Error("Failed to calculate content hash."); // Should not happen if text exists
      console.log(`Content hash: ${contentHash.substring(0, 10)}...`);
      cacheStatus = "miss"; // Assume miss initially

      // --- 3. Check Cache ---
      console.log("Step 3: Checking cache...");
      const cachedSummary = summaryCache.get(contentHash);

      let finalSummary = "";

      if (cachedSummary) {
        // --- Cache Hit ---
        cacheStatus = "hit";
        finalSummary = cachedSummary;
        console.log(`Cache HIT for hash ${contentHash.substring(0, 10)}...`);
        // Optionally: Update database timestamp if needed on hit? No, let's keep it simple.

      } else {
        // --- Cache Miss ---
        cacheStatus = "miss";
        console.log(`Cache MISS for hash ${contentHash.substring(0, 10)}...`);

        // --- 4. Summarize (Call Gemini via wrapper) ---
        console.log("Step 4: Summarizing with Gemini...");
        // Pass contentHash for concurrency check inside the function
        finalSummary = await summarizeWithGemini(extractedText, contentHash);
        console.log("Summarization complete.");

        // --- 5. Store in Cache ---
        console.log(`Step 5: Storing result in cache (Key: ${contentHash.substring(0, 10)}...)`);
        summaryCache.set(contentHash, finalSummary);

        // --- 6. Store in Database (Only on Cache Miss/New Summary) ---
        console.log("Step 6: Saving new summary to database...");
        const newSummary = new Summary({
          originalFilename: originalFilename,
          originalTextLength: extractedText.length,
          contentHash: contentHash, // Store hash for potential future lookups/deduplication
          summary: finalSummary,
          modelVersion: geminiModel.model, // Use the actual model name string
        });
        await newSummary.save();
        console.log(`New summary saved with ID: ${newSummary._id}`);
      }

      // --- 7. Send Response ---
      const processingTimeMs = Date.now() - startTime;
      console.log(`Request completed. Status: ${cacheStatus}, Time: ${processingTimeMs}ms`);
      res.status(200).json({
        message: `File processed successfully. (Cache: ${cacheStatus})`,
        summary: finalSummary,
        cacheStatus: cacheStatus,
        processingTimeMs: processingTimeMs,
        // summaryId: newSummary?._id || null // Only include ID if saved? Or maybe not needed?
      });

    } catch (error) {
      // --- Error Handling ---
      console.error("Error during file processing:", error);
      // Determine appropriate status code
      let statusCode = 500; // Default to Internal Server Error
      if (error.message.includes("extract text")) statusCode = 422; // Unprocessable Entity (can't read file content)
      if (error.message.includes("too short")) statusCode = 400; // Bad Request
      if (error.message.includes("API usage limit") || error.message.includes("quota")) statusCode = 429; // Too Many Requests
      if (error.message.includes("SAFETY") || error.message.includes("blocked")) statusCode = 400; // Bad Request (content issue)
      if (error.message.includes("Invalid API Key")) statusCode = 503; // Service Unavailable (config issue)

      res.status(statusCode).json({
          error: error.message || "An unexpected error occurred during processing.",
        });

    } finally {
      // --- File Cleanup ---
      if (filePath && fs.existsSync(filePath)) {
        fs.unlink(filePath, (unlinkErr) => {
          if (unlinkErr)
            console.error(`Error deleting temp file ${filePath}:`, unlinkErr);
          else console.log(`Deleted temp file: ${filePath}`);
        });
      }
    }
  });
});

// Endpoint to get recent summaries (unchanged, but now includes hash)
app.get("/summaries", async (req, res) => {
  try {
    const summaries = await Summary.find().sort({ createdAt: -1 }).limit(50); // Added contentHash field automatically
    res.json(summaries);
  } catch (error) {
    console.error("Error fetching summaries:", error);
    res.status(500).json({ error: "Failed to retrieve summaries." });
  }
});

// Basic health check endpoint
app.get("/health", (req, res) => {
    res.status(200).json({ status: "UP", timestamp: new Date().toISOString() });
});

// --- Start Server ---
app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});