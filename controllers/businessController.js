const Business = require("../models/Business");
const User = require("../models/User");
const BusinessCode = require("../models/BusinessCode");
const BusinessInvitation = require("../models/BusinessInvitation");
const UserBusiness = require("../models/UserBusiness");
const Client = require("../models/Client");
const Employee = require("../models/Employee");
const Class = require("../models/Class");
const Session = require("../models/Session");
const Note = require("../models/Note");
const Notification = require("../models/Notification");
const bcrypt = require("bcryptjs");
const { sendNewBusinessNotification, sendBusinessActivationEmail, sendBusinessRejectionEmail } = require("../utils/emailService");

// @desc   Get all businesses (Super Admin only)
// @route  GET /api/businesses
// @access Private (Super Admin)
const getAllBusinesses = async (req, res) => {
  try {
    // Get all businesses regardless of status for super admin
    const businesses = await Business.find({})
      .select('-__v')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: businesses.length,
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

// @desc   Get single business
// @route  GET /api/businesses/:id
// @access Private (Super Admin, Business Admin)
const getBusiness = async (req, res) => {
  try {
    const business = await Business.findById(req.params.id);
    
    if (!business) {
      return res.status(404).json({
        success: false,
        message: "Business not found"
      });
    }

    // Check if user has access to this business
    if (req.user.role !== "super-admin") {
      if (!req.user.businessId || req.user.businessId.toString() !== business._id.toString()) {
        return res.status(403).json({
          success: false,
          message: "Access denied"
        });
      }
    }

    res.json({
      success: true,
      data: business
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching business",
      error: error.message
    });
  }
};

// @desc   Create new business
// @route  POST /api/businesses
// @access Private (Super Admin)
const createBusiness = async (req, res) => {
  try {
    // Ensure new businesses are created with pending status
    const businessData = { ...req.body, status: 'pending' };
    const business = await Business.create(businessData);

    res.status(201).json({
      success: true,
      data: business
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Business with this email already exists"
      });
    }
    
    res.status(500).json({
      success: false,
      message: "Error creating business",
      error: error.message
    });
  }
};

// @desc   Update business
// @route  PUT /api/businesses/:id
// @access Private (Super Admin, Business Admin)
const updateBusiness = async (req, res) => {
  try {
    const business = await Business.findById(req.params.id);
    
    if (!business) {
      return res.status(404).json({
        success: false,
        message: "Business not found"
      });
    }

    // Check if user has access to this business
    if (req.user.role !== "super-admin") {
      if (!req.user.businessId || req.user.businessId.toString() !== business._id.toString()) {
        return res.status(403).json({
          success: false,
          message: "Access denied"
        });
      }
    }

    // Handle status changes with appropriate messaging and email notifications
    let message = "Business updated successfully";
    if (req.body.status) {
      if (req.body.status === 'active' && business.status === 'pending') {
        message = "Business activated successfully";
        // Send activation email
        try {
          await sendBusinessActivationEmail(business.email, business.name);
        } catch (error) {
          console.error('Error sending activation email:', error);
          // Don't fail the update if email fails
        }
      } else if (req.body.status === 'active' && business.status === 'suspended') {
        message = "Business reactivated successfully";
        // Send reactivation email
        try {
          await sendBusinessActivationEmail(business.email, business.name);
        } catch (error) {
          console.error('Error sending reactivation email:', error);
          // Don't fail the update if email fails
        }
      } else if (req.body.status === 'suspended') {
        message = "Business suspended successfully";
        // Send rejection email if it was pending
        if (business.status === 'pending') {
          try {
            await sendBusinessRejectionEmail(business.email, business.name, req.body.notes || 'Business application was not approved');
          } catch (error) {
            console.error('Error sending rejection email:', error);
            // Don't fail the update if email fails
          }
        }
      } else if (req.body.status === 'pending') {
        message = "Business status set to pending";
      }
    }

    // Ensure isActive is always true for status changes (only set to false for hard deletes)
    const updateData = { ...req.body };
    if (updateData.status) {
      updateData.isActive = true;
    }

    const updatedBusiness = await Business.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      data: updatedBusiness,
      message: message
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating business",
      error: error.message
    });
  }
};

