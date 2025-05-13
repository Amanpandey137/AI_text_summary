 
const express = require("express");
const cors = require("cors");
const { PORT } = require("./config/env");  
const connectDB = require("./config/database");
const summaryRoutes = require("./routes/summaryRoutes");
const healthRoutes = require("./routes/healthRoutes");

// --- Connect to Database ---
connectDB();

const app = express();

// --- Middleware ---
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Routes ---
app.use("/api", summaryRoutes);  
app.use("/", healthRoutes);     

 
app.use((err, req, res, next) => {
  console.error("Unhandled Error:", err.stack || err);
 
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(statusCode).json({ error: message });
});


// --- Start Server ---
app.listen(PORT, () => {
  console.log(`Server listening at http://localhost:${PORT}`);
});