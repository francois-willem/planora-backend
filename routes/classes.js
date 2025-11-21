const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const Class = require("../models/Class");

// All routes require authentication
router.use(auth());

// @route   GET /api/classes
// @desc    Get all classes for a business
// @access  Private (Admin, Instructor)
const getClasses = async (req, res) => {
  try {
    const businessId = req.user.businessId;
    const { classType, skillLevel, isActive } = req.query;

    const query = { businessId };

    if (classType) {
      query.classType = classType;
    }

    if (skillLevel) {
      query.skillLevel = skillLevel;
    }

    if (isActive !== undefined) {
      query.isActive = isActive === "true";
    }

    const classes = await Class.find(query)
      .populate("instructorId", "firstName lastName")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: classes.length,
      data: classes
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching classes",
      error: error.message
    });
  }
};

// @route   GET /api/classes/:id
// @desc    Get single class
// @access  Private (Admin, Instructor)
const getClass = async (req, res) => {
  try {
    const classData = await Class.findById(req.params.id)
      .populate("instructorId", "firstName lastName");

    if (!classData) {
      return res.status(404).json({
        success: false,
        message: "Class not found"
      });
    }

    // Check if user has access to this class
    if (req.user.businessId.toString() !== classData.businessId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    res.json({
      success: true,
      data: classData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching class",
      error: error.message
    });
  }
};

// @route   POST /api/classes
// @desc    Create new class
// @access  Private (Admin, Instructor)
const createClass = async (req, res) => {
  try {
    const businessId = req.user.businessId;
    
    console.log('Creating class with data:', req.body);
    console.log('Business ID:', businessId);
    
    const classData = {
      ...req.body,
      businessId
    };

    console.log('Final class data:', classData);

    const newClass = await Class.create(classData);

    res.status(201).json({
      success: true,
      data: newClass
    });
  } catch (error) {
    console.error('Error creating class:', error);
    res.status(500).json({
      success: false,
      message: "Error creating class",
      error: error.message
    });
  }
};

// @route   PUT /api/classes/:id
// @desc    Update class
// @access  Private (Admin, Instructor)
const updateClass = async (req, res) => {
  try {
    const classData = await Class.findById(req.params.id);

    if (!classData) {
      return res.status(404).json({
        success: false,
        message: "Class not found"
      });
    }

    // Check if user has access to this class
    if (req.user.businessId.toString() !== classData.businessId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    const updatedClass = await Class.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate("instructorId", "firstName lastName");

    res.json({
      success: true,
      data: updatedClass
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating class",
      error: error.message
    });
  }
};

// @route   DELETE /api/classes/:id
// @desc    Deactivate class
// @access  Private (Admin)
const deactivateClass = async (req, res) => {
  try {
    const classData = await Class.findById(req.params.id);

    if (!classData) {
      return res.status(404).json({
        success: false,
        message: "Class not found"
      });
    }

    // Check if user has access to this class
    if (req.user.businessId.toString() !== classData.businessId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    classData.isActive = false;
    await classData.save();

    res.json({
      success: true,
      message: "Class deactivated successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deactivating class",
      error: error.message
    });
  }
};

// Routes
router.get("/", auth(["admin", "instructor"]), getClasses);
router.get("/:id", auth(["admin", "instructor"]), getClass);
router.post("/", auth(["admin", "instructor"]), createClass);
router.put("/:id", auth(["admin", "instructor"]), updateClass);
router.delete("/:id", auth(["admin"]), deactivateClass);

module.exports = router;

