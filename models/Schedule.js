const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema({
  businessId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Business", 
    required: true 
  },
  classId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Class", 
    required: true 
  },
  instructorId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Employee", 
    required: true 
  },
  date: { 
    type: Date, 
    required: false 
  },
  startTime: { 
    type: String, 
    required: true 
  }, // "09:00"
  endTime: { 
    type: String, 
    required: true 
  }, // "09:30"
  dayOfWeek: { 
    type: String, 
    enum: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
  },
  isRecurring: { 
    type: Boolean, 
    default: false 
  },
  recurringPattern: {
    frequency: { 
      type: String, 
      enum: ["weekly", "bi-weekly", "monthly"] 
    },
    endDate: { type: Date }
  },
  status: { 
    type: String, 
    enum: ["scheduled", "confirmed", "cancelled", "completed", "no-show"], 
    default: "scheduled" 
  },
  enrolledClients: [{
    clientId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Client", 
      required: true 
    },
    enrollmentDate: { 
      type: Date, 
      default: Date.now 
    },
    status: { 
      type: String, 
      enum: ["enrolled", "confirmed", "cancelled", "no-show", "completed"], 
      default: "enrolled" 
    },
    isCatchUp: { 
      type: Boolean, 
      default: false 
    } // true if this is a catch-up lesson
  }],
  waitlist: [{
    clientId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Client", 
      required: true 
    },
    addedDate: { 
      type: Date, 
      default: Date.now 
    }
  }],
  notes: { 
    type: String 
  },
  isAvailableForCatchUp: { 
    type: Boolean, 
    default: false 
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
sessionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for efficient querying
sessionSchema.index({ businessId: 1, date: 1 });
sessionSchema.index({ instructorId: 1, date: 1 });
sessionSchema.index({ classId: 1, date: 1 });

module.exports = mongoose.model("Session", sessionSchema);

