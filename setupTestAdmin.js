// setupTestAdmin.js
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const User = require("./models/User");
const Business = require("./models/Business");

const setupTestAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    // Create test business
    const businessData = {
      name: "Test Swim School",
      email: "test@swimschool.com",
      phone: "555-123-4567",
      address: {
        street: "123 Test St",
        city: "Test City",
        state: "CA",
        zipCode: "12345",
        country: "USA"
      },
      businessType: "swim-school",
      description: "Test business for development",
      subscriptionTier: "basic",
      status: "pending"
    };

    let business = await Business.findOne({ email: businessData.email });
    if (!business) {
      business = await Business.create(businessData);
      console.log("Test business created:", business.name);
    } else {
      console.log("Test business already exists:", business.name);
    }

    // Create admin user
    const adminEmail = "admin@test.com";
    const adminPassword = "TestAdmin123";
    
    let admin = await User.findOne({ email: adminEmail });
    if (!admin) {
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      
      admin = new User({
        email: adminEmail,
        password: hashedPassword,
        role: "admin",
        businessId: business._id,
      });

      await admin.save();
      console.log("Test admin created:", adminEmail);
    } else {
      console.log("Test admin already exists:", adminEmail);
    }

    console.log("\n=== Test Credentials ===");
    console.log("Admin Email:", adminEmail);
    console.log("Admin Password:", adminPassword);
    console.log("Business ID:", business._id);
    console.log("\nYou can now login and test the /api/clients endpoint!");

    process.exit();
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
};

setupTestAdmin();
