const Client = require("../models/Client");
const User = require("../models/User");
const UserBusiness = require("../models/UserBusiness");
const Session = require("../models/Session");
const Class = require("../models/Class");
const Notification = require("../models/Notification");

// @desc   Get all clients for a business
// @route  GET /api/clients
// @access Private (Admin, Instructor)
const getClients = async (req, res) => {
  try {
    // For super-admin, they can specify businessId in query params
    let businessId = req.user.businessId;
    
    if (req.user.role === "super-admin" && req.query.businessId) {
      businessId = req.query.businessId;
    }
    
    if (!businessId) {
      return res.status(400).json({
        success: false,
        message: "Business context required"
      });
    }

    const clients = await Client.find({ businessId, isActive: true })
      .populate("userId", "email clientStatus")
      .select("-__v")
      .sort({ joinedDate: -1 });

    res.json({
      success: true,
      count: clients.length,
      data: clients
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching clients",
      error: error.message
    });
  }
};

// @desc   Get pending clients for a business
// @route  GET /api/clients/pending
// @access Private (Admin)
const getPendingClients = async (req, res) => {
  try {
    let businessId = req.user.businessId;
    
    if (req.user.role === "super-admin" && req.query.businessId) {
      businessId = req.query.businessId;
    }
    
    if (!businessId) {
      return res.status(400).json({
        success: false,
        message: "Business context required"
      });
    }

    // Get users with client role and pending status for this business
    const pendingClients = await User.find({ 
      role: "client",
      clientStatus: "pending",
      businessId: businessId
    })
    .populate("businessId", "name email businessType")
    .select("-password -__v")
    .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: pendingClients.length,
      data: pendingClients
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching pending clients",
      error: error.message
    });
  }
};

// @desc   Get single client
// @route  GET /api/clients/:id
// @access Private (Admin, Instructor, Client)
const getClient = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id)
      .populate("userId", "email clientStatus")
      .populate("preferences.preferredInstructor", "firstName lastName");

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client not found"
      });
    }

    // Check if user has access to this client
    if (req.user.role === "client" && req.user._id.toString() !== client.userId._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    if (req.user.role !== "client" && req.user.role !== "super-admin") {
      if (!req.user.businessId || req.user.businessId.toString() !== client.businessId.toString()) {
        return res.status(403).json({
          success: false,
          message: "Access denied"
        });
      }
    }

    res.json({
      success: true,
      data: client
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching client",
      error: error.message
    });
  }
};

// @desc   Create new client
// @route  POST /api/clients
// @access Private (Admin)
const createClient = async (req, res) => {
  try {
    let businessId = req.user.businessId;
    
    // For super-admin, they can specify businessId in request body
    if (req.user.role === "super-admin" && req.body.businessId) {
      businessId = req.body.businessId;
    }
    
    if (!businessId) {
      return res.status(400).json({
        success: false,
        message: "Business context required"
      });
    }
    
    // Check if user already exists as a client for this business
    const existingClient = await Client.findOne({
      userId: req.body.userId,
      businessId
    });

    if (existingClient) {
      return res.status(400).json({
        success: false,
        message: "User is already a client for this business"
      });
    }

    const clientData = {
      ...req.body,
      businessId
    };
    
    // Ensure new clients created by admin are set as primary if not specified
    if (clientData.isPrimary === undefined || clientData.isPrimary === null) {
      // Check if this user already has a primary client for this business
      const existingPrimary = await Client.findOne({
        userId: clientData.userId,
        businessId: businessId,
        isPrimary: true
      });
      
      // Only set as primary if no primary exists yet
      if (!existingPrimary) {
        clientData.isPrimary = true;
        clientData.relationship = 'self';
      }
    }

    const client = await Client.create(clientData);
    await client.populate("userId", "email clientStatus");

    res.status(201).json({
      success: true,
      data: client
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating client",
      error: error.message
    });
  }
};

// @desc   Update client
// @route  PUT /api/clients/:id
// @access Private (Admin, Client)
const updateClient = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client not found"
      });
    }

    // Check if user has access to this client
    if (req.user.role === "client" && req.user._id.toString() !== client.userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    if (req.user.role !== "client" && req.user.role !== "super-admin") {
      if (!req.user.businessId || req.user.businessId.toString() !== client.businessId.toString()) {
        return res.status(403).json({
          success: false,
          message: "Access denied"
        });
      }
    }

    const updatedClient = await Client.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate("userId", "email clientStatus");

    res.json({
      success: true,
      data: updatedClient
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating client",
      error: error.message
    });
  }
};

