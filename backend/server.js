const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const compression = require("compression");
const connectDB = require("./config/db");

dotenv.config();
connectDB();

const app = express();

// SPEED OPTIMIZATION
app.use(compression());
app.use(cors());
app.use(express.json());

// ROUTES
app.use("/api/catalog", require("./routes/catalogRoutes"));
app.use("/api/bills", require("./routes/billRoutes"));
app.use("/api/customers", require("./routes/customerRoutes"));
app.use("/api/drafts", require("./routes/draftRoutes"));
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/reports", require("./routes/reportsRoutes"));
app.get("/", (req, res) => {
  res.json({
    message: "ABC Company Billing API",
    endpoints: {
      catalog: "/api/catalog",
      bills: "/api/bills",
      customers: "/api/customers",
      drafts: "/api/drafts"
    }
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});