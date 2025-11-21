// Migration script to set isPrimary and relationship for existing clients
// Run this once after adding the new fields to the Client model

const mongoose = require("mongoose");
const Client = require("../models/Client");
require("dotenv").config();

async function migrateClients() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/planora", {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("Connected to MongoDB");

    // Find all clients that don't have isPrimary set
    const clientsToUpdate = await Client.find({
      $or: [
        { isPrimary: { $exists: false } },
        { isPrimary: null }
      ]
    });

    console.log(`Found ${clientsToUpdate.length} clients to update`);

    // Update all existing clients to be primary
    const result = await Client.updateMany(
      {
        $or: [
          { isPrimary: { $exists: false } },
          { isPrimary: null }
        ]
      },
      {
        $set: {
          isPrimary: true,
          relationship: "self"
        }
      }
    );

    console.log(`Updated ${result.modifiedCount} clients`);
    console.log("Migration completed successfully!");

    // Verify the update
    const primaryClients = await Client.countDocuments({ isPrimary: true });
    const nonPrimaryClients = await Client.countDocuments({ isPrimary: false });
    
    console.log(`\nVerification:`);
    console.log(`- Primary clients: ${primaryClients}`);
    console.log(`- Non-primary clients (members): ${nonPrimaryClients}`);

    process.exit(0);
  } catch (error) {
    console.error("Migration error:", error);
    process.exit(1);
  }
}

// Run migration
migrateClients();

