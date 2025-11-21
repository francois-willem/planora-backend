const mongoose = require("mongoose");
require("dotenv").config();
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

// Database connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI || "mongodb://localhost:27017/planora", {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error("Database connection error:", error);
    process.exit(1);
  }
};

/**
 * Permanently delete a business and all related data
 * @param {string} businessId - The ID of the business to delete
 * @param {boolean} confirm - Confirmation flag to prevent accidental deletion
 */
async function permanentlyDeleteBusiness(businessId, confirm = false) {
  if (!confirm) {
    console.log("❌ This function requires explicit confirmation to prevent accidental deletion");
    console.log("Usage: permanentlyDeleteBusiness(businessId, true)");
    return;
  }

  try {
    await connectDB();
    
    // Ensure connection is stable
    if (mongoose.connection.readyState !== 1) {
      console.log("🔄 Reconnecting to database...");
      await connectDB();
    }

    // Verify business exists
    const business = await Business.findById(businessId);
    if (!business) {
      console.log("❌ Business not found");
      return;
    }

    console.log(`🗑️ Starting permanent deletion of business: ${business.name} (${businessId})`);
    console.log("⚠️  WARNING: This action cannot be undone!");

    // Get deletion preview first
    const deletionPreview = await getBusinessDeletionPreview(businessId);
    console.log("\n📊 Deletion Preview:");
    console.log(`- Schedules: ${deletionPreview.schedules}`);
    console.log(`- Classes: ${deletionPreview.classes}`);
    console.log(`- Clients: ${deletionPreview.clients}`);
    console.log(`- Employees: ${deletionPreview.employees}`);
    console.log(`- Business Codes: ${deletionPreview.businessCodes}`);
    console.log(`- Invitations: ${deletionPreview.invitations}`);
    console.log(`- User-Business Associations: ${deletionPreview.userBusinesses}`);
    console.log(`- Notes: ${deletionPreview.notes}`);
    console.log(`- Associated Users: ${deletionPreview.associatedUsers}`);
    console.log(`- Total Records: ${deletionPreview.totalRecords}`);

    // Delete in order to respect foreign key relationships
    console.log("\n🧹 Starting deletion process...");

    // 1. Delete all schedules and their enrollments
    console.log("Deleting schedules...");
    const deletedSchedules = await Schedule.deleteMany({ businessId });
    console.log(`✅ Deleted ${deletedSchedules.deletedCount} schedules`);

    // 2. Delete all classes
    console.log("Deleting classes...");
    const deletedClasses = await Class.deleteMany({ businessId });
    console.log(`✅ Deleted ${deletedClasses.deletedCount} classes`);

    // 3. Delete all clients
    console.log("Deleting clients...");
    const deletedClients = await Client.deleteMany({ businessId });
    console.log(`✅ Deleted ${deletedClients.deletedCount} clients`);

    // 4. Delete all employees/instructors
    console.log("Deleting employees...");
    const deletedEmployees = await Employee.deleteMany({ businessId });
    console.log(`✅ Deleted ${deletedEmployees.deletedCount} employees`);

    // 5. Delete all business codes
    console.log("Deleting business codes...");
    const deletedBusinessCodes = await BusinessCode.deleteMany({ businessId });
    console.log(`✅ Deleted ${deletedBusinessCodes.deletedCount} business codes`);

    // 6. Delete all business invitations
    console.log("Deleting business invitations...");
    const deletedInvitations = await BusinessInvitation.deleteMany({ businessId });
    console.log(`✅ Deleted ${deletedInvitations.deletedCount} business invitations`);

    // 7. Delete all user-business associations
    console.log("Deleting user-business associations...");
    const deletedUserBusinesses = await UserBusiness.deleteMany({ businessId });
    console.log(`✅ Deleted ${deletedUserBusinesses.deletedCount} user-business associations`);

    // 8. Delete all notes related to this business
    console.log("Deleting notes...");
    const deletedNotes = await Note.deleteMany({ businessId });
    console.log(`✅ Deleted ${deletedNotes.deletedCount} notes`);

    // 9. Deactivate all users associated with this business (but don't delete them as they might have other business associations)
    console.log("Deactivating users associated with this business...");
    const updatedUsers = await User.updateMany(
      { businessId: businessId },
      { 
        isActive: false,
        businessId: null,
        currentBusinessId: null
      }
    );
    console.log(`✅ Deactivated ${updatedUsers.modifiedCount} users`);

    // 10. Finally, delete the business itself
    console.log("Deleting business...");
    await Business.findByIdAndDelete(businessId);
    console.log(`✅ Deleted business: ${business.name}`);

    console.log("\n🎉 Business permanently deleted successfully!");
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
    console.error("❌ Error during permanent deletion:", error);
    throw error; // Re-throw to be caught by command line handler
  } finally {
    // Only disconnect if we're not in the command line interface
    if (require.main !== module) {
      await mongoose.disconnect();
      console.log("🔌 Disconnected from MongoDB");
    }
  }
}

/**
 * Get a preview of what will be deleted for a business
 * @param {string} businessId - The ID of the business
 */
