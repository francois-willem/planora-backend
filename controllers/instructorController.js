const Instructor = require("../models/Instructor");
const User = require("../models/User");

// @desc   Get all instructors for a business
// @route  GET /api/instructors
// @access Private (Admin, Instructor)
const getInstructors = async (req, res) => {
  try {
    const businessId = req.user.businessId;
    const instructors = await Instructor.find({ businessId, isActive: true })
      .populate("userId", "email")
      .select("-__v")
      .sort({ hireDate: -1 });

    res.json({
      success: true,
      count: instructors.length,
      data: instructors
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching instructors",
      error: error.message
    });
  }
};

// @desc   Get single instructor
// @route  GET /api/instructors/:id
// @access Private (Admin, Instructor)
const getInstructor = async (req, res) => {
  try {
    const instructor = await Instructor.findById(req.params.id)
      .populate("userId", "email");

    if (!instructor) {
      return res.status(404).json({
        success: false,
        message: "Instructor not found"
      });
    }

    // Check if user has access to this instructor
    if (req.user.businessId.toString() !== instructor.businessId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    res.json({
      success: true,
      data: instructor
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching instructor",
      error: error.message
    });
  }
};

// @desc   Create new instructor
// @route  POST /api/instructors
// @access Private (Admin)
const createInstructor = async (req, res) => {
  try {
    const businessId = req.user.businessId;
    
    // Check if user already exists as an instructor for this business
    const existingInstructor = await Instructor.findOne({
      userId: req.body.userId,
      businessId
    });

    if (existingInstructor) {
      return res.status(400).json({
        success: false,
        message: "User is already an instructor for this business"
      });
    }

    const instructorData = {
      ...req.body,
      businessId
    };

    const instructor = await Instructor.create(instructorData);
    await instructor.populate("userId", "email");

    res.status(201).json({
      success: true,
      data: instructor
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating instructor",
      error: error.message
    });
  }
};

// @desc   Update instructor
// @route  PUT /api/instructors/:id
// @access Private (Admin, Instructor)
const updateInstructor = async (req, res) => {
  try {
    const instructor = await Instructor.findById(req.params.id);

    if (!instructor) {
      return res.status(404).json({
        success: false,
        message: "Instructor not found"
      });
    }

    // Check if user has access to this instructor
    if (req.user.businessId.toString() !== instructor.businessId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    // Only admin or the instructor themselves can update
    if (req.user.role !== "admin" && req.user._id.toString() !== instructor.userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    const updatedInstructor = await Instructor.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate("userId", "email");

    res.json({
      success: true,
      data: updatedInstructor
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating instructor",
      error: error.message
    });
  }
};

// @desc   Deactivate instructor
// @route  DELETE /api/instructors/:id
// @access Private (Admin)
const deactivateInstructor = async (req, res) => {
  try {
    const instructor = await Instructor.findById(req.params.id);

    if (!instructor) {
      return res.status(404).json({
        success: false,
        message: "Instructor not found"
      });
    }

    if (req.user.businessId.toString() !== instructor.businessId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    instructor.isActive = false;
    await instructor.save();

    // Deactivate the associated user account
    await User.findByIdAndUpdate(instructor.userId, { isActive: false });

    res.json({
      success: true,
      message: "Instructor deactivated successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deactivating instructor",
      error: error.message
    });
  }
};

module.exports = {
  getInstructors,
  getInstructor,
  createInstructor,
  updateInstructor,
  deactivateInstructor
};