// @desc   Deactivate business
// @route  DELETE /api/businesses/:id
// @access Private (Super Admin)
const deactivateBusiness = async (req, res) => {
  try {
    const business = await Business.findById(req.params.id);
    
    if (!business) {
      return res.status(404).json({
        success: false,
        message: "Business not found"
      });
    }

    // Deactivate business
    business.isActive = false;
    await business.save();

    // Deactivate all users associated with this business
    await User.updateMany(
      { businessId: business._id },
      { isActive: false }
    );

    res.json({
      success: true,
      message: "Business deactivated successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deactivating business",
      error: error.message
    });
  }
};

// @desc   Permanently delete business and all related data
// @route  DELETE /api/businesses/:id/permanent
// @access Private (Super Admin only)
const permanentlyDeleteBusiness = async (req, res) => {
  try {
    const businessId = req.params.id;
    
    // Verify business exists
    const business = await Business.findById(businessId);
    if (!business) {
      return res.status(404).json({
        success: false,
        message: "Business not found"
      });
    }

    console.log(`🗑️ Starting permanent deletion of business: ${business.name} (${businessId})`);

    // Delete in order to respect foreign key relationships
    // 1. Delete all sessions and their enrollments
    console.log('Deleting sessions...');
    const deletedSessions = await Session.deleteMany({ businessId });
    console.log(`Deleted ${deletedSessions.deletedCount} sessions`);

    // 2. Delete all classes
    console.log('Deleting classes...');
    const deletedClasses = await Class.deleteMany({ businessId });
    console.log(`Deleted ${deletedClasses.deletedCount} classes`);

    // 3. Delete all clients
    console.log('Deleting clients...');
    const deletedClients = await Client.deleteMany({ businessId });
    console.log(`Deleted ${deletedClients.deletedCount} clients`);

    // 4. Delete all employees/instructors
    console.log('Deleting employees...');
    const deletedEmployees = await Employee.deleteMany({ businessId });
    console.log(`Deleted ${deletedEmployees.deletedCount} employees`);

    // 5. Delete all business codes
    console.log('Deleting business codes...');
    const deletedBusinessCodes = await BusinessCode.deleteMany({ businessId });
    console.log(`Deleted ${deletedBusinessCodes.deletedCount} business codes`);

    // 6. Delete all business invitations
    console.log('Deleting business invitations...');
    const deletedInvitations = await BusinessInvitation.deleteMany({ businessId });
    console.log(`Deleted ${deletedInvitations.deletedCount} business invitations`);

    // 7. Delete all user-business associations
    console.log('Deleting user-business associations...');
    const deletedUserBusinesses = await UserBusiness.deleteMany({ businessId });
    console.log(`Deleted ${deletedUserBusinesses.deletedCount} user-business associations`);

    // 8. Delete all notes related to this business
    console.log('Deleting notes...');
    const deletedNotes = await Note.deleteMany({ businessId });
    console.log(`Deleted ${deletedNotes.deletedCount} notes`);

    // 9. Deactivate all users associated with this business (but don't delete them as they might have other business associations)
    console.log('Deactivating users associated with this business...');
    const updatedUsers = await User.updateMany(
      { businessId: businessId },
      { 
        isActive: false,
        businessId: null,
        currentBusinessId: null
      }
    );
    console.log(`Deactivated ${updatedUsers.modifiedCount} users`);

    // 10. Finally, delete the business itself
    console.log('Deleting business...');
    await Business.findByIdAndDelete(businessId);

    console.log(`✅ Business ${business.name} permanently deleted successfully`);

    res.json({
      success: true,
      message: "Business and all related data permanently deleted",
      deletedData: {
        sessions: deletedSessions.deletedCount,
        classes: deletedClasses.deletedCount,
        clients: deletedClients.deletedCount,
        employees: deletedEmployees.deletedCount,
        businessCodes: deletedBusinessCodes.deletedCount,
        invitations: deletedInvitations.deletedCount,
        userBusinesses: deletedUserBusinesses.deletedCount,
        notes: deletedNotes.deletedCount,
        deactivatedUsers: updatedUsers.modifiedCount
      }
    });

  } catch (error) {
    console.error('❌ Error during permanent deletion:', error);
    res.status(500).json({
      success: false,
      message: "Error permanently deleting business",
      error: error.message
    });
  }
};

