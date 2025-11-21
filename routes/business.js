const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const {
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
} = require("../controllers/businessController");
const {
  getDiscoverableBusinesses,
  validateBusinessCode
} = require("../controllers/registrationController");

// Public routes (no authentication required)
// @route   POST /api/businesses/register
// @desc    Public business registration
// @access  Public
router.post("/register", registerBusinessPublic);

// @route   GET /api/businesses/discover
// @desc    Get discoverable businesses for registration
// @access  Public
router.get("/discover", getDiscoverableBusinesses);

// @route   GET /api/businesses/validate-code/:code
// @desc    Validate business code
// @access  Public
router.get("/validate-code/:code", validateBusinessCode);

// All other routes require authentication
router.use(auth());

// @route   GET /api/businesses
// @desc    Get all businesses (Super Admin only)
// @access  Private (Super Admin)
router.get("/", auth(["super-admin"]), getAllBusinesses);

// @route   GET /api/businesses/:id
// @desc    Get single business
// @access  Private (Super Admin, Business Admin)
router.get("/:id", auth(["super-admin", "admin"]), getBusiness);

// @route   POST /api/businesses
// @desc    Create new business
// @access  Private (Super Admin)
router.post("/", auth(["super-admin"]), createBusiness);

// @route   PUT /api/businesses/:id
// @desc    Update business
// @access  Private (Super Admin, Business Admin)
router.put("/:id", auth(["super-admin", "admin"]), updateBusiness);

// @route   DELETE /api/businesses/:id
// @desc    Deactivate business
// @access  Private (Super Admin)
router.delete("/:id", auth(["super-admin"]), deactivateBusiness);

// @route   DELETE /api/businesses/:id/permanent
// @desc    Permanently delete business and all related data
// @access  Private (Super Admin only)
router.delete("/:id/permanent", auth(["super-admin"]), permanentlyDeleteBusiness);

// @route   GET /api/businesses/:id/deletion-preview
// @desc    Get business deletion preview (what will be deleted)
// @access  Private (Super Admin only)
router.get("/:id/deletion-preview", auth(["super-admin"]), getBusinessDeletionPreview);

// @route   GET /api/businesses/:id/dashboard
// @desc    Get business dashboard data
// @access  Private (Super Admin, Business Admin)
router.get("/:id/dashboard", auth(["super-admin", "admin"]), getBusinessDashboard);

// Business Code Management Routes
// @route   POST /api/businesses/:id/codes
// @desc    Create business code
// @access  Private (Business Admin)
router.post("/:id/codes", auth(["admin"]), createBusinessCode);

// @route   GET /api/businesses/:id/codes
// @desc    Get business codes
// @access  Private (Business Admin)
router.get("/:id/codes", auth(["admin"]), getBusinessCodes);

// @route   PUT /api/businesses/:id/codes/:codeId
// @desc    Update business code
// @access  Private (Business Admin)
router.put("/:id/codes/:codeId", auth(["admin"]), updateBusinessCode);

// @route   DELETE /api/businesses/:id/codes/:codeId
// @desc    Delete business code
// @access  Private (Business Admin)
router.delete("/:id/codes/:codeId", auth(["admin"]), deleteBusinessCode);

// Business Invitation Management Routes
// @route   POST /api/businesses/:id/invite
// @desc    Create business invitation
// @access  Private (Business Admin)
router.post("/:id/invite", auth(["admin"]), createBusinessInvitation);

// @route   GET /api/businesses/:id/invitations
// @desc    Get business invitations
// @access  Private (Business Admin)
router.get("/:id/invitations", auth(["admin"]), getBusinessInvitations);

// @route   PUT /api/businesses/:id/invitations/:invitationId
// @desc    Update business invitation
// @access  Private (Business Admin)
router.put("/:id/invitations/:invitationId", auth(["admin"]), updateBusinessInvitation);

// @route   DELETE /api/businesses/:id/invitations/:invitationId
// @desc    Delete business invitation
// @access  Private (Business Admin)
router.delete("/:id/invitations/:invitationId", auth(["admin"]), deleteBusinessInvitation);

// Client Request Management Routes
// @route   GET /api/businesses/:id/pending-requests
// @desc    Get pending client requests
// @access  Private (Business Admin)
router.get("/:id/pending-requests", auth(["admin"]), getPendingRequests);

// @route   POST /api/businesses/:id/approve-request
// @desc    Approve client request
// @access  Private (Business Admin)
router.post("/:id/approve-request", auth(["admin"]), approveClientRequest);

// @route   POST /api/businesses/:id/reject-request
// @desc    Reject client request
// @access  Private (Business Admin)
router.post("/:id/reject-request", auth(["admin"]), rejectClientRequest);

module.exports = router;