// @desc   Get client's session
// @route  GET /api/clients/:id/session
// @access Private (Admin, Instructor, Client)
const getClientSession = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client not found"
      });
    }

    // Check if user has access to this client
    if (req.user.role === "client" && req.user._id.toString() !== client.userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    if (req.user.role !== "client" && req.user.role !== "super-admin") {
      if (!req.user.businessId || req.user.businessId.toString() !== client.businessId.toString()) {
        return res.status(403).json({
          success: false,
          message: "Access denied"
        });
      }
    }

    const { startDate, endDate } = req.query;
    const query = {
      businessId: client.businessId,
      "enrolledClients.clientId": client._id
    };

    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const sessions = await Session.find(query)
      .populate("classId", "title classType skillLevel")
      .populate("instructorId", "firstName lastName")
      .sort({ date: 1, startTime: 1 });

    res.json({
      success: true,
      data: sessions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching client session",
      error: error.message
    });
  }
};

// @desc   Deactivate client
// @route  DELETE /api/clients/:id
// @access Private (Admin)
const deactivateClient = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client not found"
      });
    }

    if (req.user.role !== "super-admin" && (!req.user.businessId || req.user.businessId.toString() !== client.businessId.toString())) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    client.isActive = false;
    await client.save();

    // Deactivate the associated user account
    await User.findByIdAndUpdate(client.userId, { isActive: false });

    res.json({
      success: true,
      message: "Client deactivated successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deactivating client",
      error: error.message
    });
  }
};