// @desc   Get business deletion preview (what will be deleted)
// @route  GET /api/businesses/:id/deletion-preview
// @access Private (Super Admin only)
const getBusinessDeletionPreview = async (req, res) => {
  try {
    const businessId = req.params.id;
    
    const business = await Business.findById(businessId);
    if (!business) {
      return res.status(404).json({
        success: false,
        message: "Business not found"
      });
    }

    // Count all related data
    const [
      sessionsCount,
      classesCount,
      clientsCount,
      employeesCount,
      businessCodesCount,
      invitationsCount,
      userBusinessesCount,
      notesCount,
      associatedUsersCount
    ] = await Promise.all([
      Session.countDocuments({ businessId }),
      Class.countDocuments({ businessId }),
      Client.countDocuments({ businessId }),
      Employee.countDocuments({ businessId }),
      BusinessCode.countDocuments({ businessId }),
      BusinessInvitation.countDocuments({ businessId }),
      UserBusiness.countDocuments({ businessId }),
      Note.countDocuments({ businessId }),
      User.countDocuments({ businessId })
    ]);

    res.json({
      success: true,
      data: {
        business: {
          id: business._id,
          name: business.name,
          email: business.email,
          businessType: business.businessType,
          status: business.status,
          isActive: business.isActive,
          createdAt: business.createdAt
        },
        deletionPreview: {
          sessions: sessionsCount,
          classes: classesCount,
          clients: clientsCount,
          employees: employeesCount,
          businessCodes: businessCodesCount,
          invitations: invitationsCount,
          userBusinesses: userBusinessesCount,
          notes: notesCount,
          associatedUsers: associatedUsersCount
        },
        totalRecords: sessionsCount + classesCount + clientsCount + employeesCount + 
                     businessCodesCount + invitationsCount + userBusinessesCount + 
                     notesCount + associatedUsersCount + 1 // +1 for the business itself
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error getting deletion preview",
      error: error.message
    });
  }
};

// @desc   Get business dashboard data
// @route  GET /api/businesses/:id/dashboard
// @access Private (Super Admin, Business Admin)
const getBusinessDashboard = async (req, res) => {
  try {
    const business = await Business.findById(req.params.id);
    
    if (!business) {
      return res.status(404).json({
        success: false,
        message: "Business not found"
      });
    }

    // Check if user has access to this business
    if (req.user.role !== "super-admin") {
      if (!req.user.businessId || req.user.businessId.toString() !== business._id.toString()) {
        return res.status(403).json({
          success: false,
          message: "Access denied"
        });
      }
    }

    // Get dashboard statistics
    const totalClients = await Client.countDocuments({ businessId: business._id, isActive: true });
    const totalInstructors = await Employee.countDocuments({ businessId: business._id, isActive: true, status: "approved"  });
    const totalClasses = await Class.countDocuments({ businessId: business._id, isActive: true });
    
    // Get upcoming classes for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const upcomingClasses = await Session.find({
      businessId: business._id,
      date: { $gte: today, $lt: tomorrow },
      status: { $in: ["scheduled", "confirmed"] }
    }).populate("classId instructorId").limit(10);

    // Get recent notifications (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const notifications = await Notification.find({
      businessId: business._id,
      createdAt: { $gte: thirtyDaysAgo }
    })
    .populate("clientId", "firstName lastName")
    .populate("sessionId", "classId")
    .sort({ createdAt: -1 })
    .limit(20);

    res.json({
      success: true,
      data: {
        business,
        stats: {
          totalClients,
          totalInstructors,
          totalClasses
        },
        upcomingClasses,
        notifications
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching dashboard data",
      error: error.message
    });
  }
};