async function getBusinessDeletionPreview(businessId) {
  try {
    await connectDB();

    const business = await Business.findById(businessId);
    if (!business) {
      console.log("❌ Business not found");
      return null;
    }

    // Count all related data
    const [
      schedulesCount,
      classesCount,
      clientsCount,
      employeesCount,
      businessCodesCount,
      invitationsCount,
      userBusinessesCount,
      notesCount,
      associatedUsersCount
    ] = await Promise.all([
      Schedule.countDocuments({ businessId }),
      Class.countDocuments({ businessId }),
      Client.countDocuments({ businessId }),
      Employee.countDocuments({ businessId }),
      BusinessCode.countDocuments({ businessId }),
      BusinessInvitation.countDocuments({ businessId }),
      UserBusiness.countDocuments({ businessId }),
      Note.countDocuments({ businessId }),
      User.countDocuments({ businessId })
    ]);

    return {
      business: {
        id: business._id,
        name: business.name,
        email: business.email,
        businessType: business.businessType,
        status: business.status,
        isActive: business.isActive,
        createdAt: business.createdAt
      },
      schedules: schedulesCount,
      classes: classesCount,
      clients: clientsCount,
      employees: employeesCount,
      businessCodes: businessCodesCount,
      invitations: invitationsCount,
      userBusinesses: userBusinessesCount,
      notes: notesCount,
      associatedUsers: associatedUsersCount,
      totalRecords: schedulesCount + classesCount + clientsCount + employeesCount + 
                   businessCodesCount + invitationsCount + userBusinessesCount + 
                   notesCount + associatedUsersCount + 1 // +1 for the business itself
    };

  } catch (error) {
    console.error("❌ Error getting deletion preview:", error);
    return null;
  } finally {
    await mongoose.disconnect();
  }
}

/**
 * List all businesses with their deletion preview
 */
async function listBusinessesWithDeletionInfo() {
  try {
    await connectDB();

    const businesses = await Business.find({}).sort({ createdAt: -1 });
    
    console.log("📋 Businesses in the system:");
    console.log("=" * 80);
    
    for (const business of businesses) {
      const preview = await getBusinessDeletionPreview(business._id);
      console.log(`\n🏢 ${business.name} (${business._id})`);
      console.log(`   Email: ${business.email}`);
      console.log(`   Type: ${business.businessType}`);
      console.log(`   Status: ${business.status}`);
      console.log(`   Active: ${business.isActive}`);
      console.log(`   Created: ${business.createdAt}`);
      console.log(`   Records to delete: ${preview.totalRecords}`);
    }

  } catch (error) {
    console.error("❌ Error listing businesses:", error);
  } finally {
    await mongoose.disconnect();
  }
}

// Command line interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  const businessId = args[1];

  switch (command) {
    case 'preview':
      if (!businessId) {
        console.log("Usage: node permanentDeleteBusiness.js preview <businessId>");
        process.exit(1);
      }
      getBusinessDeletionPreview(businessId).then(preview => {
        if (preview) {
          console.log("\n📊 Deletion Preview for", preview.business.name);
          console.log("=" * 50);
          console.log(`Business: ${preview.business.name}`);
          console.log(`Email: ${preview.business.email}`);
          console.log(`Type: ${preview.business.businessType}`);
          console.log(`Status: ${preview.business.status}`);
          console.log(`Active: ${preview.business.isActive}`);
          console.log(`Created: ${preview.business.createdAt}`);
          console.log("\nRecords to be deleted:");
          console.log(`- Schedules: ${preview.schedules}`);
          console.log(`- Classes: ${preview.classes}`);
          console.log(`- Clients: ${preview.clients}`);
          console.log(`- Employees: ${preview.employees}`);
          console.log(`- Business Codes: ${preview.businessCodes}`);
          console.log(`- Invitations: ${preview.invitations}`);
          console.log(`- User-Business Associations: ${preview.userBusinesses}`);
          console.log(`- Notes: ${preview.notes}`);
          console.log(`- Associated Users: ${preview.associatedUsers}`);
          console.log(`\nTotal Records: ${preview.totalRecords}`);
        }
      });
      break;

    case 'delete':
      if (!businessId) {
        console.log("Usage: node permanentDeleteBusiness.js delete <businessId>");
        process.exit(1);
      }
      permanentlyDeleteBusiness(businessId, true)
        .then(() => {
          console.log("✅ Deletion completed successfully");
          process.exit(0);
        })
        .catch((error) => {
          console.error("❌ Deletion failed:", error.message);
          process.exit(1);
        })
        .finally(async () => {
          await mongoose.disconnect();
          console.log("🔌 Disconnected from MongoDB");
        });
      break;

    case 'list':
      listBusinessesWithDeletionInfo();
      break;

    default:
      console.log("Planora Business Permanent Deletion Tool");
      console.log("=" * 40);
      console.log("Usage:");
      console.log("  node permanentDeleteBusiness.js preview <businessId>  - Preview what will be deleted");
      console.log("  node permanentDeleteBusiness.js delete <businessId>   - Permanently delete business");
      console.log("  node permanentDeleteBusiness.js list                   - List all businesses");
      console.log("\n⚠️  WARNING: Permanent deletion cannot be undone!");
      break;
  }
}

module.exports = {
  permanentlyDeleteBusiness,
  getBusinessDeletionPreview,
  listBusinessesWithDeletionInfo
};
