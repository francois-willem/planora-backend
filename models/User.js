const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  firstName: { type: String, required: false },
  lastName: { type: String, required: false },
  role: { 
    type: String, 
    enum: ["super-admin", "admin", "employee", "client"], 
    default: "client" 
  },
  // Keep businessId for backward compatibility, but make it optional
  businessId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Business", 
    required: false // Changed from function to false
  },
  // New field to track current active business context
  currentBusinessId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Business", 
    required: false 
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  // Client approval status (only applies to client role)
  clientStatus: {
    type: String,
    enum: ["pending", "approved", "suspended"],
    default: "pending"
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
});

module.exports = mongoose.model("User", userSchema);