// @desc   Register new business (Public - no authentication required)
// @route  POST /api/businesses/register
// @access Public
const registerBusinessPublic = async (req, res) => {
  try {
    const { firstName, lastName, businessName, businessType, email, password, phone, address, website } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !businessName || !businessType || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "First name, last name, business name, type, email, and password are required"
      });
    }

    // Validate password strength
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long"
      });
    }

    // Check if business with this email already exists
    const existingBusiness = await Business.findOne({ email });
    if (existingBusiness) {
      return res.status(400).json({
        success: false,
        message: "Business with this email already exists"
      });
    }

    // Check if user with this email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User with this email already exists"
      });
    }

    // Generate unique business code for mobile app compatibility
    const generateBusinessCode = () => {
      const prefix = businessType.toUpperCase().replace(/[^A-Z]/g, '').substring(0, 3);
      const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      return `${prefix}${randomNum}`;
    };

    let businessCode;
    let isUnique = false;
    let attempts = 0;
    
    // Ensure business code is unique
    while (!isUnique && attempts < 10) {
      businessCode = generateBusinessCode();
      const existingCode = await Business.findOne({ businessCode });
      if (!existingCode) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      return res.status(500).json({
        success: false,
        message: "Unable to generate unique business code. Please try again."
      });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the business admin user first
    const user = await User.create({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      role: "admin", // Business admin role
      isActive: true
    });

    // Create the business with admin reference
    const business = await Business.create({
      name: businessName,
      businessType,
      email,
      phone: phone || '',
      address: address || '',
      website: website || '',
      businessCode: businessCode,
      adminUserId: user._id,
      isActive: true,
      status: 'pending' // Business requires activation by super admin
    });

    // Update user with business references
    user.businessId = business._id; // For backward compatibility
    user.currentBusinessId = business._id;
    await user.save();

    // Create UserBusiness association
    const userBusiness = await UserBusiness.create({
      userId: user._id,
      businessId: business._id,
      role: "admin",
      isActive: true
    });

    // Send notification to super admin about new business registration
    try {
      await sendNewBusinessNotification({
        name: business.name,
        businessType: business.businessType,
        email: business.email,
        phone: business.phone,
        businessCode: business.businessCode,
        createdAt: business.createdAt
      });
    } catch (error) {
      console.error('Error sending new business notification:', error);
      // Don't fail the registration if email fails
    }

    res.status(201).json({
      success: true,
      message: "Business registered successfully. Your account is pending activation by our super admin team.",
      data: {
        id: business._id,
        name: business.name,
        email: business.email,
        businessType: business.businessType,
        businessCode: business.businessCode,
        userId: user._id,
        status: business.status,
        // Include business code for mobile app QR code generation
        qrCodeData: {
          businessCode: business.businessCode,
          businessName: business.name,
          registrationUrl: `planora://register?code=${business.businessCode}`
        }
      }
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Business or user with this email already exists"
      });
    }
    
    res.status(500).json({
      success: false,
      message: "Error registering business",
      error: error.message
    });
  }
};

// @desc   Create business code
// @route  POST /api/businesses/:id/codes
// @access Private (Business Admin)
const createBusinessCode = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, autoApprove, maxUses, expiresAt } = req.body;
    const userId = req.user.id;

    // Check if user has admin access to this business
    const userBusiness = await UserBusiness.findOne({
      userId: userId,
      businessId: id,
      role: 'admin',
      isActive: true
    });

    if (!userBusiness) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin privileges required."
      });
    }

    // Create business code
    const businessCode = await BusinessCode.create({
      businessId: id,
      name: name || 'Default Code',
      description: description || '',
      autoApprove: autoApprove || false,
      maxUses: maxUses || null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      createdBy: userId
    });

    res.status(201).json({
      success: true,
      data: businessCode,
      message: "Business code created successfully"
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating business code",
      error: error.message
    });
  }
};

// @desc   Get business codes
// @route  GET /api/businesses/:id/codes
// @access Private (Business Admin)
const getBusinessCodes = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if user has admin access to this business
    const userBusiness = await UserBusiness.findOne({
      userId: userId,
      businessId: id,
      role: 'admin',
      isActive: true
    });

    if (!userBusiness) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin privileges required."
      });
    }

    const businessCodes = await BusinessCode.find({ businessId: id })
      .populate('createdBy', 'firstName lastName email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: businessCodes
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching business codes",
      error: error.message
    });
  }
};

// @desc   Update business code
// @route  PUT /api/businesses/:id/codes/:codeId
// @access Private (Business Admin)
const updateBusinessCode = async (req, res) => {
  try {
    const { id, codeId } = req.params;
    const { name, description, autoApprove, maxUses, expiresAt, isActive } = req.body;
    const userId = req.user.id;

    // Check if user has admin access to this business
    const userBusiness = await UserBusiness.findOne({
      userId: userId,
      businessId: id,
      role: 'admin',
      isActive: true
    });

    if (!userBusiness) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin privileges required."
      });
    }

    const businessCode = await BusinessCode.findOneAndUpdate(
      { _id: codeId, businessId: id },
      {
        name,
        description,
        autoApprove,
        maxUses,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        isActive
      },
      { new: true }
    );

    if (!businessCode) {
      return res.status(404).json({
        success: false,
        message: "Business code not found"
      });
    }

    res.json({
      success: true,
      data: businessCode,
      message: "Business code updated successfully"
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating business code",
      error: error.message
    });
  }
};

