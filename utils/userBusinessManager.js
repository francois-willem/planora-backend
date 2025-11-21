const User = require("../models/User");
const UserBusiness = require("../models/UserBusiness");
const Business = require("../models/Business");

/**
 * Add a user to a business with a specific role
 * @param {string} userId - User ID
 * @param {string} businessId - Business ID
 * @param {string} role - Role (admin, instructor, client)
 * @param {boolean} isActive - Whether the association should be active (default: true for non-clients, false for clients)
 * @returns {Promise<Object>} Created UserBusiness association
 */
const addUserToBusiness = async (userId, businessId, role, isActive = null, session = null) => {
  try {
    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Check if business exists
    const business = await Business.findById(businessId);
    if (!business) {
      throw new Error("Business not found");
    }

    // Check if association already exists
    const existingAssociation = await UserBusiness.findOne({
      userId: userId,
      businessId: businessId
    });

    if (existingAssociation) {
      if (existingAssociation.isActive) {
        throw new Error("User is already associated with this business");
      } else {
        // Reactivate existing association
        existingAssociation.isActive = isActive !== null ? isActive : (role !== 'client');
        existingAssociation.role = role;
        await existingAssociation.save();
        return existingAssociation;
      }
    }

    // Determine if association should be active
    // Clients need approval, so they start as inactive
    // Admins and instructors are active by default
    const shouldBeActive = isActive !== null ? isActive : (role !== 'client');

    // Create new association
    const userBusiness = new UserBusiness({
      userId: userId,
      businessId: businessId,
      role: role,
      isActive: shouldBeActive
    });

    await userBusiness.save();
    return userBusiness;
  } catch (error) {
    throw error;
  }
};

/**
 * Remove a user from a business (deactivate association)
 * @param {string} userId - User ID
 * @param {string} businessId - Business ID
 * @returns {Promise<Object>} Updated UserBusiness association
 */
const removeUserFromBusiness = async (userId, businessId) => {
  try {
    const userBusiness = await UserBusiness.findOne({
      userId: userId,
      businessId: businessId,
      isActive: true
    });

    if (!userBusiness) {
      throw new Error("User is not associated with this business");
    }

    userBusiness.isActive = false;
    await userBusiness.save();

    // If this was the user's current business, clear it
    const user = await User.findById(userId);
    if (user.currentBusinessId && user.currentBusinessId.toString() === businessId) {
      user.currentBusinessId = undefined;
      await user.save();
    }

    return userBusiness;
  } catch (error) {
    throw error;
  }
};

/**
 * Get all businesses a user is associated with
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of UserBusiness associations
 */
const getUserBusinesses = async (userId) => {
  try {
    return await UserBusiness.find({
      userId: userId,
      isActive: true
    }).populate('businessId', 'name email businessType');
  } catch (error) {
    throw error;
  }
};

/**
 * Get all users associated with a business
 * @param {string} businessId - Business ID
 * @returns {Promise<Array>} Array of UserBusiness associations
 */
const getBusinessUsers = async (businessId) => {
  try {
    return await UserBusiness.find({
      businessId: businessId,
      isActive: true
    }).populate('userId', 'email role');
  } catch (error) {
    throw error;
  }
};

/**
 * Update user's role in a business
 * @param {string} userId - User ID
 * @param {string} businessId - Business ID
 * @param {string} newRole - New role
 * @returns {Promise<Object>} Updated UserBusiness association
 */
const updateUserRoleInBusiness = async (userId, businessId, newRole) => {
  try {
    const userBusiness = await UserBusiness.findOne({
      userId: userId,
      businessId: businessId,
      isActive: true
    });

    if (!userBusiness) {
      throw new Error("User is not associated with this business");
    }

    userBusiness.role = newRole;
    await userBusiness.save();

    return userBusiness;
  } catch (error) {
    throw error;
  }
};

/**
 * Switch user's current business context
 * @param {string} userId - User ID
 * @param {string} businessId - Business ID
 * @returns {Promise<Object>} Updated user and business association
 */
const switchUserBusiness = async (userId, businessId) => {
  try {
    // Check if user has access to this business
    const userBusiness = await UserBusiness.findOne({
      userId: userId,
      businessId: businessId,
      isActive: true
    });

    if (!userBusiness) {
      throw new Error("User does not have access to this business");
    }

    // Update user's current business
    const user = await User.findById(userId);
    user.currentBusinessId = businessId;
    await user.save();

    return {
      user: user,
      businessAssociation: userBusiness
    };
  } catch (error) {
    throw error;
  }
};

module.exports = {
  addUserToBusiness,
  removeUserFromBusiness,
  getUserBusinesses,
  getBusinessUsers,
  updateUserRoleInBusiness,
  switchUserBusiness
};
