const mongoose = require("mongoose");

const businessCodeSchema = new mongoose.Schema({
  businessId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Business", 
    required: true 
  },
  code: { 
    type: String, 
    required: true, 
    unique: true,
    uppercase: true
  },
  name: { 
    type: String, 
    required: true 
  },
  description: { 
    type: String 
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  autoApprove: { 
    type: Boolean, 
    default: false 
  },
  maxUses: { 
    type: Number, 
    default: null // null = unlimited
  },
  currentUses: { 
    type: Number, 
    default: 0 
  },
  expiresAt: { 
    type: Date, 
    default: null // null = never expires
  },
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Generate unique code before saving
businessCodeSchema.pre('save', async function(next) {
  if (this.isNew && !this.code) {
    // Generate a 6-character alphanumeric code
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code;
    let isUnique = false;
    
    while (!isUnique) {
      code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      
      const existing = await this.constructor.findOne({ code });
      if (!existing) {
        isUnique = true;
      }
    }
    
    this.code = code;
  }
  next();
});

// Check if code is valid and can be used
businessCodeSchema.methods.canBeUsed = function() {
  if (!this.isActive) return false;
  if (this.expiresAt && this.expiresAt < new Date()) return false;
  if (this.maxUses && this.currentUses >= this.maxUses) return false;
  return true;
};

module.exports = mongoose.model("BusinessCode", businessCodeSchema);
