const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const {
  getInstructors,
  getInstructor,
  createInstructor,
  updateInstructor,
  deactivateInstructor
} = require("../controllers/instructorController");

// All routes require authentication
router.use(auth());

// @route   GET /api/instructors
// @desc    Get all instructors for a business
// @access  Private (Admin, Instructor)
router.get("/", auth(["admin", "instructor"]), getInstructors);

// @route   GET /api/instructors/:id
// @desc    Get single instructor
// @access  Private (Admin, Instructor)
router.get("/:id", auth(["admin", "instructor"]), getInstructor);

// @route   POST /api/instructors
// @desc    Create new instructor
// @access  Private (Admin)
router.post("/", auth(["admin"]), createInstructor);

// @route   PUT /api/instructors/:id
// @desc    Update instructor
// @access  Private (Admin, Instructor)
router.put("/:id", auth(["admin", "instructor"]), updateInstructor);

// @route   DELETE /api/instructors/:id
// @desc    Deactivate instructor
// @access  Private (Admin)
router.delete("/:id", auth(["admin"]), deactivateInstructor);

module.exports = router;

