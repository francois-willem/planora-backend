const Session = require("../models/Session");
const Class = require("../models/Class");
const Client = require("../models/Client");
const Employee = require("../models/Employee");

// @desc   Get all sessions for a business
// @route  GET /api/sessions
// @access Private (Admin, Instructor)
const getSessions = async (req, res) => {
  try {
    const businessId = req.user.businessId;
    const { startDate, endDate, instructorId, classId } = req.query;

    const query = { businessId };

    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    if (instructorId) {
      query.instructorId = instructorId;
    }

    if (classId) {
      query.classId = classId;
    }

    const sessions = await Session.find(query)
      .populate("classId", "title classType skillLevel maxCapacity")
      .populate("instructorId", "firstName lastName")
      .populate("enrolledClients.clientId", "firstName lastName")
      .sort({ date: 1, startTime: 1 });

    res.json({
      success: true,
      count: sessions.length,
      data: sessions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching sessions",
      error: error.message
    });
  }
};

// @desc   Get single session
// @route  GET /api/sessions/:id
// @access Private (Admin, Instructor, Client)
const getSession = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id)
      .populate("classId", "title classType skillLevel maxCapacity price")
      .populate("instructorId", "firstName lastName")
      .populate("enrolledClients.clientId", "firstName lastName")
      .populate("waitlist.clientId", "firstName lastName");

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found"
      });
    }

    // Check if user has access to this session
    if (req.user.role === "client") {
      const hasAccess = session.enrolledClients.some(
        enrollment => enrollment.clientId._id.toString() === req.user._id.toString()
      );
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: "Access denied"
        });
      }
    } else if (req.user.businessId.toString() !== session.businessId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    res.json({
      success: true,
      data: session
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching session",
      error: error.message
    });
  }
};

// @desc   Create new session
// @route  POST /api/sessions
// @access Private (Admin, Instructor)
const createSession = async (req, res) => {
  try {
    const businessId = req.user.businessId;
    
    console.log('Creating session with data:', req.body);
    console.log('Business ID:', businessId);
    
    // Verify the class belongs to this business
    const classData = await Class.findById(req.body.classId);
    if (!classData || classData.businessId.toString() !== businessId.toString()) {
      return res.status(400).json({
        success: false,
        message: "Invalid class for this business"
      });
    }

    // Ensure instructorId is an Employee _id, not a User _id
    let instructorEmployeeId = req.body.instructorId;
    if (!instructorEmployeeId) {
      // If not provided, infer from logged-in employee
      const selfEmployee = await Employee.findOne({ userId: req.user.id, businessId, isActive: true });
      if (!selfEmployee) {
        return res.status(400).json({ success: false, message: "Instructor not found for this business" });
      }
      instructorEmployeeId = selfEmployee._id;
    } else {
      // Validate: if a user id is passed by mistake, resolve to Employee id
      const maybeEmployee = await Employee.findOne({ _id: instructorEmployeeId, businessId, isActive: true });
      if (!maybeEmployee) {
        const viaUser = await Employee.findOne({ userId: instructorEmployeeId, businessId, isActive: true });
        if (!viaUser) {
          return res.status(400).json({ success: false, message: "Invalid instructor for this business" });
        }
        instructorEmployeeId = viaUser._id;
      }
    }

    const sessionData = {
      ...req.body,
      businessId,
      instructorId: instructorEmployeeId
    };

    console.log('Final session data:', sessionData);

    const session = await Session.create(sessionData);
    await session.populate("classId instructorId");

    res.status(201).json({
      success: true,
      data: session
    });
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({
      success: false,
      message: "Error creating session",
      error: error.message
    });
  }
};