// @desc   Get client dashboard data
// @route  GET /api/clients/dashboard
// @access Private (Client)
const getClientDashboard = async (req, res) => {
  try {
    const userId = req.user.id;
    const businessId = req.user.currentBusinessId || req.user.businessId;
    
    if (!businessId) {
      return res.status(400).json({
        success: false,
        message: "Business context required"
      });
    }
    
    // Get all clients (primary + members) for this user account
    const allClients = await Client.find({ 
      userId: userId, 
      businessId: businessId,
      isActive: true 
    }).populate('businessId', 'name email businessType').sort({ isPrimary: -1, createdAt: 1 });

    if (!allClients || allClients.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Client record not found. Please ensure you have completed registration."
      });
    }

    // Get primary client for backward compatibility and main client info
    let client = allClients.find(c => c.isPrimary === true);
    
    // Fallback: if no primary client found, use the first one (for backward compatibility)
    if (!client) {
      client = allClients[0];
      
      // If we found a client without isPrimary, set it as primary (migration helper)
      if (client && client.isPrimary === undefined) {
        client.isPrimary = true;
        client.relationship = 'self';
        await client.save();
      }
    }

    // Get all client IDs for querying sessions
    const allClientIds = allClients.map(c => c._id);

    console.log('Clients found:', allClients.length);
    console.log('Primary client _id:', client?._id);
    console.log('All client IDs:', allClientIds);

    // Helper function to get next occurrence date for recurring classes
    const getNextOccurrenceDate = (dayOfWeek) => {
      if (!dayOfWeek) return null;
      
      const dayMap = {
        'sunday': 0,
        'monday': 1,
        'tuesday': 2,
        'wednesday': 3,
        'thursday': 4,
        'friday': 5,
        'saturday': 6
      };
      
      const targetDay = dayMap[dayOfWeek.toLowerCase()];
      if (targetDay === undefined) return null;
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const currentDay = today.getDay();
      
      // Calculate days until next occurrence
      let daysUntilNext = targetDay - currentDay;
      
      // If today IS the target day (daysUntilNext === 0), return today
      // If the target day has already passed this week (daysUntilNext < 0), get next week's occurrence
      if (daysUntilNext < 0) {
        daysUntilNext += 7;
      }
      // If daysUntilNext === 0, we keep it as 0 (today is the target day)
      
      const nextDate = new Date(today);
      nextDate.setDate(today.getDate() + daysUntilNext);
      
      return nextDate;
    };

    // Get upcoming classes (next 30 days) for all members
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    const upcomingSessions = await Session.find({
      businessId: client.businessId._id,
      "enrolledClients.clientId": { $in: allClientIds },
      $or: [
        { date: { $gte: new Date(), $lte: thirtyDaysFromNow } },
        { date: { $exists: false }, isRecurring: true }
      ]
    })
    .populate('classId', 'title classType skillLevel')
    .populate('instructorId', 'firstName lastName')
    .populate('enrolledClients.clientId', 'firstName lastName isPrimary')
    .sort({ date: 1, startTime: 1 });

    // Format upcoming classes - include member information
    const upcomingClasses = [];
    
    for (const session of upcomingSessions) {
      let sessionDate;
      
      if (session.date) {
        // Use the specific date if available
        sessionDate = new Date(session.date);
      } else if (session.dayOfWeek) {
        // If dayOfWeek exists, calculate next occurrence (even if not explicitly marked as recurring)
        sessionDate = getNextOccurrenceDate(session.dayOfWeek);
        // Debug log to help troubleshoot date issues
        if (!sessionDate) {
          console.log(`Warning: Could not calculate date for session ${session._id}, dayOfWeek: ${session.dayOfWeek}`);
        }
      } else if (session.isRecurring && !session.dayOfWeek) {
        // If marked as recurring but no dayOfWeek, try to infer from existing date if available
        // Otherwise, we can't calculate the next date
        sessionDate = null;
        console.log(`Warning: Recurring session ${session._id} has no dayOfWeek set`);
      } else {
        sessionDate = null;
      }
      
      // Find which members are enrolled in this session
      const enrolledMembers = session.enrolledClients
        .filter(enrollment => {
          // Handle both populated and unpopulated clientId
          // If populated, clientId will be an object with properties; if not, it's just an ObjectId
          const clientId = (enrollment.clientId && typeof enrollment.clientId === 'object' && enrollment.clientId._id) 
            ? enrollment.clientId._id 
            : enrollment.clientId;
          return allClientIds.some(id => id.toString() === clientId.toString());
        })
        .map(enrollment => {
          // Handle both populated and unpopulated clientId
          const isPopulated = enrollment.clientId && typeof enrollment.clientId === 'object' && enrollment.clientId.firstName;
          const clientId = isPopulated ? enrollment.clientId._id : enrollment.clientId;
          const memberClient = allClients.find(c => c._id.toString() === clientId.toString());
          
          // If populated, use the populated data; otherwise use memberClient
          const firstName = isPopulated ? enrollment.clientId.firstName : (memberClient ? memberClient.firstName : '');
          const lastName = isPopulated ? enrollment.clientId.lastName : (memberClient ? memberClient.lastName : '');
          const isPrimary = isPopulated 
            ? (enrollment.clientId.isPrimary !== undefined ? enrollment.clientId.isPrimary : false)
            : (memberClient ? memberClient.isPrimary : false);
          
          return {
            clientId: clientId.toString(),
            name: `${firstName} ${lastName}`,
            isPrimary: isPrimary,
            enrollmentStatus: enrollment.status || 'enrolled'
          };
        });
      
      // Create a class entry for each enrolled member
      enrolledMembers.forEach(member => {
        upcomingClasses.push({
          id: session._id,
          title: session.classId.title,
          instructor: `${session.instructorId.firstName} ${session.instructorId.lastName}`,
          date: sessionDate ? sessionDate.toISOString().split('T')[0] : null,
          startTime: session.startTime,
          endTime: session.endTime,
          status: member.enrollmentStatus === 'confirmed' ? 'confirmed' : (member.enrollmentStatus === 'cancelled' ? 'cancelled' : 'pending'),
          notes: session.notes || null,
          memberName: member.name,
          memberId: member.clientId,
          isPrimaryMember: member.isPrimary
        });
      });
    }
    
    // Sort by date, then by time, then by member name
    upcomingClasses.sort((a, b) => {
      if (a.date !== b.date) {
        if (!a.date) return 1;
        if (!b.date) return -1;
        return a.date.localeCompare(b.date);
      }
      if (a.startTime !== b.startTime) {
        if (!a.startTime) return 1;
        if (!b.startTime) return -1;
        return a.startTime.localeCompare(b.startTime);
      }
      return a.memberName.localeCompare(b.memberName);
    });

    // Get available catch-up classes (only for classes any member is enrolled in)
    // Only show if primary client has approved catch-up access
    let availableCatchUps = [];
    
    if (client.catchUpApprovalStatus === 'approved') {
      availableCatchUps = await Session.find({
        businessId: client.businessId._id,
        "enrolledClients.clientId": { $in: allClientIds },
        $or: [
          { date: { $gte: new Date() } },
          { date: { $exists: false }, isRecurring: true }
        ],
        isAvailableForCatchUp: true
      })
      .populate('classId', 'title classType skillLevel maxCapacity')
      .populate('instructorId', 'firstName lastName')
      .sort({ date: 1, startTime: 1 })
      .limit(10); // Limit to 10 available catch-ups
    }

    // Format available catch-ups
    const formattedCatchUps = availableCatchUps.map(session => {
      let sessionDate;
      
      if (session.date) {
        // Use the specific date if available
        sessionDate = new Date(session.date);
      } else if (session.dayOfWeek) {
        // If dayOfWeek exists, calculate next occurrence (even if not explicitly marked as recurring)
        sessionDate = getNextOccurrenceDate(session.dayOfWeek);
      } else if (session.isRecurring && !session.dayOfWeek) {
        // If marked as recurring but no dayOfWeek, we can't calculate the next date
        sessionDate = null;
      } else {
        sessionDate = null;
      }
      
      return {
        id: session._id,
        title: session.classId.title,
        instructor: `${session.instructorId.firstName} ${session.instructorId.lastName}`,
        date: sessionDate ? sessionDate.toISOString().split('T')[0] : null,
        startTime: session.startTime,
        endTime: session.endTime,
        reason: 'Available spot'
      };
    });

    // Count approved catch-up credits (approved cancellations that haven't been used)
    // For now, we'll count all approved cancellation notifications
    // In the future, we can track which ones have been used
    const approvedCatchUpCredits = await Notification.countDocuments({
      businessId: client.businessId._id,
      clientId: client._id,
      type: 'cancellation',
      catchUpApprovalStatus: 'approved'
    });

    const responseData = {
      success: true,
      data: {
        client: {
          _id: client._id.toString(), // Ensure it's a string
          id: client._id.toString(), // Also include as 'id' for compatibility
          firstName: client.firstName,
          lastName: client.lastName,
          email: req.user.email,
          businessName: client.businessId.name,
          cancellationCount: client.cancellationCount,
          hasCancelledBefore: client.hasCancelledBefore,
          catchUpApprovalStatus: client.catchUpApprovalStatus,
          catchUpCredits: approvedCatchUpCredits || 0
        },
        upcomingClasses,
        availableCatchUps: formattedCatchUps
      }
    };

    console.log('Sending response data:', JSON.stringify(responseData, null, 2));
    res.json(responseData);

  } catch (error) {
    console.error("Error fetching client dashboard:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching dashboard data",
      error: error.message
    });
  }
};

