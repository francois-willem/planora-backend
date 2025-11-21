// seedSuperAdmin.js
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const User = require("./models/User");

const seedSuperAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const email = "superadmin@planora.com";
    const password = "SuperSecret123"; // you can change this
    const role = "super-admin";

    // check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log("Super admin already exists:", existingUser.email);
      return process.exit();
    }

    // hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // create user
    const superAdmin = new User({
      email,
      password: hashedPassword,
      role,
      businessId: null, // Super admin doesn't belong to any business
    });

    await superAdmin.save();
    console.log("Super admin created:", email);

    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

seedSuperAdmin();
