// controllers/authController.js
// Authentication controller for handling user registration, login, and authentication
// This file contains all the backend logic for user authentication and authorization

// Import required models and libraries
const User = require("../models/User"); // User model for database operations
const UserBusiness = require("../models/UserBusiness"); // User-Business relationship model
const BusinessInvitation = require("../models/BusinessInvitation"); // Business invitation model
const Business = require("../models/Business"); // Business model
const bcrypt = require("bcryptjs"); // Library for password hashing
const jwt = require("jsonwebtoken"); // Library for JSON Web Token generation

// Generate JWT token for user authentication
// JWT tokens are used to maintain user sessions across requests
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: "7d", // Token expires after 7 days
  });
};

// @desc   Register new user
// @route  POST /api/auth/register
// @access Public
const registerUser = async (req, res) => {
  // Extract user data from request body
  const { email, password, role } = req.body;

  try {
    // Check if user already exists in database
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "User already exists" });

    // Hash the password for security (never store plain text passwords)
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user in database
    const user = await User.create({
      email,
      password: hashedPassword, // Store hashed password
      role: role || "client", // Default role is 'client' if not specified
    });

    // Return user data and authentication token
    res.status(201).json({
      _id: user._id, // User's unique ID
      email: user.email, // User's email
      role: user.role, // User's role
      token: generateToken(user._id, user.role), // JWT token for authentication
    });
  } catch (err) {
    // Handle any errors that occur during registration
    res.status(500).json({ message: err.message });
  }
};

