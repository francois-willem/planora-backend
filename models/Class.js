const mongoose = require("mongoose");

const classSchema = new mongoose.Schema({
  businessId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Business", 
    required: true 
  },
  instructorId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Employee", 
    required: false 
  },
  title: { 
    type: String, 
    required: true 
  },
  description: { 
    type: String 
  },
  classType: { 
    type: String, 
    enum: ["private", "group"], 
    required: true 
  },
  maxCapacity: { 
    type: Number, 
    required: true 
  },
  currentEnrollment: { 
    type: Number, 
    default: 0 
  },
  isActive: { 
    type: Boolean, 
    default: true 
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
classSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("Class", classSchema);

