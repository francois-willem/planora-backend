const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  businessId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Business", 
    required: true 
  },
  type: { 
    type: String, 
    enum: ["cancellation", "booking", "registration", "note", "catch-up-approval-request"], 
    required: true 
  },
  message: { 
    type: String, 
    required: true 
  },
  clientId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Client" 
  },
  sessionId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Session" 
  },
  isRead: { 
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
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Index for efficient querying
notificationSchema.index({ businessId: 1, createdAt: -1 });
notificationSchema.index({ businessId: 1, isRead: 1 });

module.exports = mongoose.model("Notification", notificationSchema);

