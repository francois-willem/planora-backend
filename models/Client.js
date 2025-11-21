const mongoose = require("mongoose");

const clientSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  businessId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Business", 
    required: true 
  },
  firstName: { 
    type: String, 
    required: true 
  },
  lastName: { 
    type: String, 
    required: true 
  },
  phone: { 
    type: String, 
    required: true 
  },
  dateOfBirth: { 
    type: Date 
  },
  emergencyContact: {
    name: { type: String },
    phone: { type: String },
    relationship: { type: String }
  },
  medicalInfo: {
    allergies: { type: String },
    medications: { type: String },
    conditions: { type: String }
  },
  address: {
    street: { type: String },
    city: { type: String },
    state: { type: String },
    zipCode: { type: String }
  },
  preferences: {
    preferredInstructor: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Instructor" 
    },
    preferredTimeSlots: [{ type: String }], // e.g., ["morning", "evening"]
    skillLevel: { 
      type: String, 
      enum: ["beginner", "intermediate", "advanced"], 
      default: "beginner" 
    }
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  joinedDate: { 
    type: Date, 
    default: Date.now 
  },
  lastActivity: { 
    type: Date, 
    default: Date.now 
  },
  cancellationCount: { 
    type: Number, 
    default: 0 
  },
  hasCancelledBefore: { 
    type: Boolean, 
    default: false 
  },
  catchUpApprovalStatus: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: null
  },
  catchUpApprovedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  catchUpApprovedAt: {
    type: Date
  },
  // Member management fields
  isPrimary: {
    type: Boolean,
    default: false  // true for the account owner, false for members
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false  // Only set for member clients (not primary)
  },
  relationship: {
    type: String,
    enum: ["self", "child", "spouse", "dependent", "other"],
    default: "self"  // "self" for primary, others for members
  }
});

module.exports = mongoose.model("Client", clientSchema);

