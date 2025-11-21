const express = require("express");
const router = express.Router();
const { registerUser, loginUser, switchBusiness, getUserBusinesses, verifyUser, changePassword, validateInvitation } = require("../controllers/authController");
const { 
  registerWithBusinessCode, 
  registerWithInvitation, 
  requestBusinessAccess 
} = require("../controllers/registrationController");
const auth = require("../middleware/auth");

// Public routes
router.post("/register", registerUser);
router.post("/login", loginUser);

// New registration routes
router.post("/register-with-code", registerWithBusinessCode);
router.post("/register-with-invitation", registerWithInvitation);
router.post("/request-business-access", requestBusinessAccess);
router.get("/validate-invitation", validateInvitation);

// Protected routes
router.get("/verify", auth(), verifyUser);
router.post("/switch-business", auth(), switchBusiness);
router.get("/businesses", auth(), getUserBusinesses);
router.put("/change-password", auth(), changePassword);

module.exports = router;
