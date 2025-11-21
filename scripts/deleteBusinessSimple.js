const mongoose = require("mongoose");
require("dotenv").config();

// Import models
const Business = require("../models/Business");
const User = require("../models/User");
const BusinessCode = require("../models/BusinessCode");
const BusinessInvitation = require("../models/BusinessInvitation");
const UserBusiness = require("../models/UserBusiness");
const Client = require("../models/Client");
const Employee = require("../models/Employee");
const Class = require("../models/Class");
const Schedule = require("../models/Schedule");
const Note = require("../models/Note");

async function deleteBusiness(businessId) {
  let connection = null;
  
  try {
    console.log(`🗑️ Starting deletion of business: ${businessId}`);
    
    // Connect to database
    console.log("🔗 Connecting to database...");
    connection = await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI || "mongodb://localhost:27017/planora", {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`✅ Connected to: ${connection.connection.host}`);

    // Verify business exists
    const business = await Business.findById(businessId);
    if (!business) {
      console.log("❌ Business not found");
      return;
    }

    console.log(`📋 Business: ${business.name} (${business.email})`);

    // Get preview first
    console.log("\n📊 Deletion Preview:");
    const schedulesCount = await Schedule.countDocuments({ businessId });
    const classesCount = await Class.countDocuments({ businessId });
    const clientsCount = await Client.countDocuments({ businessId });
    const employeesCount = await Employee.countDocuments({ businessId });
    const businessCodesCount = await BusinessCode.countDocuments({ businessId });
    const invitationsCount = await BusinessInvitation.countDocuments({ businessId });
    const userBusinessesCount = await UserBusiness.countDocuments({ businessId });
    const notesCount = await Note.countDocuments({ businessId });
    const associatedUsersCount = await User.countDocuments({ businessId });

    console.log(`- Schedules: ${schedulesCount}`);
    console.log(`- Classes: ${classesCount}`);
    console.log(`- Clients: ${clientsCount}`);
    console.log(`- Employees: ${employeesCount}`);
    console.log(`- Business Codes: ${businessCodesCount}`);
    console.log(`- Invitations: ${invitationsCount}`);
    console.log(`- User-Business Associations: ${userBusinessesCount}`);
    console.log(`- Notes: ${notesCount}`);
    console.log(`- Associated Users: ${associatedUsersCount}`);
    console.log(`- Total Records: ${schedulesCount + classesCount + clientsCount + employeesCount + businessCodesCount + invitationsCount + userBusinessesCount + notesCount + associatedUsersCount + 1}`);

    console.log("\n🧹 Starting deletion process...");

    // Delete in order
    console.log("Deleting schedules...");
    const deletedSchedules = await Schedule.deleteMany({ businessId });
    console.log(`✅ Deleted ${deletedSchedules.deletedCount} schedules`);

    console.log("Deleting classes...");
    const deletedClasses = await Class.deleteMany({ businessId });
    console.log(`✅ Deleted ${deletedClasses.deletedCount} classes`);

    console.log("Deleting clients...");
    const deletedClients = await Client.deleteMany({ businessId });
    console.log(`✅ Deleted ${deletedClients.deletedCount} clients`);

    console.log("Deleting employees...");
    const deletedEmployees = await Employee.deleteMany({ businessId });
    console.log(`✅ Deleted ${deletedEmployees.deletedCount} employees`);

    console.log("Deleting business codes...");
    const deletedBusinessCodes = await BusinessCode.deleteMany({ businessId });
    console.log(`✅ Deleted ${deletedBusinessCodes.deletedCount} business codes`);

    console.log("Deleting business invitations...");
    const deletedInvitations = await BusinessInvitation.deleteMany({ businessId });
    console.log(`✅ Deleted ${deletedInvitations.deletedCount} business invitations`);

    console.log("Deleting user-business associations...");
    const deletedUserBusinesses = await UserBusiness.deleteMany({ businessId });
    console.log(`✅ Deleted ${deletedUserBusinesses.deletedCount} user-business associations`);

    console.log("Deleting notes...");
    const deletedNotes = await Note.deleteMany({ businessId });
    console.log(`✅ Deleted ${deletedNotes.deletedCount} notes`);

    console.log("Deactivating users...");
    const updatedUsers = await User.updateMany(
      { businessId: businessId },
      { 
        isActive: false,
        businessId: null,
        currentBusinessId: null
      }
    );
    console.log(`✅ Deactivated ${updatedUsers.modifiedCount} users`);

    console.log("Deleting business...");
    const deletedBusiness = await Business.findByIdAndDelete(businessId);
    console.log(`✅ Deleted business: ${deletedBusiness.name}`);

    console.log("\n🎉 Business deletion completed successfully!");
    console.log("\n📊 Deletion Summary:");
    console.log(`- Schedules: ${deletedSchedules.deletedCount}`);
    console.log(`- Classes: ${deletedClasses.deletedCount}`);
    console.log(`- Clients: ${deletedClients.deletedCount}`);
    console.log(`- Employees: ${deletedEmployees.deletedCount}`);
    console.log(`- Business Codes: ${deletedBusinessCodes.deletedCount}`);
    console.log(`- Invitations: ${deletedInvitations.deletedCount}`);
    console.log(`- User-Business Associations: ${deletedUserBusinesses.deletedCount}`);
    console.log(`- Notes: ${deletedNotes.deletedCount}`);
    console.log(`- Deactivated Users: ${updatedUsers.modifiedCount}`);

  } catch (error) {
    console.error("❌ Error during deletion:", error.message);
    throw error;
  } finally {
    if (connection) {
      await mongoose.disconnect();
      console.log("🔌 Disconnected from MongoDB");
    }
  }
}

// Command line interface
if (require.main === module) {
  const businessId = process.argv[2];
  
  if (!businessId) {
    console.log("Usage: node deleteBusinessSimple.js <businessId>");
    console.log("Example: node deleteBusinessSimple.js 68e8d71998eaf1d51cddd34e");
    process.exit(1);
  }

  deleteBusiness(businessId)
    .then(() => {
      console.log("✅ Script completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Script failed:", error.message);
      process.exit(1);
    });
}

module.exports = { deleteBusiness };
