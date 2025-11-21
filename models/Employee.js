const mongoose = require("mongoose");

const employeeSchema = new mongoose.Schema({
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
  certifications: [{
    name: { type: String, required: true },
    issuingBody: { type: String, required: true },
    issueDate: { type: Date, required: true },
    expiryDate: { type: Date },
    isActive: { type: Boolean, default: true }
  }],
  specializations: [{ 
    type: String 
  }], // e.g., ["adult-swimming", "children", "competitive"]
  bio: { 
    type: String 
  },
  hourlyRate: { 
    type: Number 
  },
  availability: {
    monday: [{ start: String, end: String }], // "09:00", "17:00"
    tuesday: [{ start: String, end: String }],
    wednesday: [{ start: String, end: String }],
    thursday: [{ start: String, end: String }],
    friday: [{ start: String, end: String }],
    saturday: [{ start: String, end: String }],
    sunday: [{ start: String, end: String }]
  },
  maxClientsPerClass: { 
    type: Number, 
    default: 8 
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  // Employee approval status
  status: {
    type: String,
    enum: ["pending", "approved", "rejected", "suspended"],
    default: "pending"
  },
  // Approval details
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false
  },
  approvedAt: {
    type: Date,
    required: false
  },
  rejectionReason: {
    type: String,
    required: false
  },
  hireDate: { 
    type: Date, 
    default: Date.now 
  },
  lastActivity: { 
    type: Date, 
    default: Date.now 
  }
});

module.exports = mongoose.model("Employee", employeeSchema);