// @desc   Update session
// @route  PUT /api/sessions/:id
// @access Private (Admin, Instructor)
const updateSession = async (req, res) => {
  try {
    const businessId = req.user.businessId;
    const sessionId = req.params.id;
    
    console.log('Updating session with ID:', sessionId);
    console.log('Update data:', req.body);
    
    // Find the existing session
    const existingSession = await Session.findById(sessionId);
    if (!existingSession) {
      return res.status(404).json({
        success: false,
        message: "Session not found"
      });
    }
    
    // Verify the session belongs to this business
    if (existingSession.businessId.toString() !== businessId.toString()) {
      return res.status(400).json({
        success: false,
        message: "Invalid session for this business"
      });
    }
    
    // Verify the class belongs to this business
    const classData = await Class.findById(req.body.classId);
    if (!classData || classData.businessId.toString() !== businessId.toString()) {
      return res.status(400).json({
        success: false,
        message: "Invalid class for this business"
      });
    }
    
    // Ensure instructorId is an Employee _id, not a User _id
    let instructorEmployeeId = req.body.instructorId;
    if (!instructorEmployeeId) {
      return res.status(400).json({ success: false, message: "Instructor ID is required" });
    } else {
      // Validate: if a user id is passed by mistake, resolve to Employee id
      const maybeEmployee = await Employee.findOne({ _id: instructorEmployeeId, businessId, isActive: true });
      if (!maybeEmployee) {
        const viaUser = await Employee.findOne({ userId: instructorEmployeeId, businessId, isActive: true });
        if (!viaUser) {
          return res.status(400).json({ success: false, message: "Invalid instructor for this business" });
        }
        instructorEmployeeId = viaUser._id;
      }
    }
    
    const updateData = {
      ...req.body,
      instructorId: instructorEmployeeId
    };
    
    console.log('Final update data:', updateData);
    
    const updatedSession = await Session.findByIdAndUpdate(
      sessionId,
      updateData,
      { new: true }
    ).populate("classId instructorId");
    
    res.status(200).json({
      success: true,
      data: updatedSession
    });
  } catch (error) {
    console.error('Error updating session:', error);
    res.status(500).json({
      success: false,
      message: "Error updating session",
      error: error.message
    });
  }
};

// @desc   Enroll client in session
// @route  POST /api/sessions/:id/enroll
// @access Private (Admin, Instructor, Client)
const enrollClient = async (req, res) => {
  try {
    const { clientId } = req.body;
    const session = await Session.findById(req.params.id)
      .populate("classId", "title classType skillLevel maxCapacity");

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found"
      });
    }

    // Check if user has access
    if (req.user.role === "client" && req.user._id.toString() !== clientId) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    if (req.user.role !== "client" && req.user.businessId.toString() !== session.businessId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    // Check if client is already enrolled
    const alreadyEnrolled = session.enrolledClients.some(
      enrollment => enrollment.clientId.toString() === clientId
    );

    if (alreadyEnrolled) {
      return res.status(400).json({
        success: false,
        message: "Client is already enrolled in this class"
      });
    }

    // Check capacity
    if (session.enrolledClients.length >= session.classId.maxCapacity) {
      // Add to waitlist
      session.waitlist.push({ clientId });
      await session.save();
      
      return res.status(200).json({
        success: true,
        message: "Class is full. Client added to waitlist.",
        data: session
      });
    }

    // Enroll client
    session.enrolledClients.push({
      clientId,
      status: "enrolled"
    });

    await session.save();
    await session.populate("enrolledClients.clientId", "firstName lastName");

    res.json({
      success: true,
      message: "Client enrolled successfully",
      data: session
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error enrolling client",
      error: error.message
    });
  }
};

// @desc   Cancel client enrollment
// @route  POST /api/sessions/:id/cancel
// @access Private (Admin, Instructor, Client)
const cancelEnrollment = async (req, res) => {
  try {
    const { clientId } = req.body;
    console.log('Cancel enrollment request:', { sessionId: req.params.id, clientId });
    
    const session = await Session.findById(req.params.id);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found"
      });
    }

    console.log('Found session:', session._id);
    console.log('Current enrolled clients:', session.enrolledClients.map(e => e.clientId.toString()));

    // Check if user has access
    if (req.user.role === "client" && req.user._id.toString() !== clientId) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    if (req.user.role !== "client" && req.user.businessId.toString() !== session.businessId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    // Find and remove enrollment
    const enrollmentIndex = session.enrolledClients.findIndex(
      enrollment => enrollment.clientId.toString() === clientId
    );

    if (enrollmentIndex === -1) {
      return res.status(400).json({
        success: false,
        message: "Client is not enrolled in this class"
      });
    }

    // Remove the client from enrolledClients array
    session.enrolledClients.splice(enrollmentIndex, 1);
    
    console.log('After removal, enrolled clients:', session.enrolledClients.map(e => e.clientId.toString()));
    
    // Make slot available for catch-up
    session.isAvailableForCatchUp = true;
    
    await session.save();
    console.log('Session saved successfully');

    // Check if there's someone on the waitlist
    if (session.waitlist.length > 0) {
      const nextClient = session.waitlist.shift();
      session.enrolledClients.push({
        clientId: nextClient.clientId,
        status: "enrolled",
        isCatchUp: true
      });
      session.isAvailableForCatchUp = false;
      await session.save();
    }

    await session.populate("enrolledClients.clientId", "firstName lastName");

    res.json({
      success: true,
      message: "Enrollment cancelled successfully",
      data: session
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error cancelling enrollment",
      error: error.message
    });
  }
};

