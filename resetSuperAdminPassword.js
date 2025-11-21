// resetSuperAdminPassword.js
// Script to reset password for super admin account
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const User = require("./models/User");

const resetSuperAdminPassword = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    const email = "planora.business@gmail.com";
    
    // You can set a custom password here, or it will use a default
    const newPassword = process.argv[2] || "PlanoraAdmin2024!";
    
    // Find the user
    let user = await User.findOne({ email });
    
    if (!user) {
      console.log("⚠️  User not found with email:", email);
      console.log("   Creating new super admin account...\n");
      
      // Create new super admin user
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      user = await User.create({
        email,
        password: hashedPassword,
        role: "super-admin",
        isActive: true
      });
      
      console.log("✅ Super admin account created successfully!");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("Email:", user.email);
      console.log("Role:", user.role);
      console.log("Password:", newPassword);
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("\n⚠️  Please save this password securely!");
      console.log("   You can now login with these credentials.\n");
      
      return process.exit(0);
    }

    // Verify it's a super admin
    if (user.role !== "super-admin") {
      console.log("⚠️  Warning: User found but role is:", user.role);
      console.log("   Email:", user.email);
      console.log("   Proceeding with password reset anyway...\n");
    }
    
    resetPassword(user, newPassword);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
};

const resetPassword = async (user, newPassword) => {
  try {
    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password
    user.password = hashedPassword;
    await user.save();

    console.log("\n✅ Password reset successful!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Email:", user.email);
    console.log("Role:", user.role);
    console.log("New Password:", newPassword);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("\n⚠️  Please save this password securely!");
    console.log("   You can now login with these credentials.\n");

    process.exit(0);
  } catch (err) {
    console.error("Error resetting password:", err);
    process.exit(1);
  }
};

resetSuperAdminPassword();

