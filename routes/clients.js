const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const {
  getClients,
  getPendingClients,
  getClient,
  createClient,
  updateClient,
  updateClientProfile,
  updateClientStatus,
  getClientSession,
  deactivateClient,
  getClientDashboard,
  approveCatchUpAccess,
  rejectCatchUpAccess,
  approveCatchUpSession,
  rejectCatchUpSession,
  getPendingCatchUpApprovals,
  getCatchUpRequests,
  addMember,
  getMembers,
  updateMember,
  removeMember
} = require("../controllers/clientController");

// Authentication is handled per route

// @route   GET /api/clients/dashboard
// @desc    Get client dashboard data
// @access  Private (Client)
router.get("/dashboard", auth(["client"]), getClientDashboard);

// @route   PUT /api/clients/profile
// @desc    Update client's own profile
// @access  Private (Client)
router.put("/profile", auth(["client"]), updateClientProfile);

// @route   GET /api/clients
// @desc    Get all clients for a business
// @access  Private (Admin, Instructor)
router.get("/", auth(["admin", "instructor"]), getClients);

// @route   GET /api/clients/pending
// @desc    Get pending clients for a business
// @access  Private (Admin)
router.get("/pending", auth(["admin"]), getPendingClients);

// @route   GET /api/clients/pending-catchup-approval
// @desc    Get clients pending catch-up approval
// @access  Private (Admin)
router.get("/pending-catchup-approval", auth(["admin"]), getPendingCatchUpApprovals);

// @route   GET /api/clients/catchup-requests
// @desc    Get all clients with cancelled lessons for catch-up management
// @access  Private (Admin)
router.get("/catchup-requests", auth(["admin"]), (req, res, next) => {
  console.log('Route /catchup-requests matched');
  console.log('User:', req.user ? { id: req.user.id, role: req.user.role, businessId: req.user.businessId } : 'No user');
  next();
}, getCatchUpRequests);

// Member management routes
// @route   GET /api/clients/members
// @desc    Get all members for client account
// @access  Private (Client)
router.get("/members", auth(["client"]), getMembers);

// @route   POST /api/clients/members
// @desc    Add member to client account
// @access  Private (Client)
router.post("/members", auth(["client"]), addMember);

// @route   PUT /api/clients/members/:memberId
// @desc    Update member
// @access  Private (Client)
router.put("/members/:memberId", auth(["client"]), updateMember);

// @route   DELETE /api/clients/members/:memberId
// @desc    Remove member from account
// @access  Private (Client)
router.delete("/members/:memberId", auth(["client"]), removeMember);

// IMPORTANT: All specific routes (like /dashboard, /pending, /catchup-requests, /members) must be defined
// BEFORE the parameterized route /:id to avoid route conflicts

// @route   GET /api/clients/:id
// @desc    Get single client
// @access  Private (Admin, Instructor, Client)
router.get("/:id", auth(["admin", "instructor", "client"]), getClient);

// @route   POST /api/clients
// @desc    Create new client
// @access  Private (Admin)
router.post("/", auth(["admin"]), createClient);

// @route   PUT /api/clients/:id
// @desc    Update client
// @access  Private (Admin, Client)
router.put("/:id", auth(["admin", "client"]), updateClient);

// @route   PUT /api/clients/:id/status
// @desc    Update client status (approve/suspend)
// @access  Private (Admin)
router.put("/:id/status", auth(["admin"]), updateClientStatus);

// @route   GET /api/clients/:id/session
// @desc    Get client's session
// @access  Private (Admin, Instructor, Client)
router.get("/:id/session", auth(["admin", "instructor", "client"]), getClientSession);

// @route   PUT /api/clients/:id/catchup-approve
// @desc    Approve client catch-up access
// @access  Private (Admin)
router.put("/:id/catchup-approve", auth(["admin"]), approveCatchUpAccess);

// @route   PUT /api/clients/:id/catchup-reject
// @desc    Reject client catch-up access
// @access  Private (Admin)
router.put("/:id/catchup-reject", auth(["admin"]), rejectCatchUpAccess);

// @route   PUT /api/clients/catchup-approve-session/:notificationId
// @desc    Approve catch-up for a specific cancelled session
// @access  Private (Admin)
router.put("/catchup-approve-session/:notificationId", auth(["admin"]), approveCatchUpSession);

// @route   PUT /api/clients/catchup-reject-session/:notificationId
// @desc    Reject catch-up for a specific cancelled session
// @access  Private (Admin)
router.put("/catchup-reject-session/:notificationId", auth(["admin"]), rejectCatchUpSession);

// @route   DELETE /api/clients/:id
// @desc    Deactivate client
// @access  Private (Admin)
router.delete("/:id", auth(["admin"]), deactivateClient);

module.exports = router;

