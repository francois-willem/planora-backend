const mongoose = require("mongoose");
const User = require("../models/User");
const Business = require("../models/Business");
const BusinessCode = require("../models/BusinessCode");
const BusinessInvitation = require("../models/BusinessInvitation");
const UserBusiness = require("../models/UserBusiness");
const Client = require("../models/Client");
const Employee = require("../models/Employee");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { addUserToBusiness } = require("../utils/userBusinessManager");

// Generate JWT token
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

// @desc   Register user with business code
// @route  POST /api/auth/register-with-code
// @access Public
const registerWithBusinessCode = async (req, res) => {
  const { email, password, firstName, lastName, phone, businessCode, emergencyContact, role, dateOfBirth } = req.body;

  try {
    // Validate required fields
    if (!email || !password || !businessCode) {
      return res.status(400).json({
        success: false,
        message: "Email, password, and business code are required"
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User with this email already exists"
      });
    }

    // Find and validate business code
    // First check BusinessCode collection (for client registration codes)
    let code = await BusinessCode.findOne({ 
      code: businessCode.toUpperCase() 
    }).populate('businessId');

    let business = null;
    
    if (code && code.canBeUsed()) {
      // Found a valid client registration code
      business = code.businessId;
    } else {
      // Check if it's a business identification code
      business = await Business.findOne({ 
        businessCode: businessCode.toUpperCase(),
        isActive: true 
      });
      
      if (!business) {
        return res.status(400).json({
          success: false,
          message: "Invalid or expired business code"
        });
      }
    }

    // Check if business is active (not pending or suspended)
    if (business.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: `This business is currently ${business.status}. Please contact the business administrator or try again later.`
      });
    }

    let user = null;
    let userRole = null;
    
    try {
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Determine user role (default to client if not specified)
      userRole = role === "employee" ? "employee" : "client";

      // Create user
      user = await User.create({
        email,
        password: hashedPassword,
        role: userRole,
        businessId: business._id // Set businessId for client users
      });

      // Create appropriate record based on role
      if (userRole === "employee") {
        await Employee.create({
          userId: user._id,
          businessId: business._id,
          firstName,
          lastName,
          phone,
          status: "pending" // Employee needs business approval
        });
      } else {
        await Client.create({
          userId: user._id,
          businessId: business._id,
          firstName,
          lastName,
          phone,
          dateOfBirth: dateOfBirth || undefined,
          emergencyContact: emergencyContact || {},
          isPrimary: true,  // Account owner
          relationship: "self"
        });
      }

      // Create UserBusiness association
      const userBusiness = await addUserToBusiness(
        user._id,
        business._id,
        userRole,
        null // isActive will be determined by the function
      );

      // Update code usage if it's a BusinessCode (not a business identification code)
      if (code) {
        code.currentUses += 1;
        await code.save();
      }

      // Set current business context
      user.currentBusinessId = business._id;
      await user.save();
      
      // Use the created user for response
      const createdUser = user;

      // Get business associations for response (including inactive ones for clients)
      const businessAssociations = await UserBusiness.find({ 
        userId: createdUser._id
      }).populate('businessId', 'name email businessType');

      // For client registrations, don't auto-login if client status is pending
      if (createdUser.role === "client" && createdUser.clientStatus === "pending") {
        res.status(201).json({
          success: true,
          _id: createdUser._id,
          email: createdUser.email,
          role: createdUser.role,
          clientStatus: createdUser.clientStatus,
          businessName: business.name,
          message: "Registration successful! Your account is pending approval by the business administrator."
        });
      } else if (createdUser.role === "employee") {
        // For employee registrations, don't auto-login - they need business approval
        res.status(201).json({
          success: true,
          _id: createdUser._id,
          email: createdUser.email,
          role: createdUser.role,
          employeeStatus: "pending",
          businessName: business.name,
          message: "Registration successful! Your employee account is pending approval by the business administrator. You will be notified once approved."
        });
      } else {
        // Only return active business associations for non-pending users
        const activeBusinessAssociations = businessAssociations.filter(assoc => assoc.isActive);
        
        res.status(201).json({
          success: true,
          _id: createdUser._id,
          email: createdUser.email,
          role: createdUser.role,
          token: generateToken(createdUser._id, createdUser.role),
          businessAssociations: activeBusinessAssociations,
          currentBusiness: userBusiness.isActive ? userBusiness : null,
          isSuperAdmin: false,
          message: "Registration successful! Welcome to " + business.name
        });
      }

    } catch (operationError) {
      // If user was created, try to clean up
      if (user && user._id) {
        try {
          await User.findByIdAndDelete(user._id);
          if (userRole === "employee") {
            await Employee.findOneAndDelete({ userId: user._id });
          } else {
            await Client.findOneAndDelete({ userId: user._id });
          }
          await UserBusiness.findOneAndDelete({ userId: user._id });
        } catch (cleanupError) {
          console.error("Cleanup error:", cleanupError);
        }
      }
      throw operationError;
    }

  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      success: false,
      message: "Registration failed. Please try again.",
      error: error.message
    });
  }
};