// @desc   Update client's own profile
// @route  PUT /api/clients/profile
// @access Private (Client)
const updateClientProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Find the client record for this user
    const client = await Client.findOne({ userId, isActive: true });
    
    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client profile not found"
      });
    }

    // Only allow updating certain fields for profile updates
    const allowedFields = ['firstName', 'lastName', 'phone', 'dateOfBirth', 'emergencyContact', 'medicalInfo', 'address', 'preferences'];
    const updateData = {};
    
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        // Handle dateOfBirth: convert empty string to null/undefined
        if (field === 'dateOfBirth') {
          updateData[field] = req.body[field] === '' || req.body[field] === null ? undefined : req.body[field];
        } else {
          updateData[field] = req.body[field];
        }
      }
    }

    const updatedClient = await Client.findByIdAndUpdate(
      client._id,
      updateData,
      { new: true, runValidators: true }
    ).populate('businessId', 'name');

    res.json({
      success: true,
      message: "Profile updated successfully",
      data: {
        firstName: updatedClient.firstName,
        lastName: updatedClient.lastName,
        phone: updatedClient.phone,
        dateOfBirth: updatedClient.dateOfBirth,
        emergencyContact: updatedClient.emergencyContact,
        medicalInfo: updatedClient.medicalInfo,
        address: updatedClient.address,
        preferences: updatedClient.preferences
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating profile",
      error: error.message
    });
  }
};

// @desc   Approve or suspend a client
// @route  PUT /api/clients/:id/status
// @access Private (Admin)
const updateClientStatus = async (req, res) => {
  try {
    const { clientStatus } = req.body;
    const clientId = req.params.id;

    if (!clientStatus || !['approved', 'suspended'].includes(clientStatus)) {
      return res.status(400).json({
        success: false,
        message: "Valid client status (approved/suspended) is required"
      });
    }

    // Find the client user
    const client = await User.findById(clientId);
    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client not found"
      });
    }

    // Check if the client belongs to the current business
    if (req.user.role !== "super-admin" && client.businessId.toString() !== req.user.businessId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    // Update client status
    client.clientStatus = clientStatus;
    await client.save();

    // Also update UserBusiness association status
    const userBusiness = await UserBusiness.findOne({
      userId: clientId,
      businessId: req.user.businessId,
      role: 'client'
    });

    if (userBusiness) {
      // If approving client, activate the business association
      // If suspending client, deactivate the business association
      userBusiness.isActive = (clientStatus === 'approved');
      await userBusiness.save();
    }

    res.json({
      success: true,
      message: `Client ${clientStatus} successfully`,
      data: {
        _id: client._id,
        email: client.email,
        clientStatus: client.clientStatus,
        businessAccess: userBusiness ? userBusiness.isActive : false
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating client status",
      error: error.message
    });
  }
};

// @desc   Approve client catch-up access
// @route  PUT /api/clients/:id/catchup-approve
// @access Private (Admin)
const approveCatchUpAccess = async (req, res) => {
  try {
    const clientId = req.params.id;
    const adminId = req.user.id;
    const businessId = req.user.businessId;

    // Find the client and verify they belong to this business
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client not found"
      });
    }

    if (client.businessId.toString() !== businessId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Client does not belong to your business."
      });
    }

    if (!client.hasCancelledBefore) {
      return res.status(400).json({
        success: false,
        message: "Client has not cancelled any lessons yet"
      });
    }

    // Update client catch-up approval status
    client.catchUpApprovalStatus = 'approved';
    client.catchUpApprovedBy = adminId;
    client.catchUpApprovedAt = new Date();
    await client.save();

    res.json({
      success: true,
      message: "Catch-up access approved successfully",
      data: {
        _id: client._id,
        firstName: client.firstName,
        lastName: client.lastName,
        catchUpApprovalStatus: client.catchUpApprovalStatus,
        catchUpApprovedAt: client.catchUpApprovedAt
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error approving catch-up access",
      error: error.message
    });
  }
};