// @desc   Delete business code
// @route  DELETE /api/businesses/:id/codes/:codeId
// @access Private (Business Admin)
const deleteBusinessCode = async (req, res) => {
  try {
    const { id, codeId } = req.params;
    const userId = req.user.id;

    // Check if user has admin access to this business
    const userBusiness = await UserBusiness.findOne({
      userId: userId,
      businessId: id,
      role: 'admin',
      isActive: true
    });

    if (!userBusiness) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin privileges required."
      });
    }

    const businessCode = await BusinessCode.findOneAndDelete({
      _id: codeId,
      businessId: id
    });

    if (!businessCode) {
      return res.status(404).json({
        success: false,
        message: "Business code not found"
      });
    }

    res.json({
      success: true,
      message: "Business code deleted successfully"
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting business code",
      error: error.message
    });
  }
};

// @desc   Create business invitation
// @route  POST /api/businesses/:id/invite
// @access Private (Business Admin)
const createBusinessInvitation = async (req, res) => {
  try {
    const { id } = req.params;
    const { email, role, message } = req.body;
    const userId = req.user.id;

    // Check if user has admin access to this business
    const userBusiness = await UserBusiness.findOne({
      userId: userId,
      businessId: id,
      role: 'admin',
      isActive: true
    });

    if (!userBusiness) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin privileges required."
      });
    }

    // Check if invitation already exists for this email
    const existingInvitation = await BusinessInvitation.findOne({
      businessId: id,
      email: email.toLowerCase(),
      status: 'pending'
    });

    if (existingInvitation) {
      return res.status(400).json({
        success: false,
        message: "An invitation already exists for this email address"
      });
    }

    // Create business invitation
    const businessInvitation = await BusinessInvitation.create({
      businessId: id,
      email: email.toLowerCase(),
      role: role || 'client',
      invitedBy: userId,
      message: message || '',
      status: 'pending'
    });

    // Send invitation email
    const { sendInstructorInvitationEmail } = require('../utils/emailService');
    const business = await Business.findById(id);
    
    if (business) {
      const emailSent = await sendInstructorInvitationEmail(
        email,
        business.name,
        businessInvitation.token,
        message
      );
      
      if (!emailSent) {
        console.warn('Failed to send invitation email, but invitation was created');
      }
    }

    res.status(201).json({
      success: true,
      data: businessInvitation,
      message: "Invitation created and sent successfully"
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating invitation",
      error: error.message
    });
  }
};

// @desc   Get business invitations
// @route  GET /api/businesses/:id/invitations
// @access Private (Business Admin)
const getBusinessInvitations = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if user has admin access to this business
    const userBusiness = await UserBusiness.findOne({
      userId: userId,
      businessId: id,
      role: 'admin',
      isActive: true
    });

    if (!userBusiness) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin privileges required."
      });
    }

    const invitations = await BusinessInvitation.find({ businessId: id })
      .populate('invitedBy', 'firstName lastName email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: invitations
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching invitations",
      error: error.message
    });
  }
};

// @desc   Update business invitation
// @route  PUT /api/businesses/:id/invitations/:invitationId
// @access Private (Business Admin)
const updateBusinessInvitation = async (req, res) => {
  try {
    const { id, invitationId } = req.params;
    const { status, message } = req.body;
    const userId = req.user.id;

    // Check if user has admin access to this business
    const userBusiness = await UserBusiness.findOne({
      userId: userId,
      businessId: id,
      role: 'admin',
      isActive: true
    });

    if (!userBusiness) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin privileges required."
      });
    }

    const invitation = await BusinessInvitation.findOneAndUpdate(
      { _id: invitationId, businessId: id },
      { status, message },
      { new: true }
    );

    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: "Invitation not found"
      });
    }

    res.json({
      success: true,
      data: invitation,
      message: "Invitation updated successfully"
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating invitation",
      error: error.message
    });
  }
};