// @desc   Register user with business invitation
// @route  POST /api/auth/register-with-invitation
// @access Public
const registerWithInvitation = async (req, res) => {
  const { email, password, firstName, lastName, phone, invitationToken, dateOfBirth } = req.body;

  try {
    // Validate required fields
    if (!email || !password || !invitationToken) {
      return res.status(400).json({
        success: false,
        message: "Email, password, and invitation token are required"
      });
    }

    // Find and validate invitation
    const invitation = await BusinessInvitation.findOne({ 
      token: invitationToken 
    }).populate('businessId');

    if (!invitation || !invitation.isValid()) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired invitation"
      });
    }

    // Check if business is active (not pending or suspended)
    if (invitation.businessId.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: `This business is currently ${invitation.businessId.status}. Please contact the business administrator or try again later.`
      });
    }

    // Check if email matches invitation
    if (invitation.email.toLowerCase() !== email.toLowerCase()) {
      return res.status(400).json({
        success: false,
        message: "Email does not match invitation"
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User with this email already exists"
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      email,
      password: hashedPassword,
      role: invitation.role
    });

    // Create client record if role is client
    if (invitation.role === "client") {
      await Client.create({
        userId: user._id,
        businessId: invitation.businessId._id,
        firstName,
        lastName,
        phone,
        dateOfBirth: dateOfBirth || undefined,
        isPrimary: true,  // Account owner
        relationship: "self"
      });
    }

    // Create employee record if role is employee
    if (invitation.role === "employee") {
      await Employee.create({
        userId: user._id,
        businessId: invitation.businessId._id,
        firstName,
        lastName,
        phone
      });
    }

    // Create UserBusiness association
    const userBusiness = await addUserToBusiness(
      user._id,
      invitation.businessId._id,
      invitation.role
    );

    // Update invitation status
    invitation.status = 'accepted';
    invitation.acceptedAt = new Date();
    await invitation.save();

    // Set current business context
    user.currentBusinessId = invitation.businessId._id;
    await user.save();

    // Get business associations for response
    const businessAssociations = await UserBusiness.find({ 
      userId: user._id, 
      isActive: true 
    }).populate('businessId', 'name email businessType');

    res.status(201).json({
      success: true,
      _id: user._id,
      email: user.email,
      role: user.role,
      token: generateToken(user._id, user.role),
      businessAssociations: businessAssociations,
      currentBusiness: userBusiness,
      isSuperAdmin: false,
      message: `Registration successful! Welcome to ${invitation.businessId.name} as ${invitation.role}`
    });

  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      success: false,
      message: "Registration failed. Please try again.",
      error: error.message
    });
  }
};

// @desc   Request to join business
// @route  POST /api/auth/request-business-access
// @access Public
const requestBusinessAccess = async (req, res) => {
  const { email, password, firstName, lastName, phone, businessId, message, dateOfBirth } = req.body;

  try {
    // Validate required fields
    if (!email || !password || !businessId) {
      return res.status(400).json({
        success: false,
        message: "Email, password, and business selection are required"
      });
    }

    // Check if business exists and is active
    const business = await Business.findById(businessId);
    if (!business || !business.isActive) {
      return res.status(400).json({
        success: false,
        message: "Business not found or inactive"
      });
    }

    // Check if business is active (not pending or suspended)
    if (business.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: `This business is currently ${business.status}. Please contact the business administrator or try again later.`
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User with this email already exists"
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      email,
      password: hashedPassword,
      role: "client" // Default role, can be changed by business admin
    });

    // Create client record
    await Client.create({
      userId: user._id,
      businessId: businessId,
      firstName,
      lastName,
      phone,
      dateOfBirth: dateOfBirth || undefined,
      isPrimary: true,  // Account owner
      relationship: "self"
    });

    // Create pending UserBusiness association
    const userBusiness = await UserBusiness.create({
      userId: user._id,
      businessId: businessId,
      role: "client",
      isActive: false // Pending approval
    });

    // TODO: Send notification to business admin
    // TODO: Send confirmation email to user

    res.status(201).json({
      success: true,
      _id: user._id,
      email: user.email,
      role: user.role,
      token: generateToken(user._id, user.role),
      businessAssociations: [],
      currentBusiness: null,
      isSuperAdmin: false,
      message: `Registration successful! Your request to join ${business.name} is pending approval. You will be notified once approved.`
    });

  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      success: false,
      message: "Registration failed. Please try again.",
      error: error.message
    });
  }
};

// @desc   Get available businesses for discovery
// @route  GET /api/businesses/discover
// @access Public
const getDiscoverableBusinesses = async (req, res) => {
  try {
    const { search, type, location } = req.query;
    
    let query = { isActive: true };
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (type) {
      query.businessType = type;
    }
    
    if (location) {
      query['address.city'] = { $regex: location, $options: 'i' };
    }

    const businesses = await Business.find(query)
      .select('name email businessType address description website')
      .limit(20)
      .sort({ name: 1 });

    res.json({
      success: true,
      data: businesses
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching businesses",
      error: error.message
    });
  }
};

// @desc   Validate business code
// @route  GET /api/businesses/validate-code/:code
// @access Public
const validateBusinessCode = async (req, res) => {
  try {
    const { code } = req.params;
    
    // First check BusinessCode collection (for client registration codes)
    const businessCode = await BusinessCode.findOne({ 
      code: code.toUpperCase() 
    }).populate('businessId', 'name businessType address');

    if (businessCode && businessCode.canBeUsed()) {
      // Found a valid client registration code
      return res.json({
        success: true,
        data: {
          business: businessCode.businessId,
          code: businessCode.code,
          name: businessCode.name,
          description: businessCode.description,
          autoApprove: businessCode.autoApprove
        }
      });
    }

    // Check if it's a business identification code
    const business = await Business.findOne({ 
      businessCode: code.toUpperCase(),
      isActive: true 
    }).select('name businessType address');

    if (!business) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired business code"
      });
    }

    res.json({
      success: true,
      data: {
        business: business,
        code: business.businessCode,
        name: business.name,
        description: `${business.businessType} business`,
        autoApprove: true // Business codes allow immediate registration
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error validating business code",
      error: error.message
    });
  }
};

module.exports = {
  registerWithBusinessCode,
  registerWithInvitation,
  requestBusinessAccess,
  getDiscoverableBusinesses,
  validateBusinessCode
};
