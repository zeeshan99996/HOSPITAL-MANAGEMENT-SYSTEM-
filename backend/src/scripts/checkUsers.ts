import sequelize from '../config/db';
import { User } from '../models';
import bcrypt from 'bcryptjs';

async function checkUsers() {
  try {
    await sequelize.authenticate();
    console.log('[DB Script] Connected to Supabase DB.');

    // Migration: Add missing user columns to PostgreSQL
    const userCols = [
      { name: 'deletedAt', type: 'TIMESTAMP WITH TIME ZONE' },
      { name: 'cnic', type: 'VARCHAR(255)' },
      { name: 'address', type: 'TEXT' },
      { name: 'designation', type: 'VARCHAR(255)' },
      { name: 'salary', type: 'DECIMAL(10, 2) DEFAULT 0.00' },
      { name: 'phone', type: 'VARCHAR(255)' },
      { name: 'status', type: 'VARCHAR(255) DEFAULT \'active\'' },
      { name: 'isStaffMember', type: 'BOOLEAN DEFAULT FALSE' },
    ];

    for (const col of userCols) {
      try {
        await sequelize.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "${col.name}" ${col.type};`);
        console.log(`[DB Migration] Added column '${col.name}' to 'users' table.`);
      } catch (e: any) {
        console.warn(`[DB Migration Warning] Column ${col.name}:`, e.message);
      }
    }

    // Set isStaffMember = true for existing staff roles
    await sequelize.query(`UPDATE "users" SET "isStaffMember" = TRUE WHERE "role" IN ('admin', 'doctor', 'nurse', 'receptionist', 'lab_technician', 'pharmacist', 'accountant');`);
    console.log('[DB Migration] Updated existing employee records to isStaffMember = TRUE.');

    const users = await User.findAll({ raw: true });
    console.log('[DB Script] Found users count:', users.length);
    for (const u of users) {
      console.log(`ID: ${u.id} | Email: ${u.email} | Role: ${u.role} | isStaffMember: ${u.isStaffMember} | PassHash: ${String(u.password).substring(0, 20)}...`);
    }

    // Ensure admin@lifeflow.com user exists and has valid hashed password & isStaffMember = true
    let adminUser = await User.findOne({ where: { email: 'admin@lifeflow.com' } });
    if (!adminUser) {
      const hashed = await bcrypt.hash('Password123', 10);
      adminUser = await User.create({
        name: 'System Admin',
        email: 'admin@lifeflow.com',
        password: hashed,
        role: 'admin',
        phone: '0300-1234567',
        isStaffMember: true,
        status: 'active'
      });
      console.log('✅ Created default System Admin account.');
    } else {
      const hashed = await bcrypt.hash('Password123', 10);
      await adminAccUpdate(adminUser, hashed);
      console.log('✅ Reset admin@lifeflow.com password hash to Password123.');
    }

    process.exit(0);
  } catch (err: any) {
    console.error('[DB Script Error]:', err);
    process.exit(1);
  }
}

async function adminAccUpdate(user: any, hash: string) {
  await user.update({ password: hash, isStaffMember: true, status: 'active' });
}

checkUsers();
