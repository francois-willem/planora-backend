const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const {
  getClientNotes,
  getSessionNotes,
  createNote,
  updateNote,
  deleteNote,
  getInstructorNotes
} = require("../controllers/noteController");

// All routes require authentication
router.use(auth());

// @route   GET /api/notes/client/:clientId
// @desc    Get notes for a client
// @access  Private (Admin, Instructor, Client)
router.get("/client/:clientId", auth(["admin", "instructor", "client"]), getClientNotes);

// @route   GET /api/notes/session/:sessionId
// @desc    Get notes for a session
// @access  Private (Admin, Instructor)
router.get("/session/:sessionId", auth(["admin", "instructor"]), getSessionNotes);

// @route   GET /api/notes/instructor/:instructorId
// @desc    Get notes by instructor
// @access  Private (Admin, Instructor)
router.get("/instructor/:instructorId", auth(["admin", "instructor"]), getInstructorNotes);

// @route   POST /api/notes
// @desc    Create new note
// @access  Private (Admin, Instructor)
router.post("/", auth(["admin", "instructor"]), createNote);

// @route   PUT /api/notes/:id
// @desc    Update note
// @access  Private (Admin, Instructor)
router.put("/:id", auth(["admin", "instructor"]), updateNote);

// @route   DELETE /api/notes/:id
// @desc    Delete note
// @access  Private (Admin, Instructor)
router.delete("/:id", auth(["admin", "instructor"]), deleteNote);

module.exports = router;