// @desc   Get available catch-up lessons
// @route  GET /api/sessions/catchup
// @access Private (Client)
const getCatchUpLessons = async (req, res) => {
  try {
    const businessId = req.user.businessId;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const catchUpLessons = await Session.find({
      businessId,
      isAvailableForCatchUp: true,
      date: { $gte: today },
      status: { $in: ["scheduled", "confirmed"] }
    })
      .populate("classId", "title classType skillLevel price")
      .populate("instructorId", "firstName lastName")
      .sort({ date: 1, startTime: 1 });

    res.json({
      success: true,
      count: catchUpLessons.length,
      data: catchUpLessons
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching catch-up lessons",
      error: error.message
    });
  }
};

// @desc   Get employee's assigned classes
// @route  GET /api/sessions/employee/:businessId
// @access Private (Employee)
  const getEmployeeClasses = async (req, res) => {
  try {
    const { businessId } = req.params;
    const employeeUserId = req.user.id;

    // Verify the employee belongs to this business
    const Employee = require("../models/Employee");
    const employee = await Employee.findOne({
      userId: employeeUserId,
      businessId: businessId,
      isActive: true
    });

    if (!employee) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You don't belong to this business."
      });
    }

    // Get sessions where this employee is the instructor
    // Note: sessions store instructorId as the Employee document _id, not the User _id
    const sessions = await Session.find({
      businessId: businessId,
      instructorId: employee?._id
    })
    .populate("classId", "title classType skillLevel maxCapacity")
    .populate("enrolledClients.clientId", "firstName lastName")
    .sort({ date: 1, startTime: 1 });

    // Format the data for the employee dashboard
    const formattedClasses = sessions.map(session => ({
      _id: session._id,
      className: session.classId?.title || 'Swimming Lesson',
      clientName: session.enrolledClients.length > 0 
        ? session.enrolledClients.map(client => 
            `${client.clientId.firstName} ${client.clientId.lastName}`
          ).join(', ')
        : 'No clients enrolled',
      startTime: session.startTime,
      endTime: session.endTime,
      date: session.date,
      duration: session.duration || 30,
      status: session.status || 'scheduled',
      maxCapacity: session.classId?.maxCapacity || 8,
      enrolledCount: session.enrolledClients.length
    }));

    res.json({
      success: true,
      count: formattedClasses.length,
      data: formattedClasses
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching employee classes",
      error: error.message
    });
  }
};

// @desc   Delete session
// @route  DELETE /api/sessions/:id
// @access Private (Admin, Instructor)
const deleteSession = async (req, res) => {
  try {
    const sessionId = req.params.id;
    const businessId = req.user.businessId;
    
    console.log('Deleting session with ID:', sessionId);
    
    // Find the session
    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found"
      });
    }
    
    // Verify the session belongs to this business
    if (session.businessId.toString() !== businessId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }
    
    // Check if there are enrolled clients
    if (session.enrolledClients && session.enrolledClients.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete session with enrolled clients. Please cancel all enrollments first."
      });
    }
    
    // Delete the session
    await Session.findByIdAndDelete(sessionId);
    
    res.json({
      success: true,
      message: "Session deleted successfully"
    });
  } catch (error) {
    console.error('Error deleting session:', error);
    res.status(500).json({
      success: false,
      message: "Error deleting session",
      error: error.message
    });
  }
};

module.exports = {
  getSessions,
  getSession,
  createSession,
  updateSession,
  deleteSession,
  enrollClient,
  cancelEnrollment,
  getCatchUpLessons,
  getEmployeeClasses
};

