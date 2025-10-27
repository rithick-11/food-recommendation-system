// Simple script to create an admin account
// Run this with: node create-admin.js

const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function createAdmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Create admin user (you can create multiple admins)
    const adminEmail = 'newadmin@foodrec.com'; // Change this email
    
    // Check if this specific admin already exists
    const existingAdmin = await User.findOne({ email: adminEmail });
    if (existingAdmin) {
      console.log('Admin account with this email already exists:', existingAdmin.email);
      process.exit(0);
    }

    const adminUser = new User({
      name: 'New Administrator', // Change this name
      email: adminEmail,
      password: 'admin123456', // Change this to a secure password
      role: 'admin'
    });

    await adminUser.save();
    console.log('✅ Admin account created successfully!');
    console.log('Email:', adminUser.email);
    console.log('Password: admin123456');
    console.log('Role:', adminUser.role);
    console.log('Approval Status:', adminUser.approvalStatus);

  } catch (error) {
    console.error('❌ Error creating admin account:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

createAdmin();