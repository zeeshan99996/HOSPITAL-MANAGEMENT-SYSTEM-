import sequelize from '../config/db';
import { SystemUser, User, Doctor, StaffMember } from '../models';
import bcrypt from 'bcryptjs';

async function testAuth() {
  console.log('--- TESTING DB & SYSTEM USERS ---');
  try {
    await sequelize.authenticate();
    console.log('✅ DB Connected');

    console.log('\n--- SYSTEM USERS ---');
    const systemUsers = await SystemUser.findAll();
    console.log(`Found ${systemUsers.length} system users:`);
    systemUsers.forEach((u: any) => {
      console.log(`- ID: ${u.id}, Email: ${u.email}, Role: ${u.role}, Status: ${u.status}, HasPassword: ${!!u.password}`);
    });

    console.log('\n--- USERS ---');
    const users = await User.findAll();
    console.log(`Found ${users.length} users:`);
    users.forEach((u: any) => {
      console.log(`- ID: ${u.id}, Email: ${u.email}, Role: ${u.role}, Status: ${u.status}, HasPassword: ${!!u.password}`);
    });

    // Test password verification for first user
    if (systemUsers.length > 0) {
      const u = systemUsers[0];
      console.log(`\n--- TESTING PASSWORD FOR ${u.email} ---`);
      console.log('Stored Password Hash/Value:', u.password);
      // Let's test standard passwords
      const testPasswords = ['Admin@123', 'admin123', 'password', '123456', 'Doctor@123', '12345678'];
      for (const pwd of testPasswords) {
        let isMatch = false;
        if (u.password.startsWith('$2a$') || u.password.startsWith('$2b$') || u.password.startsWith('$2y$')) {
          isMatch = await bcrypt.compare(pwd, u.password);
        } else if (u.password === pwd) {
          isMatch = true;
        }
        if (isMatch) {
          console.log(`✅ MATCH FOUND for password: "${pwd}"`);
        }
      }
    }

    process.exit(0);
  } catch (err: any) {
    console.error('❌ Auth Test Error:', err);
    process.exit(1);
  }
}

testAuth();
