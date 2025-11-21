const mongoose = require("mongoose");

const userBusinessSchema = new mongoose.Schema({
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
  role: { 
    type: String, 
    enum: ["admin", "instructor", "employee", "client"], 
    required: true 
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  joinedAt: { 
    type: Date, 
    default: Date.now 
  },
  // Additional permissions or settings specific to this user-business relationship
  permissions: {
    canManageClients: { type: Boolean, default: false },
    canManageInstructors: { type: Boolean, default: false },
    canManageClasses: { type: Boolean, default: false },
    canManageSessions: { type: Boolean, default: false },
    canViewReports: { type: Boolean, default: false }
  }
});

// Ensure unique combination of user and business
userBusinessSchema.index({ userId: 1, businessId: 1 }, { unique: true });

// Set default permissions based on role
userBusinessSchema.pre('save', function(next) {
  if (this.isNew) {
    switch (this.role) {
      case 'admin':
        this.permissions = {
          canManageClients: true,
          canManageInstructors: true,
          canManageClasses: true,
          canManageSessions: true,
          canViewReports: true
        };
        break;
      case 'instructor':
        this.permissions = {
          canManageClients: false,
          canManageInstructors: false,
          canManageClasses: true,
          canManageSessions: true,
          canViewReports: false
        };
        break;
      case 'employee':
        this.permissions = {
          canManageClients: false,
          canManageInstructors: false,
          canManageClasses: true,
          canManageSessions: true,
          canViewReports: false
        };
        break;
      case 'client':
        this.permissions = {
          canManageClients: false,
          canManageInstructors: false,
          canManageClasses: false,
          canManageSessions: false,
          canViewReports: false
        };
        break;
    }
  }
  next();
});

module.exports = mongoose.model("UserBusiness", userBusinessSchema);
