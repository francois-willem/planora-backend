// listSuperAdmins.js
// Script to list all super admin users in the database
const mongoose = require("mongoose");
require("dotenv").config();

const User = require("./models/User");

const listSuperAdmins = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB\n");

    // Find all super admin users
    const superAdmins = await User.find({ role: "super-admin" });
    
    if (superAdmins.length === 0) {
      console.log("❌ No super admin users found in the database.");
      console.log("\n💡 You may need to create a super admin account first.");
      console.log("   Run: node seedSuperAdmin.js");
    } else {
      console.log(`✅ Found ${superAdmins.length} super admin user(s):\n`);
      superAdmins.forEach((admin, index) => {
        console.log(`${index + 1}. Email: ${admin.email}`);
        console.log(`   ID: ${admin._id}`);
        console.log(`   Created: ${admin.createdAt}`);
        console.log(`   Active: ${admin.isActive}`);
        console.log("");
      });
    }

    // Also check for any user with similar email
    const similarUser = await User.findOne({ 
      email: { $regex: /planora/i } 
    });
    
    if (similarUser) {
      console.log("🔍 Found user with 'planora' in email:");
      console.log(`   Email: ${similarUser.email}`);
      console.log(`   Role: ${similarUser.role}`);
      console.log(`   ID: ${similarUser._id}\n`);
    }

    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
};

listSuperAdmins();