// @desc   Reject client catch-up access
// @route  PUT /api/clients/:id/catchup-reject
// @access Private (Admin)
const rejectCatchUpAccess = async (req, res) => {
  try {
    const clientId = req.params.id;
    const businessId = req.user.businessId;

    // Find the client and verify they belong to this business
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client not found"
      });
    }

    if (client.businessId.toString() !== businessId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Client does not belong to your business."
      });
    }

    // Update client catch-up approval status
    client.catchUpApprovalStatus = 'rejected';
    client.catchUpApprovedBy = req.user.id;
    client.catchUpApprovedAt = new Date();
    await client.save();

    res.json({
      success: true,
      message: "Catch-up access rejected successfully",
      data: {
        _id: client._id,
        firstName: client.firstName,
        lastName: client.lastName,
        catchUpApprovalStatus: client.catchUpApprovalStatus,
        catchUpApprovedAt: client.catchUpApprovedAt
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error rejecting catch-up access",
      error: error.message
    });
  }
};

// @desc   Get clients pending catch-up approval
// @route  GET /api/clients/pending-catchup-approval
// @access Private (Admin)
const getPendingCatchUpApprovals = async (req, res) => {
  try {
    const businessId = req.user.businessId;

    const pendingClients = await Client.find({
      businessId,
      hasCancelledBefore: true,
      catchUpApprovalStatus: 'pending'
    })
    .populate('userId', 'email')
    .sort({ lastActivity: -1 });

    res.json({
      success: true,
      count: pendingClients.length,
      data: pendingClients
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching pending catch-up approvals",
      error: error.message
    });
  }
};

// @desc   Get all clients with cancelled lessons for catch-up management
// @route  GET /api/clients/catchup-requests
// @access Private (Admin)
const getCatchUpRequests = async (req, res) => {
  try {
    console.log('getCatchUpRequests called');
    console.log('req.user:', req.user ? { id: req.user.id, role: req.user.role, businessId: req.user.businessId } : 'No user');
    
    const businessId = req.user?.businessId;

    if (!businessId) {
      console.error('No businessId found in req.user');
      return res.status(400).json({
        success: false,
        message: "Business context required. Please ensure you're logged in with a business account."
      });
    }

    console.log('Fetching catch-up requests for businessId:', businessId);

    // Get all clients who have cancelled before
    const clientsWithCancellations = await Client.find({
      businessId,
      hasCancelledBefore: true
    })
    .populate('userId', 'email')
    .sort({ lastActivity: -1 });

    console.log(`Found ${clientsWithCancellations.length} clients with cancellations`);

    // If no clients have cancelled, return empty array
    if (clientsWithCancellations.length === 0) {
      return res.json({
        success: true,
        count: 0,
        data: []
      });
    }

    // For each client, find their cancelled sessions
    const clientsWithDetails = await Promise.all(
      clientsWithCancellations.map(async (client) => {
        try {
          // Find sessions where this client had a cancelled enrollment
          // We'll look for sessions where the client was enrolled and then removed
          // Since we don't have a direct cancellation history, we'll use notifications
          const cancelledNotifications = await Notification.find({
            businessId,
            clientId: client._id,
            type: 'cancellation'
          })
          .populate('sessionId', 'date startTime endTime')
          .sort({ createdAt: -1 })
          .limit(5); // Get last 5 cancellations

          // Get class info for cancelled sessions
          const cancelledSessions = await Promise.all(
            cancelledNotifications.map(async (notification) => {
              try {
                if (notification.sessionId) {
                  const sessionId = notification.sessionId._id || notification.sessionId;
                  const session = await Session.findById(sessionId)
                    .populate('classId', 'title classType')
                    .populate('instructorId', 'firstName lastName');
                  
                  if (session) {
                    return {
                      notificationId: notification._id,
                      sessionId: session._id,
                      classTitle: session.classId?.title || 'Unknown Class',
                      classType: session.classId?.classType || 'N/A',
                      instructor: session.instructorId ? `${session.instructorId.firstName} ${session.instructorId.lastName}` : 'N/A',
                      date: session.date || null,
                      startTime: session.startTime || null,
                      endTime: session.endTime || null,
                      cancelledAt: notification.createdAt,
                      catchUpApprovalStatus: notification.catchUpApprovalStatus || 'pending',
                      catchUpApprovedAt: notification.catchUpApprovedAt || null
                    };
                  }
                }
              } catch (sessionError) {
                console.error(`Error fetching session for notification ${notification._id}:`, sessionError);
                // Return basic info from notification if session fetch fails
                return {
                  notificationId: notification._id,
                  sessionId: notification.sessionId?._id || notification.sessionId || null,
                  classTitle: 'Session details unavailable',
                  classType: 'N/A',
                  instructor: 'N/A',
                  date: notification.sessionId?.date || null,
                  startTime: notification.sessionId?.startTime || null,
                  endTime: notification.sessionId?.endTime || null,
                  cancelledAt: notification.createdAt,
                  catchUpApprovalStatus: notification.catchUpApprovalStatus || 'pending',
                  catchUpApprovedAt: notification.catchUpApprovedAt || null
                };
              }
              return null;
            })
          );

          return {
            _id: client._id,
            firstName: client.firstName,
            lastName: client.lastName,
            email: client.userId?.email,
            phoneNumber: client.phone,
            cancellationCount: client.cancellationCount,
            catchUpApprovalStatus: client.catchUpApprovalStatus,
            catchUpApprovedAt: client.catchUpApprovedAt,
            cancelledSessions: cancelledSessions.filter(s => s !== null)
          };
        } catch (clientError) {
          console.error(`Error processing client ${client._id}:`, clientError);
          // Return basic client info even if session details fail
          return {
            _id: client._id,
            firstName: client.firstName,
            lastName: client.lastName,
            email: client.userId?.email,
            phoneNumber: client.phone,
            cancellationCount: client.cancellationCount,
            catchUpApprovalStatus: client.catchUpApprovalStatus,
            catchUpApprovedAt: client.catchUpApprovedAt,
            cancelledSessions: []
          };
        }
      })
    );

    console.log(`Returning ${clientsWithDetails.length} clients with catch-up details`);

    res.json({
      success: true,
      count: clientsWithDetails.length,
      data: clientsWithDetails
    });
  } catch (error) {
    console.error('Error in getCatchUpRequests:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: "Error fetching catch-up requests",
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// @desc   Approve catch-up for a specific cancelled session
// @route  PUT /api/clients/catchup-approve-session/:notificationId
// @access Private (Admin)
const approveCatchUpSession = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const adminId = req.user.id;
    const businessId = req.user.businessId;

    if (!businessId) {
      return res.status(400).json({
        success: false,
        message: "Business context required"
      });
    }

    // Find the notification
    const notification = await Notification.findById(notificationId)
      .populate('clientId', 'businessId')
      .populate('sessionId');

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Cancellation notification not found"
      });
    }

    // Verify it belongs to this business
    if (notification.businessId.toString() !== businessId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access denied. This cancellation does not belong to your business."
      });
    }

    // Verify it's a cancellation notification
    if (notification.type !== 'cancellation') {
      return res.status(400).json({
        success: false,
        message: "This notification is not a cancellation"
      });
    }

    // Update notification with approval
    notification.catchUpApprovalStatus = 'approved';
    notification.catchUpApprovedBy = adminId;
    notification.catchUpApprovedAt = new Date();
    await notification.save();

    res.json({
      success: true,
      message: "Catch-up access approved for this session",
      data: {
        notificationId: notification._id,
        sessionId: notification.sessionId?._id || notification.sessionId,
        catchUpApprovalStatus: notification.catchUpApprovalStatus,
        catchUpApprovedAt: notification.catchUpApprovedAt
      }
    });
  } catch (error) {
    console.error('Error approving catch-up session:', error);
    res.status(500).json({
      success: false,
      message: "Error approving catch-up session",
      error: error.message
    });
  }
};

