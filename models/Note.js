const mongoose = require("mongoose");

const noteSchema = new mongoose.Schema({
  businessId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Business", 
    required: true 
  },
  sessionId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Session", 
    required: true 
  },
  instructorId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Instructor", 
    required: true 
  },
  clientId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Client", 
    required: true 
  },
  content: { 
    type: String, 
    required: true 
  },
  noteType: { 
    type: String, 
    enum: ["progress", "behavior", "medical", "general", "homework"], 
    default: "general" 
  },
  isVisibleToClient: { 
    type: Boolean, 
    default: false 
  },
  isVisibleToAdmin: { 
    type: Boolean, 
    default: true 
  },
  priority: { 
    type: String, 
    enum: ["low", "medium", "high"], 
    default: "medium" 
  },
  tags: [{ 
    type: String 
  }], // e.g., ["improvement", "concern", "achievement"]
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
noteSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for efficient querying
noteSchema.index({ businessId: 1, clientId: 1 });
noteSchema.index({ sessionId: 1 });
noteSchema.index({ instructorId: 1, createdAt: -1 });

module.exports = mongoose.model("Note", noteSchema);

