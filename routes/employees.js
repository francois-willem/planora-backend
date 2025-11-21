const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const {
  getEmployees,
  getEmployeeById,
  updateEmployee,
  deactivateEmployee,
  getEmployeeProfile,
  updateEmployeeProfile,
  getPendingEmployees,
  approveEmployee,
  rejectEmployee
} = require("../controllers/employeeController");

// Employee self-service routes (accessible by employees)
// @route   GET /api/employees/profile/:userId
// @desc    Get employee's own profile
// @access  Private (Employee)
router.get("/profile/:userId", auth(["employee"]), getEmployeeProfile);

// @route   PUT /api/employees/profile/:userId
// @desc    Update employee's own profile
// @access  Private (Employee)
router.put("/profile/:userId", auth(["employee"]), updateEmployeeProfile);

// Admin-only routes
// All other routes require admin authentication
router.use(auth(["admin"]));

// @route   GET /api/employees/pending
// @desc    Get pending employees for approval
// @access  Private (Admin)
router.get("/pending", getPendingEmployees);

// @route   GET /api/employees
// @desc    Get all employees for the business
// @access  Private (Admin)
router.get("/", getEmployees);

// @route   GET /api/employees/:id
// @desc    Get employee by ID
// @access  Private (Admin)
router.get("/:id", getEmployeeById);

// @route   PUT /api/employees/:id
// @desc    Update employee
// @access  Private (Admin)
router.put("/:id", updateEmployee);

// @route   PUT /api/employees/:id/approve
// @desc    Approve employee
// @access  Private (Admin)
router.put("/:id/approve", approveEmployee);

// @route   PUT /api/employees/:id/reject
// @desc    Reject employee
// @access  Private (Admin)
router.put("/:id/reject", rejectEmployee);

// @route   DELETE /api/employees/:id
// @desc    Deactivate employee
// @access  Private (Admin)
router.delete("/:id", deactivateEmployee);

module.exports = router;
