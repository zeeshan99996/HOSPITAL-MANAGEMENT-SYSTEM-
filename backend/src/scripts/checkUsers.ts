import sequelize from '../config/db';
import { User } from '../models';
import bcrypt from 'bcryptjs';

async function checkUsers() {
  try {
    await sequelize.authenticate();
    console.log('[DB Script] Database connection OK.');

    const users = await User.findAll({ raw: true });
    console.log('[DB Script] Found system users count:', users.length);
    for (const u of users) {
      console.log(`ID: ${u.id} | Email: ${u.email} | Role: ${u.role} | PassHash: ${String(u.password).substring(0, 20)}...`);
    }

    // Ensure admin@drtalhaclinic.com user exists and has valid hashed password
    let adminUser = await User.findOne({ where: { email: 'admin@drtalhaclinic.com' } });
    if (!adminUser) {
      const hashedPassword = await bcrypt.hash('Password123', 10);
      adminUser = await User.create({
        name: 'System Admin',
        email: 'admin@drtalhaclinic.com',
        password: hashedPassword,
        role: 'admin',
        phone: '0300-1234567',
        status: 'active'
      });
      console.log('✅ Created admin@drtalhaclinic.com account with Password123.');
    } else if (!adminUser.password || (!adminUser.password.startsWith('$2a$') && !adminUser.password.startsWith('$2b$') && !adminUser.password.startsWith('$2y$'))) {
      const hashedPassword = await bcrypt.hash('Password123', 10);
      await adminUser.update({ password: hashedPassword, status: 'active' });
      console.log('✅ Reset admin@drtalhaclinic.com password hash to Password123.');
    }

    process.exit(0);
  } catch (err: any) {
    console.error('[DB Script Error]:', err);
    process.exit(1);
  }
}

checkUsers();
