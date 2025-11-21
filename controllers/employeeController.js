const Employee = require("../models/Employee");
const User = require("../models/User");
const Business = require("../models/Business");

// @desc   Get all employees for a business
// @route  GET /api/employees
// @access Private (Admin)
const getEmployees = async (req, res) => {
  try {
    const businessId = req.user.currentBusiness?.businessId?._id;
    
    if (!businessId) {
      return res.status(400).json({
        success: false,
        message: "No business context found"
      });
    }

    const employees = await Employee.find({ 
      businessId,
      status: "approved", // Only return approved employees
      isActive: true 
    })
    .populate('userId', 'email role')
    .sort({ firstName: 1, lastName: 1 });

    res.json({
      success: true,
      data: employees
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching employees",
      error: error.message
    });
  }
};

// @desc   Get employee by ID
// @route  GET /api/employees/:id
// @access Private (Admin)
const getEmployeeById = async (req, res) => {
  try {
    const { id } = req.params;
    const businessId = req.user.currentBusiness?.businessId?._id;
    
    if (!businessId) {
      return res.status(400).json({
        success: false,
        message: "No business context found"
      });
    }

    const employee = await Employee.findOne({ 
      _id: id,
      businessId,
      isActive: true 
    })
    .populate('userId', 'email role')
    .populate('businessId', 'name');

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found"
      });
    }

    res.json({
      success: true,
      data: employee
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching employee",
      error: error.message
    });
  }
};

// @desc   Update employee
// @route  PUT /api/employees/:id
// @access Private (Admin)
const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    const businessId = req.user.currentBusiness?.businessId?._id;
    
    if (!businessId) {
      return res.status(400).json({
        success: false,
        message: "No business context found"
      });
    }

    const updateData = {};
    if (isActive !== undefined) updateData.isActive = isActive;

    const employee = await Employee.findOneAndUpdate(
      { _id: id, businessId },
      updateData,
      { new: true, runValidators: true }
    )
    .populate('userId', 'email role')
    .populate('businessId', 'name');

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found"
      });
    }

    res.json({
      success: true,
      message: "Employee updated successfully",
      data: employee
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating employee",
      error: error.message
    });
  }
};

// @desc   Deactivate employee
// @route  DELETE /api/employees/:id
// @access Private (Admin)
const deactivateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const businessId = req.user.currentBusiness?.businessId?._id;
    
    if (!businessId) {
      return res.status(400).json({
        success: false,
        message: "No business context found"
      });
    }

    const employee = await Employee.findOneAndUpdate(
      { _id: id, businessId },
      { isActive: false },
      { new: true }
    );

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found"
      });
    }

    res.json({
      success: true,
      message: "Employee deactivated successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deactivating employee",
      error: error.message
    });
  }
};

// @desc   Get employee's own profile
// @route  GET /api/employees/profile/:userId
// @access Private (Employee)
const getEmployeeProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Verify the user is accessing their own profile
    if (req.user.id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only view your own profile."
      });
    }

    const employee = await Employee.findOne({ 
      userId: userId,
      isActive: true 
    })
    .populate('businessId', 'name businessType');

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee profile not found"
      });
    }

    res.json({
      success: true,
      data: {
        firstName: employee.firstName,
        lastName: employee.lastName,
        phone: employee.phone,
        employeeType: employee.employeeType,
        businessName: employee.businessId.name,
        businessType: employee.businessId.businessType,
        hireDate: employee.hireDate
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching employee profile",
      error: error.message
    });
  }
};

// @desc   Update employee's own profile
// @route  PUT /api/employees/profile/:userId
// @access Private (Employee)
const updateEmployeeProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const { firstName, lastName, phone } = req.body;
    
    // Verify the user is updating their own profile
    if (req.user.id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only update your own profile."
      });
    }

    const updateData = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (phone !== undefined) updateData.phone = phone;

    const employee = await Employee.findOneAndUpdate(
      { userId: userId, isActive: true },
      updateData,
      { new: true, runValidators: true }
    )
    .populate('businessId', 'name');

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee profile not found"
      });
    }

    res.json({
      success: true,
      message: "Profile updated successfully",
      data: {
        firstName: employee.firstName,
        lastName: employee.lastName,
        phone: employee.phone,
        employeeType: employee.employeeType
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating employee profile",
      error: error.message
    });
  }
};

// @desc   Get pending employees for approval
// @route  GET /api/employees/pending
// @access Private (Admin)
const getPendingEmployees = async (req, res) => {
  try {
    const businessId = req.user.currentBusiness?.businessId?._id;
    
    if (!businessId) {
      return res.status(400).json({
        success: false,
        message: "No business context found"
      });
    }

    const pendingEmployees = await Employee.find({ 
      businessId,
      status: "pending",
      isActive: true 
    })
    .populate('userId', 'email role')
    .sort({ hireDate: -1 });

    res.json({
      success: true,
      data: pendingEmployees
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching pending employees",
      error: error.message
    });
  }
};

// @desc   Approve employee
// @route  PUT /api/employees/:id/approve
// @access Private (Admin)
const approveEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const businessId = req.user.currentBusiness?.businessId?._id;
    const adminId = req.user.id;
    
    if (!businessId) {
      return res.status(400).json({
        success: false,
        message: "No business context found"
      });
    }

    const employee = await Employee.findOneAndUpdate(
      { _id: id, businessId, status: "pending" },
      { 
        status: "approved",
        approvedBy: adminId,
        approvedAt: new Date()
      },
      { new: true, runValidators: true }
    )
    .populate('userId', 'email role')
    .populate('approvedBy', 'email');

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Pending employee not found"
      });
    }

    res.json({
      success: true,
      message: "Employee approved successfully",
      data: employee
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error approving employee",
      error: error.message
    });
  }
};

// @desc   Reject employee
// @route  PUT /api/employees/:id/reject
// @access Private (Admin)
const rejectEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;
    const businessId = req.user.currentBusiness?.businessId?._id;
    const adminId = req.user.id;
    
    if (!businessId) {
      return res.status(400).json({
        success: false,
        message: "No business context found"
      });
    }

    const employee = await Employee.findOneAndUpdate(
      { _id: id, businessId, status: "pending" },
      { 
        status: "rejected",
        approvedBy: adminId,
        approvedAt: new Date(),
        rejectionReason: rejectionReason || "No reason provided"
      },
      { new: true, runValidators: true }
    )
    .populate('userId', 'email role')
    .populate('approvedBy', 'email');

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Pending employee not found"
      });
    }

    res.json({
      success: true,
      message: "Employee rejected successfully",
      data: employee
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error rejecting employee",
      error: error.message
    });
  }
};

module.exports = {
  getEmployees,
  getEmployeeById,
  updateEmployee,
  deactivateEmployee,
  getEmployeeProfile,
  updateEmployeeProfile,
  getPendingEmployees,
  approveEmployee,
  rejectEmployee
};