// @desc   Reject catch-up for a specific cancelled session
// @route  PUT /api/clients/catchup-reject-session/:notificationId
// @access Private (Admin)
const rejectCatchUpSession = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const adminId = req.user.id;
    const businessId = req.user.businessId;

    if (!businessId) {
      return res.status(400).json({
        success: false,
        message: "Business context required"
      });
    }

    // Find the notification
    const notification = await Notification.findById(notificationId)
      .populate('clientId', 'businessId')
      .populate('sessionId');

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Cancellation notification not found"
      });
    }

    // Verify it belongs to this business
    if (notification.businessId.toString() !== businessId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access denied. This cancellation does not belong to your business."
      });
    }

    // Verify it's a cancellation notification
    if (notification.type !== 'cancellation') {
      return res.status(400).json({
        success: false,
        message: "This notification is not a cancellation"
      });
    }

    // Update notification with rejection
    notification.catchUpApprovalStatus = 'rejected';
    notification.catchUpApprovedBy = adminId;
    notification.catchUpApprovedAt = new Date();
    await notification.save();

    res.json({
      success: true,
      message: "Catch-up access rejected for this session",
      data: {
        notificationId: notification._id,
        sessionId: notification.sessionId?._id || notification.sessionId,
        catchUpApprovalStatus: notification.catchUpApprovalStatus,
        catchUpApprovedAt: notification.catchUpApprovedAt
      }
    });
  } catch (error) {
    console.error('Error rejecting catch-up session:', error);
    res.status(500).json({
      success: false,
      message: "Error rejecting catch-up session",
      error: error.message
    });
  }
};

