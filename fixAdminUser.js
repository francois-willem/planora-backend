// fixAdminUser.js
const mongoose = require("mongoose");
require("dotenv").config();

const User = require("./models/User");
const Business = require("./models/Business");

const fixAdminUser = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    // Get your admin user email from the command line argument
    const adminEmail = process.argv[2];
    
    if (!adminEmail) {
      console.log("Usage: node fixAdminUser.js <admin-email>");
      console.log("Example: node fixAdminUser.js admin@example.com");
      return process.exit(1);
    }

    // Find your admin user
    const adminUser = await User.findOne({ email: adminEmail });
    
    if (!adminUser) {
      console.log("Admin user not found:", adminEmail);
      return process.exit(1);
    }

    console.log("Found admin user:", adminUser.email, "Role:", adminUser.role);

    // Check if they already have a businessId
    if (adminUser.businessId) {
      console.log("Admin user already has a businessId:", adminUser.businessId);
      return process.exit();
    }

    // Find the test business we created earlier
    const business = await Business.findOne({ email: "test@swimschool.com" });
    
    if (!business) {
      console.log("Test business not found. Creating one...");
      
      // Create a business for this admin
      const newBusiness = await Business.create({
        name: `${adminEmail.split('@')[0]}'s Business`,
        email: `business-${adminEmail}`,
        phone: "555-123-4567",
        address: {
          street: "123 Business St",
          city: "Business City",
          state: "CA",
          zipCode: "12345",
          country: "USA"
        },
        businessType: "swim-school",
        description: "Business for admin user",
        subscriptionTier: "basic",
        status: "pending"
      });
      
      console.log("Created business:", newBusiness.name);
      
      // Update admin user with businessId
      adminUser.businessId = newBusiness._id;
      await adminUser.save();
      
      console.log("Updated admin user with businessId:", newBusiness._id);
    } else {
      // Update admin user with existing business
      adminUser.businessId = business._id;
      await adminUser.save();
      
      console.log("Updated admin user with existing business:", business.name);
    }

    console.log("\n✅ Admin user is now ready to use!");
    console.log("You can now login and test the /api/clients endpoint.");

    process.exit();
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
};

fixAdminUser();
