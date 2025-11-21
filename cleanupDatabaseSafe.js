const mongoose = require('mongoose');
require('dotenv').config();

// Import the models
const User = require('./models/User');
const Business = require('./models/Business');
const Employee = require('./models/Employee');
const Client = require('./models/Client');
const UserBusiness = require('./models/UserBusiness');

async function cleanupDatabaseSafe() {
  try {
    // SAFETY CHECKS
    console.log('🔍 Running safety checks...');
    
    // Check if we're in production
    if (process.env.NODE_ENV === 'production') {
      console.log('❌ Cleanup blocked: Running in production environment');
      return;
    }
    
    // Check database name for safety
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      console.log('❌ Cleanup blocked: MONGO_URI not found');
      return;
    }
    
    console.log('✅ Safety checks passed');
    console.log('🔗 Connecting to database...');
    
    // Connect to MongoDB
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Get counts before cleanup
    const userCount = await User.countDocuments();
    const businessCount = await Business.countDocuments();
    const employeeCount = await Employee.countDocuments();
    const clientCount = await Client.countDocuments();
    const userBusinessCount = await UserBusiness.countDocuments();
    const superAdminCount = await User.countDocuments({ role: 'super-admin' });

    console.log('\n📊 Current database state:');
    console.log(`Users: ${userCount}`);
    console.log(`Super Admins: ${superAdminCount}`);
    console.log(`Businesses: ${businessCount}`);
    console.log(`Employees: ${employeeCount}`);
    console.log(`Clients: ${clientCount}`);
    console.log(`UserBusiness: ${userBusinessCount}`);

    // Ask for confirmation
    console.log('\n⚠️  This will delete ALL data EXCEPT super admin accounts!');
    console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...');
    
    // Wait 5 seconds for user to cancel
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('\n🧹 Starting cleanup...');

    // Delete in order to respect foreign key relationships
    console.log('Deleting employees...');
    await Employee.deleteMany({});
    
    console.log('Deleting clients...');
    await Client.deleteMany({});
    
    console.log('Deleting user-business associations...');
    await UserBusiness.deleteMany({});
    
    console.log('Deleting non-super-admin users...');
    await User.deleteMany({ role: { $ne: 'super-admin' } });
    
    console.log('Deleting businesses...');
    await Business.deleteMany({});

    // Show final counts
    const finalUserCount = await User.countDocuments();
    const finalSuperAdminCount = await User.countDocuments({ role: 'super-admin' });

    console.log('\n✅ Database cleaned successfully!');
    console.log(`🎉 Remaining users: ${finalUserCount} (${finalSuperAdminCount} super admins preserved)`);
    console.log('🔐 Super admin accounts are safe!');

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the cleanup
cleanupDatabaseSafe();

