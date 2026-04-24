const express = require("express");
const cors = require("cors");
require("dotenv").config();
const protect = require("./middleware/authMiddleware");
const prisma = require("./prisma/client")

const app = express();

// middleware
app.use(cors());
app.use(express.json());

// health check route
app.get("/", (req, res) => {
  res.json({ message: "Server is running" });
});

// 'protect' function health check route
app.get("/api/protected", protect, (req, res) => {
  res.json({
    message: "You successfully accessed protected route",
    user: req.user
  })
});

// routes
const authRoutes = require("./routes/auth");
app.use("/api/auth", authRoutes);

const PORT = process.env.PORT || 5000;

// server start
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});