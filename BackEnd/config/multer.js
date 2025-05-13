 
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const UPLOAD_DIR = "uploads/";
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true }); 
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
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
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB limit
});

module.exports = upload; // Export the configured multer instance