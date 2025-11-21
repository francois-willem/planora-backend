const mongoose = require("mongoose");
const User = require("./models/User");
const UserBusiness = require("./models/UserBusiness");
require("dotenv").config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/planora", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const migrateToMultiBusiness = async () => {
  try {
    console.log("Starting migration to multi-business system...");

    // Find all users that have a businessId (non-super-admin users)
    const usersWithBusiness = await User.find({ 
      businessId: { $exists: true, $ne: null },
      role: { $ne: "super-admin" }
    });

    console.log(`Found ${usersWithBusiness.length} users to migrate`);

    for (const user of usersWithBusiness) {
      console.log(`Migrating user: ${user.email} (${user.role})`);

      // Check if UserBusiness association already exists
      const existingAssociation = await UserBusiness.findOne({
        userId: user._id,
        businessId: user.businessId
      });

      if (!existingAssociation) {
        // Create UserBusiness association
        const userBusiness = new UserBusiness({
          userId: user._id,
          businessId: user.businessId,
          role: user.role,
          isActive: user.isActive
        });

        await userBusiness.save();
        console.log(`  ✓ Created UserBusiness association for ${user.email}`);

        // Set currentBusinessId to the existing businessId
        user.currentBusinessId = user.businessId;
        await user.save();
        console.log(`  ✓ Set currentBusinessId for ${user.email}`);
      } else {
        console.log(`  - UserBusiness association already exists for ${user.email}`);
      }
    }

    // Find super-admin users and ensure they don't have businessId
    const superAdmins = await User.find({ role: "super-admin" });
    console.log(`Found ${superAdmins.length} super-admin users`);

    for (const superAdmin of superAdmins) {
      if (superAdmin.businessId) {
        superAdmin.businessId = undefined;
        superAdmin.currentBusinessId = undefined;
        await superAdmin.save();
        console.log(`  ✓ Removed businessId from super-admin: ${superAdmin.email}`);
      }
    }

    console.log("Migration completed successfully!");
    console.log("\nSummary:");
    console.log(`- Migrated ${usersWithBusiness.length} users to UserBusiness associations`);
    console.log(`- Updated ${superAdmins.length} super-admin users`);
    console.log("\nNext steps:");
    console.log("1. Test the new multi-business functionality");
    console.log("2. Update frontend to handle business selection");
    console.log("3. Consider removing the old businessId field from User model after testing");

  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    mongoose.connection.close();
  }
};

// Run migration
migrateToMultiBusiness();
