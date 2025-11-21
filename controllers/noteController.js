const Note = require("../models/Note");
const Session = require("../models/Session");

// @desc   Get notes for a client
// @route  GET /api/notes/client/:clientId
// @access Private (Admin, Instructor, Client)
const getClientNotes = async (req, res) => {
  try {
    const { clientId } = req.params;
    const { noteType, isVisibleToClient } = req.query;

    const query = { clientId };

    // If client is requesting their own notes, only show visible ones
    if (req.user.role === "client" && req.user._id.toString() === clientId) {
      query.isVisibleToClient = true;
    }

    if (noteType) {
      query.noteType = noteType;
    }

    const notes = await Note.find(query)
      .populate("instructorId", "firstName lastName")
      .populate("sessionId", "date startTime")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: notes.length,
      data: notes
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching notes",
      error: error.message
    });
  }
};

// @desc   Get notes for a session
// @route  GET /api/notes/session/:sessionId
// @access Private (Admin, Instructor)
const getSessionNotes = async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found"
      });
    }

    // Check if user has access to this session
    if (req.user.businessId.toString() !== session.businessId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    const notes = await Note.find({ sessionId })
      .populate("instructorId", "firstName lastName")
      .populate("clientId", "firstName lastName")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: notes.length,
      data: notes
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching session notes",
      error: error.message
    });
  }
};

// @desc   Create new note
// @route  POST /api/notes
// @access Private (Admin, Instructor)
const createNote = async (req, res) => {
  try {
    const { sessionId, clientId, content, noteType, isVisibleToClient, priority, tags } = req.body;

    // Verify the session exists and user has access
    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found"
      });
    }

    if (req.user.businessId.toString() !== session.businessId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    const noteData = {
      businessId: req.user.businessId,
      sessionId,
      clientId,
      instructorId: req.user._id,
      content,
      noteType: noteType || "general",
      isVisibleToClient: isVisibleToClient || false,
      priority: priority || "medium",
      tags: tags || []
    };

    const note = await Note.create(noteData);
    await note.populate("instructorId", "firstName lastName");
    await note.populate("clientId", "firstName lastName");
    await note.populate("sessionId", "date startTime");

    res.status(201).json({
      success: true,
      data: note
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating note",
      error: error.message
    });
  }
};

// @desc   Update note
// @route  PUT /api/notes/:id
// @access Private (Admin, Instructor)
const updateNote = async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);

    if (!note) {
      return res.status(404).json({
        success: false,
        message: "Note not found"
      });
    }

    // Check if user has access to this note
    if (req.user.businessId.toString() !== note.businessId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    // Only the instructor who created the note or admin can update it
    if (req.user.role !== "admin" && req.user._id.toString() !== note.instructorId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    const updatedNote = await Note.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate("instructorId", "firstName lastName")
      .populate("clientId", "firstName lastName")
      .populate("sessionId", "date startTime");

    res.json({
      success: true,
      data: updatedNote
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating note",
      error: error.message
    });
  }
};

// @desc   Delete note
// @route  DELETE /api/notes/:id
// @access Private (Admin, Instructor)
const deleteNote = async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);

    if (!note) {
      return res.status(404).json({
        success: false,
        message: "Note not found"
      });
    }

    // Check if user has access to this note
    if (req.user.businessId.toString() !== note.businessId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    // Only the instructor who created the note or admin can delete it
    if (req.user.role !== "admin" && req.user._id.toString() !== note.instructorId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    await Note.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Note deleted successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting note",
      error: error.message
    });
  }
};

// @desc   Get notes by instructor
// @route  GET /api/notes/instructor/:instructorId
// @access Private (Admin, Instructor)
const getInstructorNotes = async (req, res) => {
  try {
    const { instructorId } = req.params;
    const { startDate, endDate } = req.query;

    // Check if user has access
    if (req.user.role !== "admin" && req.user._id.toString() !== instructorId) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    const query = { instructorId };

    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const notes = await Note.find(query)
      .populate("clientId", "firstName lastName")
      .populate("sessionId", "date startTime")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: notes.length,
      data: notes
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching instructor notes",
      error: error.message
    });
  }
};

module.exports = {
  getClientNotes,
  getSessionNotes,
  createNote,
  updateNote,
  deleteNote,
  getInstructorNotes
};