// @desc   Add member to client account
// @route  POST /api/clients/members
// @access Private (Client - Primary account owner only)
const addMember = async (req, res) => {
  try {
    console.log('addMember called - req.user:', {
      id: req.user.id,
      _id: req.user._id,
      email: req.user.email,
      role: req.user.role,
      businessId: req.user.businessId,
      currentBusinessId: req.user.currentBusinessId,
      fullUser: req.user
    });
    
    // Get userId - try multiple ways to access it
    const userId = req.user._id || req.user.id || (req.user.user && req.user.user._id) || (req.user.user && req.user.user.id);
    
    if (!userId) {
      console.error('ERROR: userId is undefined! req.user:', JSON.stringify(req.user, null, 2));
      return res.status(500).json({
        success: false,
        message: "User ID not found in request. Please log out and log back in.",
        debug: {
          hasUser: !!req.user,
          userKeys: req.user ? Object.keys(req.user) : [],
          userId: userId
        }
      });
    }
    const businessId = req.user.currentBusinessId || req.user.businessId;
    
    if (!businessId) {
      return res.status(400).json({
        success: false,
        message: "Business context required"
      });
    }
    
    // Get primary client to ensure user has permission
    // First try to find primary client
    let primaryClient = await Client.findOne({ 
      userId, 
      isPrimary: true,
      businessId 
    });
    
    console.log('Looking for primary client:', { userId, businessId, found: !!primaryClient });
    
    // Fallback: if no primary client found, get any active client (for backward compatibility)
    if (!primaryClient) {
      // First, try to find any client (including inactive ones) for debugging
      const allClientsAnyStatus = await Client.find({ 
        userId, 
        businessId
      }).sort({ createdAt: 1 });
      
      console.log('All clients (any status) for user:', allClientsAnyStatus.length, allClientsAnyStatus.map(c => ({ 
        id: c._id, 
        isPrimary: c.isPrimary, 
        isActive: c.isActive,
        name: `${c.firstName} ${c.lastName}` 
      })));
      
      // Get active clients
      const allClients = await Client.find({ 
        userId, 
        businessId,
        isActive: true 
      }).sort({ createdAt: 1 });
      
      console.log('Active clients for user:', allClients.length, allClients.map(c => ({ 
        id: c._id, 
        isPrimary: c.isPrimary, 
        name: `${c.firstName} ${c.lastName}` 
      })));
      
      // If we found inactive clients, reactivate the first one
      if (allClientsAnyStatus.length > 0 && allClients.length === 0) {
        console.log('Found inactive client, reactivating:', allClientsAnyStatus[0]._id);
        allClientsAnyStatus[0].isActive = true;
        if (allClientsAnyStatus[0].isPrimary === undefined || allClientsAnyStatus[0].isPrimary === false || allClientsAnyStatus[0].isPrimary === null) {
          allClientsAnyStatus[0].isPrimary = true;
          allClientsAnyStatus[0].relationship = 'self';
        }
        await allClientsAnyStatus[0].save();
        primaryClient = allClientsAnyStatus[0];
        console.log('Client reactivated and set as primary');
      } else if (allClients.length > 0) {
        // Set the oldest client as primary (first one created)
        primaryClient = allClients[0];
        
        // Auto-fix: set as primary if not already set
        if (primaryClient.isPrimary === undefined || primaryClient.isPrimary === false || primaryClient.isPrimary === null) {
          console.log('Auto-setting client as primary:', primaryClient._id);
          primaryClient.isPrimary = true;
          primaryClient.relationship = 'self';
          await primaryClient.save();
          console.log('Client set as primary successfully');
        }
      }
    }
    
    if (!primaryClient) {
      // Check if user has clients for other businesses
      const clientsOtherBusinesses = await Client.find({ userId }).populate('businessId', 'name');
      console.error('No client found for user:', { 
        userId, 
        businessId,
        userEmail: req.user.email,
        userRole: req.user.role,
        clientsInOtherBusinesses: clientsOtherBusinesses.length,
        otherBusinesses: clientsOtherBusinesses.map(c => ({
          businessId: c.businessId?._id || c.businessId,
          businessName: c.businessId?.name,
          clientName: `${c.firstName} ${c.lastName}`
        }))
      });
      
      // Check if user exists
      const User = require("../models/User");
      const user = await User.findById(userId);
      
      let errorMessage = "Client account not found. Please ensure you have completed registration.";
      if (clientsOtherBusinesses.length > 0) {
        errorMessage += ` You have clients in other businesses. Current business ID: ${businessId}`;
      }
      if (!user) {
        errorMessage += " User account not found.";
      }
      
      return res.status(403).json({
        success: false,
        message: errorMessage,
        debug: {
          userId,
          businessId,
          hasUserAccount: !!user,
          clientsInOtherBusinesses: clientsOtherBusinesses.length
        }
      });
    }
    
    // Verify this is the primary account owner
    // After auto-fix above, isPrimary should be true, but double-check
    if (primaryClient.isPrimary !== true) {
      console.error('Client is not primary after auto-fix:', { 
        clientId: primaryClient._id, 
        isPrimary: primaryClient.isPrimary,
        userId,
        businessId 
      });
      return res.status(403).json({
        success: false,
        message: "Only account owners can add members. Please contact the account owner to add members."
      });
    }
    
    console.log('Primary client verified:', { 
      clientId: primaryClient._id, 
      isPrimary: primaryClient.isPrimary,
      name: `${primaryClient.firstName} ${primaryClient.lastName}`
    });
    
    // Validate required fields
    if (!req.body.firstName || !req.body.lastName) {
      return res.status(400).json({
        success: false,
        message: "First name and last name are required"
      });
    }
    
    // Create new member client
    const member = await Client.create({
      userId,  // Same user account
      businessId,
      isPrimary: false,
      addedBy: userId,
      relationship: req.body.relationship || "other",
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      dateOfBirth: req.body.dateOfBirth,
      phone: req.body.phone || primaryClient.phone, // Can inherit from primary
      emergencyContact: req.body.emergencyContact || primaryClient.emergencyContact,
      medicalInfo: req.body.medicalInfo || {},
      address: req.body.address || primaryClient.address,
      preferences: req.body.preferences || {}
    });
    
    await member.populate('businessId', 'name');
    
    res.status(201).json({
      success: true,
      message: "Member added successfully",
      data: member
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error adding member",
      error: error.message
    });
  }
};

