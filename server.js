const express = require("express");
const cors = require("cors");
require("dotenv").config();
const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const businessRoutes = require("./routes/business");
const clientRoutes = require("./routes/clients");
const employeeRoutes = require("./routes/employees");
const sessionRoutes = require("./routes/sessions");
const classRoutes = require("./routes/classes");
const noteRoutes = require("./routes/notes");

const app = express();

app.use(cors());
app.use(express.json());

// TEMPORARY: Test endpoint without authentication
app.get("/api/test", (req, res) => {
  res.json({ message: "Server is working!", timestamp: new Date() });
});

// TEMPORARY: Super admin endpoints without authentication for development
const Business = require("./models/Business");
app.get("/api/dev/businesses", async (req, res) => {
  try {
    const businesses = await Business.find({})
      .select('-__v')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      count: businesses.length,
      data: businesses
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching businesses",
      error: error.message
    });
  }
});

app.put("/api/dev/businesses/:id", async (req, res) => {
  try {
    const { isActive, notes } = req.body;
    const business = await Business.findByIdAndUpdate(
      req.params.id,
      { isActive, notes },
      { new: true }
    );
    
    if (!business) {
      return res.status(404).json({
        success: false,
        message: "Business not found"
      });
    }
    
    res.json({
      success: true,
      message: `Business ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: business
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating business",
      error: error.message
    });
  }
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/businesses", businessRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/classes", classRoutes);
app.use("/api/notes", noteRoutes);

const PORT = process.env.PORT || 4000;

// Connect to database
connectDB();

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});


