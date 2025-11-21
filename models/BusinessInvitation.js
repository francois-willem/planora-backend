const mongoose = require("mongoose");

const businessInvitationSchema = new mongoose.Schema({
  businessId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Business", 
    required: true 
  },
  email: { 
    type: String, 
    required: true 
  },
  role: { 
    type: String, 
    enum: ["admin", "instructor", "client"], 
    required: true 
  },
  invitedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  token: { 
    type: String, 
    required: true, 
    unique: true 
  },
  status: { 
    type: String, 
    enum: ["pending", "accepted", "expired", "cancelled"], 
    default: "pending" 
  },
  message: { 
    type: String 
  },
  expiresAt: { 
    type: Date, 
    default: function() {
      // Expire in 7 days
      return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    }
  },
  acceptedAt: { 
    type: Date 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Generate unique token before saving
businessInvitationSchema.pre('save', async function(next) {
  if (this.isNew && !this.token) {
    const crypto = require('crypto');
    this.token = crypto.randomBytes(32).toString('hex');
  }
  next();
});

// Check if invitation is valid
businessInvitationSchema.methods.isValid = function() {
  return this.status === 'pending' && this.expiresAt > new Date();
};

module.exports = mongoose.model("BusinessInvitation", businessInvitationSchema);