// @desc   Login user
// @route  POST /api/auth/login
// @access Public
const loginUser = async (req, res) => {
  // Extract login credentials from request body
  const { email, password } = req.body;

  try {
    // Find user by email in database
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    // Verify password by comparing with hashed password in database
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    // Initialize variables for business associations
    let businessAssociations = [];
    let currentBusiness = null;

    // For non-super-admin users, get their business associations
    if (user.role !== "super-admin") {
      // Find all active business associations for this user
      businessAssociations = await UserBusiness.find({ 
        userId: user._id, 
        isActive: true 
      }).populate('businessId', 'name email businessType address businessCode status');

      // Set current business if user has one selected
      if (user.currentBusinessId) {
        currentBusiness = businessAssociations.find(
          assoc => assoc.businessId._id.toString() === user.currentBusinessId.toString()
        );
      } else if (businessAssociations.length > 0) {
        // If no current business set, use the first one
        currentBusiness = businessAssociations[0];
        user.currentBusinessId = currentBusiness.businessId._id;
        await user.save();
      }

      // Check if business admin is trying to access a pending business
      if (user.role === "admin" && currentBusiness && currentBusiness.businessId.status === "pending") {
        return res.status(403).json({ 
          message: "Your business account is pending activation. Please wait for super admin approval before accessing the dashboard.",
          businessStatus: "pending",
          businessName: currentBusiness.businessId.name,
          // Include token and user data so business admin can access pending approval page
          token: generateToken(user._id, user.role),
          _id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          businessAssociations: businessAssociations,
          currentBusiness: currentBusiness,
          isSuperAdmin: user.role === "super-admin"
        });
      }

      // Check if employee is trying to access with pending approval
      if (user.role === "employee") {
        const Employee = require("../models/Employee");
        const employee = await Employee.findOne({ 
          userId: user._id, 
          businessId: currentBusiness?.businessId?._id,
          isActive: true 
        });

        if (employee && employee.status === "pending") {
          return res.status(403).json({ 
            message: "Your employee account is pending approval by the business administrator. Please wait for approval before accessing your dashboard.",
            employeeStatus: "pending",
            businessName: currentBusiness?.businessId?.name || 'your business',
            // Include token and user data so employee can access pending approval page
            token: generateToken(user._id, user.role),
            _id: user._id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            businessAssociations: businessAssociations,
            currentBusiness: currentBusiness,
            isSuperAdmin: user.role === "super-admin"
          });
        }

        if (employee && employee.status === "rejected") {
          return res.status(403).json({ 
            message: `Your employee account has been rejected. Reason: ${employee.rejectionReason || 'No reason provided'}. Please contact the business administrator for more information.`,
            employeeStatus: "rejected",
            businessName: currentBusiness?.businessId?.name || 'your business',
            rejectionReason: employee.rejectionReason
          });
        }

        if (employee && employee.status === "suspended") {
          return res.status(403).json({ 
            message: "Your employee account has been suspended. Please contact the business administrator for assistance.",
            employeeStatus: "suspended",
            businessName: currentBusiness?.businessId?.name || 'your business'
          });
        }
      }

      // Check if business admin is trying to access a suspended business
      if (user.role === "admin" && currentBusiness && currentBusiness.businessId.status === "suspended") {
        return res.status(403).json({ 
          message: "Your business account has been suspended. Please contact support for assistance.",
          businessStatus: "suspended",
          businessName: currentBusiness.businessId.name,
          // Include token and user data so business admin can access suspended page
          token: generateToken(user._id, user.role),
          _id: user._id,
          email: user.email,
          role: user.role,
          businessAssociations: businessAssociations,
          currentBusiness: currentBusiness,
          isSuperAdmin: user.role === "super-admin"
        });
      }
    }

    // Additional validation: Ensure client users have proper business context
    if (user.role === "client") {
      // Client users should have at least one business association
      if (businessAssociations.length === 0) {
        return res.status(403).json({ 
          message: "Client account not properly associated with any business. Please contact support." 
        });
      }

      // Check if the client's business is active
      if (currentBusiness && currentBusiness.businessId.status !== 'active') {
        return res.status(403).json({ 
          message: `The business "${currentBusiness.businessId.name}" is currently ${currentBusiness.businessId.status}. Please wait for the business to be activated before accessing your account.`,
          businessStatus: currentBusiness.businessId.status,
          businessName: currentBusiness.businessId.name
        });
      }

      // Check if the client account is approved
      if (user.clientStatus === 'pending') {
        return res.status(403).json({ 
          message: "Your client account is pending approval by the business administrator. Please wait for approval before accessing your account.",
          clientStatus: user.clientStatus,
          businessName: currentBusiness?.businessId?.name || 'your business',
          // Include token and user data so client can access pending approval page
          token: generateToken(user._id, user.role),
          _id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          businessAssociations: businessAssociations,
          currentBusiness: currentBusiness,
          isSuperAdmin: user.role === "super-admin"
        });
      }

      if (user.clientStatus === 'suspended') {
        return res.status(403).json({ 
          message: "Your client account has been suspended. Please contact the business administrator for assistance.",
          clientStatus: user.clientStatus,
          businessName: currentBusiness?.businessId?.name || 'your business',
          // Include token and user data so client can access suspended page
          token: generateToken(user._id, user.role),
          _id: user._id,
          email: user.email,
          role: user.role,
          businessAssociations: businessAssociations,
          currentBusiness: currentBusiness,
          isSuperAdmin: user.role === "super-admin"
        });
      }
    }

    res.json({
      _id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      token: generateToken(user._id, user.role),
      businessAssociations: businessAssociations,
      currentBusiness: currentBusiness,
      isSuperAdmin: user.role === "super-admin"
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc   Switch business context
// @route  POST /api/auth/switch-business
// @access Private
const switchBusiness = async (req, res) => {
  const { businessId } = req.body;
  const userId = req.user.id;

  try {
    // Check if user has access to this business
    const userBusiness = await UserBusiness.findOne({ 
      userId: userId, 
      businessId: businessId, 
      isActive: true 
    }).populate('businessId', 'name email businessType address businessCode');

    if (!userBusiness) {
      return res.status(403).json({ 
        message: "You don't have access to this business" 
      });
    }

    // Update user's current business
    const user = await User.findById(userId);
    user.currentBusinessId = businessId;
    await user.save();

    res.json({
      success: true,
      message: "Business context switched successfully",
      currentBusiness: userBusiness
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc   Get user's business associations
// @route  GET /api/auth/businesses
// @access Private
const getUserBusinesses = async (req, res) => {
  const userId = req.user.id;

  try {
    const businessAssociations = await UserBusiness.find({ 
      userId: userId, 
      isActive: true 
    }).populate('businessId', 'name email businessType address businessCode');

    res.json({
      success: true,
      data: businessAssociations
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc   Verify user token and get user info
// @route  GET /api/auth/verify
// @access Private
const verifyUser = async (req, res) => {
  try {
    // User info is already available from auth middleware
    const user = req.user;
    
    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        businessId: user.businessId,
        businessAssociations: user.businessAssociations,
        currentBusiness: user.currentBusiness,
        isSuperAdmin: user.isSuperAdmin
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc   Change user password
// @route  PUT /api/auth/change-password
// @access Private
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required"
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters long"
      });
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect"
      });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    user.password = hashedNewPassword;
    await user.save();

    res.json({
      success: true,
      message: "Password changed successfully"
    });
  } catch (err) {
    console.error("Change password error:", err);
    res.status(500).json({
      success: false,
      message: "Error changing password",
      error: err.message
    });
  }
};

// @desc   Validate business invitation
// @route  GET /api/auth/validate-invitation
// @access Public
const validateInvitation = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Invitation token is required"
      });
    }

    // Find the invitation
    const invitation = await BusinessInvitation.findOne({ 
      token,
      status: 'pending'
    }).populate('businessId', 'name email businessType');

    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: "Invalid or expired invitation"
      });
    }

    // Check if invitation has expired
    if (invitation.expiresAt && invitation.expiresAt < new Date()) {
      return res.status(400).json({
        success: false,
        message: "Invitation has expired"
      });
    }

    res.json({
      success: true,
      data: {
        business: invitation.businessId,
        role: invitation.role,
        email: invitation.email,
        message: invitation.message
      }
    });

  } catch (error) {
    console.error("Validate invitation error:", error);
    res.status(500).json({
      success: false,
      message: "Error validating invitation",
      error: error.message
    });
  }
};

module.exports = { registerUser, loginUser, switchBusiness, getUserBusinesses, verifyUser, changePassword, validateInvitation };
