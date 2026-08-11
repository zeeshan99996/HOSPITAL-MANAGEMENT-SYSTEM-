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

    // Ensure admin@lifeflow.com user exists and has valid hashed password
    let adminUser = await User.findOne({ where: { email: 'admin@lifeflow.com' } });
    if (!adminUser) {
      const hashed = await bcrypt.hash('Password123', 10);
      adminUser = await User.create({
        name: 'System Admin',
        email: 'admin@lifeflow.com',
        password: hashed,
        role: 'admin',
        phone: '0300-1234567',
        status: 'active'
      });
      console.log('✅ Created default System Admin account.');
    } else {
      const hashed = await bcrypt.hash('Password123', 10);
      await adminUser.update({ password: hashed, status: 'active' });
      console.log('✅ Reset admin@lifeflow.com password hash to Password123.');
    }

    process.exit(0);
  } catch (err: any) {
    console.error('[DB Script Error]:', err);
    process.exit(1);
  }
}

checkUsers();