// @desc   Get all members for client account
// @route  GET /api/clients/members
// @access Private (Client)
const getMembers = async (req, res) => {
  try {
    const userId = req.user._id;
    const businessId = req.user.currentBusinessId || req.user.businessId;
    
    if (!businessId) {
      return res.status(400).json({
        success: false,
        message: "Business context required"
      });
    }
    
    // Get all clients (primary + members) for this user account
    const allClients = await Client.find({ 
      userId, 
      businessId 
    })
    .populate('businessId', 'name')
    .sort({ isPrimary: -1, createdAt: 1 }); // Primary first, then by creation date
    
    const primary = allClients.find(c => c.isPrimary === true);
    const members = allClients.filter(c => c.isPrimary === false);
    
    res.json({
      success: true,
      data: {
        primary,
        members
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching members",
      error: error.message
    });
  }
};

// @desc   Update member
// @route  PUT /api/clients/members/:memberId
// @access Private (Client - Account owner only)
const updateMember = async (req, res) => {
  try {
    const userId = req.user._id;
    const memberId = req.params.memberId;
    const businessId = req.user.currentBusinessId || req.user.businessId;
    
    // Find the member
    const member = await Client.findById(memberId);
    
    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member not found"
      });
    }
    
    // Verify member belongs to this user account
    if (member.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access denied. This member does not belong to your account."
      });
    }
    
    // Verify member belongs to current business
    if (member.businessId.toString() !== businessId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Member does not belong to current business."
      });
    }
    
    // Prevent changing isPrimary or addedBy
    const updateData = { ...req.body };
    delete updateData.isPrimary;
    delete updateData.addedBy;
    delete updateData.userId;
    delete updateData.businessId;
    
    const updatedMember = await Client.findByIdAndUpdate(
      memberId,
      updateData,
      { new: true, runValidators: true }
    ).populate('businessId', 'name');
    
    res.json({
      success: true,
      message: "Member updated successfully",
      data: updatedMember
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating member",
      error: error.message
    });
  }
};

// @desc   Remove member from account
// @route  DELETE /api/clients/members/:memberId
// @access Private (Client - Account owner only)
const removeMember = async (req, res) => {
  try {
    const userId = req.user._id;
    const memberId = req.params.memberId;
    const businessId = req.user.currentBusinessId || req.user.businessId;
    
    // Find the member
    const member = await Client.findById(memberId);
    
    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member not found"
      });
    }
    
    // Prevent deleting primary client
    if (member.isPrimary) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete primary account owner"
      });
    }
    
    // Verify member belongs to this user account
    if (member.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access denied. This member does not belong to your account."
      });
    }
    
    // Verify member belongs to current business
    if (member.businessId.toString() !== businessId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Member does not belong to current business."
      });
    }
    
    // Check for active sessions
    const activeSessions = await Session.find({
      businessId,
      "enrolledClients.clientId": memberId,
      status: { $in: ["scheduled", "confirmed"] },
      date: { $gte: new Date() }
    });
    
    if (activeSessions.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete member with ${activeSessions.length} active session(s). Please cancel all sessions first.`,
        activeSessionsCount: activeSessions.length
      });
    }
    
    // Soft delete - set isActive to false
    member.isActive = false;
    await member.save();
    
    res.json({
      success: true,
      message: "Member removed successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error removing member",
      error: error.message
    });
  }
};

module.exports = {
  getClients,
  getPendingClients,
  getClient,
  createClient,
  updateClient,
  updateClientProfile,
  updateClientStatus,
  approveCatchUpAccess,
  rejectCatchUpAccess,
  approveCatchUpSession,
  rejectCatchUpSession,
  getPendingCatchUpApprovals,
  getCatchUpRequests,
  getClientSession,
  deactivateClient,
  getClientDashboard,
  addMember,
  getMembers,
  updateMember,
  removeMember
};

