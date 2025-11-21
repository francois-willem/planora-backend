// createManualAdmin.js
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const User = require("./models/User");
const Business = require("./models/Business");

const createManualAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    // Find the business we just created
    const business = await Business.findOne({ email: "manual@testbusiness.com" });
    
    if (!business) {
      console.log("Business not found. Please create the business first using the super admin.");
      console.log("Expected business email: manual@testbusiness.com");
      return process.exit(1);
    }

    const email = "manualadmin@test.com";
    const password = "ManualAdmin123";
    const role = "admin";

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log("Manual admin user already exists:", existingUser.email);
      return process.exit();
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create admin user
    const admin = new User({
      email,
      password: hashedPassword,
      role,
      businessId: business._id,
    });

    await admin.save();
    console.log("Manual admin user created successfully!");
    console.log("Email:", email);
    console.log("Password:", password);
    console.log("Business:", business.name);
    console.log("Business ID:", business._id);

    process.exit();
  } catch (err) {
    console.error("Error creating manual admin:", err);
    process.exit(1);
  }
};

createManualAdmin();
