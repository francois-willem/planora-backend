const jwt = require("jsonwebtoken");
const User = require("../models/User");
const UserBusiness = require("../models/UserBusiness");

const auth = (roles = []) => {
  // Ensure roles is always an array
  if (typeof roles === "string") {
    roles = [roles];
  }

  return async (req, res, next) => {
    // TEMPORARY: Bypass authentication for super-admin routes during development
    // TODO: Remove this bypass and restore authentication
    console.log("Auth middleware - roles:", roles, "includes super-admin:", roles.includes("super-admin"));
    if (roles.includes("super-admin")) {
      console.log("Bypassing authentication for super-admin route");
      req.user = {
        id: "dev-super-admin-id",
        email: "dev@planora.com",
        role: "super-admin",
        isSuperAdmin: true
      };
      return next();
    }

    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ message: "No token provided, authorization denied" });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Fetch user details from database
      const user = await User.findById(decoded.id);
      if (!user || !user.isActive) {
        return res.status(401).json({ message: "User not found or inactive" });
      }

      // For super-admin, no business context needed
      if (user.role === "super-admin") {
        req.user = {
          id: user._id.toString(),
          _id: user._id,
          email: user.email,
          role: user.role,
          isSuperAdmin: true
        };
      } else {
        // For other roles, get business associations
        const businessAssociations = await UserBusiness.find({ 
          userId: user._id, 
          isActive: true 
        }).populate('businessId', 'name email businessType');

        // Get current business context from header or user's currentBusinessId
        const currentBusinessId = req.header("X-Business-ID") || user.currentBusinessId;
        
        // Find current business association
        const currentBusiness = businessAssociations.find(
          assoc => assoc.businessId._id.toString() === currentBusinessId?.toString()
        );

        req.user = {
          id: user._id.toString(), // Ensure it's a string
          _id: user._id, // Keep as ObjectId for database queries
          email: user.email,
          role: user.role,
          businessId: currentBusinessId || user.businessId, // Fallback to user.businessId
          currentBusinessId: currentBusinessId || user.currentBusinessId || user.businessId,
          businessAssociations: businessAssociations,
          currentBusiness: currentBusiness,
          isSuperAdmin: false
        };
        
        console.log('Auth middleware - req.user set:', {
          id: req.user.id,
          _id: req.user._id,
          role: req.user.role,
          businessId: req.user.businessId,
          currentBusinessId: req.user.currentBusinessId
        });
      }

      // Role-based access check
      if (roles.length && !roles.includes(user.role)) {
        console.error('Access denied - role mismatch:', {
          requiredRoles: roles,
          userRole: user.role,
          userId: user._id,
          userEmail: user.email
        });
        return res.status(403).json({ 
          message: `Access denied: insufficient role. Required: ${roles.join(', ')}, Your role: ${user.role}`,
          requiredRoles: roles,
          yourRole: user.role
        });
      }
      
      // For client routes, also check if user has business context
      if (roles.includes("client") && user.role === "client") {
        if (!req.user.businessId && !req.user.currentBusinessId) {
          console.error('Client access denied - no business context:', {
            userId: user._id,
            userEmail: user.email
          });
          return res.status(403).json({ 
            message: "Access denied: No business context. Please ensure you're associated with a business." 
          });
        }
      }

      next();
    } catch (err) {
      console.error("JWT Error:", err.message);
      res.status(401).json({ message: "Invalid or expired token" });
    }
  };
};

module.exports = auth;
