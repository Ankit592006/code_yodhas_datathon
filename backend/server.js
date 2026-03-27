// require('dns').setDefaultResultOrder('ipv4first');

// const express = require("express");
// const mongoose = require("mongoose");
// const cors = require("cors");
// const dotenv = require("dotenv");

// // Load env variables
// dotenv.config();

// const app = express();
// const reportRoutes = require("./routes/reportRoutes");

// app.use("/api", reportRoutes);
// // Middleware
// app.use(cors());
// app.use(express.json());

// // Test Route
// app.get("/", (req, res) => {
//   res.send("API is running...");
// });

// // Routes
// const dataRoutes = require("./routes/dataRoutes");
// app.use("/api", dataRoutes);

// // ✅ MongoDB LOCAL Connection (NO ATLAS)
// mongoose.connect(process.env.MONGO_URI, {
//   serverSelectionTimeoutMS: 30000
// })
// .then(() => console.log("✅ MongoDB Atlas Connected"))
// .catch(err => console.log("❌ Error:", err));

// // Start server
// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => {
//   console.log(`🚀 Server running on port ${PORT}`);
// });

require('dns').setDefaultResultOrder('ipv4first');

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
const dataRoutes = require("./routes/dataRoutes");
const reportRoutes = require("./routes/reportRoutes");
const authRoutes = require("./routes/authRoutes"); // ✅ NEW
const dashboardRoutes = require("./routes/dashboardRoutes");
const trackerRoutes = require("./routes/trackerRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const chatRoutes = require("./routes/chatRoutes");
const profileRoutes = require("./routes/profileRoutes");

//app.use("/api", profileRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/tracker", trackerRoutes);

app.use("/api/dashboard", dashboardRoutes);
app.use("/api", dataRoutes);
app.use("/api", reportRoutes);
app.use("/api/auth", authRoutes); // ✅ AUTH ROUTES

// Test
app.get("/", (req, res) => {
  res.send("API is running...");
});

// MongoDB
mongoose.connect(process.env.MONGO_URI, {
  serverSelectionTimeoutMS: 30000
})
.then(() => console.log("✅ MongoDB Atlas Connected"))
.catch(err => console.log("❌ Error:", err));

// Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});