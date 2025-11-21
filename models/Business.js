const mongoose = require("mongoose");

const businessSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
  },
  email: { 
    type: String, 
    required: true, 
    unique: true 
  },
  phone: { 
    type: String, 
    required: false 
  },
  address: {
    type: String,
    required: false
  },
  businessType: { 
    type: String, 
    required: true
  },
  description: { 
    type: String 
  },
  website: { 
    type: String 
  },
  businessCode: {
    type: String,
    unique: true,
    sparse: true // Allows null values but ensures uniqueness when present
  },
  adminUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false // Will be set when business admin is created
  },
  status: {
    type: String,
    enum: ["pending", "active", "suspended"],
    default: "pending"
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  subscriptionTier: { 
    type: String, 
    enum: ["basic", "premium", "enterprise"], 
    default: "basic" 
  },
  settings: {
    timezone: { type: String, default: "America/New_York" },
    defaultClassDuration: { type: Number, default: 30 }, // minutes
    allowOnlineBooking: { type: Boolean, default: true },
    requireApproval: { type: Boolean, default: false }
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Update the updatedAt field before saving
businessSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("Business", businessSchema);