// @desc   Delete business invitation
// @route  DELETE /api/businesses/:id/invitations/:invitationId
// @access Private (Business Admin)
const deleteBusinessInvitation = async (req, res) => {
  try {
    const { id, invitationId } = req.params;
    const userId = req.user.id;

    // Check if user has admin access to this business
    const userBusiness = await UserBusiness.findOne({
      userId: userId,
      businessId: id,
      role: 'admin',
      isActive: true
    });

    if (!userBusiness) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin privileges required."
      });
    }

    const invitation = await BusinessInvitation.findOneAndDelete({
      _id: invitationId,
      businessId: id
    });

    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: "Invitation not found"
      });
    }

    res.json({
      success: true,
      message: "Invitation deleted successfully"
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting invitation",
      error: error.message
    });
  }
};

// @desc   Get pending client requests
// @route  GET /api/businesses/:id/pending-requests
// @access Private (Business Admin)
const getPendingRequests = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if user has admin access to this business
    const userBusiness = await UserBusiness.findOne({
      userId: userId,
      businessId: id,
      role: 'admin',
      isActive: true
    });

    if (!userBusiness) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin privileges required."
      });
    }

    // Get pending user-business associations for this business
    const pendingRequests = await UserBusiness.find({
      businessId: id,
      isActive: false
    })
      .populate('userId', 'firstName lastName email phone')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: pendingRequests
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching pending requests",
      error: error.message
    });
  }
};

// @desc   Approve client request
// @route  POST /api/businesses/:id/approve-request
// @access Private (Business Admin)
const approveClientRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, role } = req.body;
    const adminUserId = req.user.id;

    // Check if user has admin access to this business
    const userBusiness = await UserBusiness.findOne({
      userId: adminUserId,
      businessId: id,
      role: 'admin',
      isActive: true
    });

    if (!userBusiness) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin privileges required."
      });
    }

    // Find the pending request
    const pendingRequest = await UserBusiness.findOne({
      userId: userId,
      businessId: id,
      isActive: false
    });

    if (!pendingRequest) {
      return res.status(404).json({
        success: false,
        message: "Pending request not found"
      });
    }

    // Activate the user-business association
    pendingRequest.isActive = true;
    pendingRequest.role = role || pendingRequest.role;
    await pendingRequest.save();

    // If this is a client approval, also update the user's client status
    if (pendingRequest.role === 'client') {
      const user = await User.findById(userId);
      if (user) {
        user.clientStatus = 'approved';
        await user.save();
      }
    }

    // Get updated user data
    const user = await User.findById(userId).select('-password');
    const businessAssociations = await UserBusiness.find({ 
      userId: userId, 
      isActive: true 
    }).populate('businessId', 'name email businessType');

    res.json({
      success: true,
      data: {
        user,
        businessAssociations,
        message: "Client request approved successfully"
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error approving request",
      error: error.message
    });
  }
};

// @desc   Reject client request
// @route  POST /api/businesses/:id/reject-request
// @access Private (Business Admin)
const rejectClientRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    const adminUserId = req.user.id;

    // Check if user has admin access to this business
    const userBusiness = await UserBusiness.findOne({
      userId: adminUserId,
      businessId: id,
      role: 'admin',
      isActive: true
    });

    if (!userBusiness) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin privileges required."
      });
    }

    // Find and delete the pending request
    const pendingRequest = await UserBusiness.findOneAndDelete({
      userId: userId,
      businessId: id,
      isActive: false
    });

    if (!pendingRequest) {
      return res.status(404).json({
        success: false,
        message: "Pending request not found"
      });
    }

    res.json({
      success: true,
      message: "Client request rejected successfully"
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error rejecting request",
      error: error.message
    });
  }
};

module.exports = {
  getAllBusinesses,
  getBusiness,
  createBusiness,
  updateBusiness,
  deactivateBusiness,
  permanentlyDeleteBusiness,
  getBusinessDeletionPreview,
  getBusinessDashboard,
  registerBusinessPublic,
  createBusinessCode,
  getBusinessCodes,
  updateBusinessCode,
  deleteBusinessCode,
  createBusinessInvitation,
  getBusinessInvitations,
  updateBusinessInvitation,
  deleteBusinessInvitation,
  getPendingRequests,
  approveClientRequest,
  rejectClientRequest
};