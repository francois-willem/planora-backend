// createAdmin.js
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const User = require("./models/User");
const Business = require("./models/Business");

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    // First, get the business ID (you'll need to replace this with your actual business ID)
    const business = await Business.findOne({ email: "info@myswimschool.com" });
    
    if (!business) {
      console.log("Business not found. Please create a business first.");
      return process.exit(1);
    }

    const email = "admin@myswimschool.com";
    const password = "AdminPassword123";
    const role = "admin";

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log("Admin user already exists:", existingUser.email);
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
    console.log("Admin user created:", email);
    console.log("Business ID:", business._id);
    console.log("Password:", password);

    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

createAdmin();
