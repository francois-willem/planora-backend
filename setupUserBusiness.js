// setupUserBusiness.js
const mongoose = require("mongoose");
require("dotenv").config();

const User = require("./models/User");
const Business = require("./models/Business");
const UserBusiness = require("./models/UserBusiness");

const setupUserBusiness = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    // Find the test admin user
    const adminUser = await User.findOne({ email: "admin@test.com" });
    
    if (!adminUser) {
      console.log("Test admin user not found");
      return process.exit(1);
    }

    // Find the test business
    const business = await Business.findOne({ email: "test@swimschool.com" });
    
    if (!business) {
      console.log("Test business not found");
      return process.exit(1);
    }

    // Check if UserBusiness relationship already exists
    const existingRelation = await UserBusiness.findOne({
      userId: adminUser._id,
      businessId: business._id
    });

    if (existingRelation) {
      console.log("UserBusiness relationship already exists");
      console.log("Admin:", adminUser.email);
      console.log("Business:", business.name);
      console.log("Role:", existingRelation.role);
    } else {
      // Create UserBusiness relationship
      const userBusiness = new UserBusiness({
        userId: adminUser._id,
        businessId: business._id,
        role: "admin"
      });

      await userBusiness.save();
      console.log("✅ UserBusiness relationship created successfully!");
      console.log("Admin:", adminUser.email);
      console.log("Business:", business.name);
      console.log("Role: admin");
    }

    // Update user's currentBusinessId
    adminUser.currentBusinessId = business._id;
    await adminUser.save();
    console.log("✅ Updated user's currentBusinessId");

    process.exit();
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
};

setupUserBusiness();
