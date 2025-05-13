 
const express = require("express");
const router = express.Router();
const upload = require("../config/multer");  
const summaryController = require("../controllers/summaryController");

 
router.post("/upload", (req, res, next) => {
    upload.single("file")(req, res, (err) => {
        if (err) {
            
            console.error("Multer upload error:", err.message);
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(413).json({ error: `File too large. Limit is ${upload.limits.fileSize / 1024 / 1024}MB.` });
            }
            
            return res.status(400).json({ error: err.message || "File upload failed." });
        }
        
        summaryController.uploadAndSummarize(req, res).catch(next);  
    });
});


 
router.get("/summaries", summaryController.getSummaries);

module.exports = router;