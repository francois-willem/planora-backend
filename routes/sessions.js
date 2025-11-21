const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const {
  getSessions,
  getSession,
  createSession,
  updateSession,
  deleteSession,
  enrollClient,
  cancelEnrollment,
  getCatchUpLessons,
  getEmployeeClasses
} = require("../controllers/sessionController");

// All routes require authentication
router.use(auth());

// @route   GET /api/sessions
// @desc    Get all sessions for a business
// @access  Private (Admin, Instructor)
router.get("/", auth(["admin", "instructor"]), getSessions);

// @route   GET /api/sessions/catchup
// @desc    Get available catch-up lessons
// @access  Private (Client)
router.get("/catchup", auth(["client"]), getCatchUpLessons);

// @route   GET /api/sessions/employee/:businessId
// @desc    Get employee's assigned classes
// @access  Private (Employee)
router.get("/employee/:businessId", auth(["employee"]), getEmployeeClasses);

// @route   GET /api/sessions/:id
// @desc    Get single session
// @access  Private (Admin, Instructor, Client)
router.get("/:id", auth(["admin", "instructor", "client"]), getSession);

// @route   POST /api/sessions
// @desc    Create new session
// @access  Private (Admin, Instructor)
router.post("/", auth(["admin", "instructor"]), createSession);

// @route   PUT /api/sessions/:id
// @desc    Update session
// @access  Private (Admin, Instructor)
router.put("/:id", auth(["admin", "instructor"]), updateSession);

// @route   POST /api/sessions/:id/enroll
// @desc    Enroll client in session
// @access  Private (Admin, Instructor, Client)
router.post("/:id/enroll", auth(["admin", "instructor", "client"]), enrollClient);

// @route   POST /api/sessions/:id/cancel
// @desc    Cancel client enrollment
// @access  Private (Admin, Instructor, Client)
router.post("/:id/cancel", auth(["admin", "instructor", "client"]), cancelEnrollment);

// @route   DELETE /api/sessions/:id
// @desc    Delete session
// @access  Private (Admin, Instructor)
router.delete("/:id", auth(["admin", "instructor"]), deleteSession);

module.exports = router;

