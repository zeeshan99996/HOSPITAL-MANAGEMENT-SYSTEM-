import sequelize from '../config/db';
import { User, Doctor, Department } from '../models';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

async function testLogin() {
  try {
    await sequelize.authenticate();
    console.log('[DB Test] Connection OK.');

    try {
      await sequelize.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "roleId" INTEGER;`);
      console.log('✅ Added "roleId" column to "users" table.');
    } catch (mErr) {}

    const normEmail = 'admin@gmail.com';
    const password = 'Password123';

    let user = await User.findOne({ where: { email: normEmail } });
    console.log('[DB Test] Found user:', user ? user.toJSON() : 'Not found');

    if (!user) {
      const hashedPassword = await bcrypt.hash(password, 10);
      user = await User.create({
        name: 'Admin User',
        email: normEmail,
        password: hashedPassword,
        role: 'admin',
        phone: '0300-1234567',
        status: 'active'
      });
      console.log('[DB Test] Created user:', user.toJSON());
    }

    let isMatch = false;
    if (user.password === password) {
      isMatch = true;
    }
    if (!isMatch && user.password) {
      if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$') || user.password.startsWith('$2y$')) {
        isMatch = await bcrypt.compare(password, user.password);
      }
    }

    console.log('[DB Test] Password match:', isMatch);

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, profileId: null },
      process.env.JWT_SECRET || 'drtalhaclinic_jwt_secret_token_key_for_hms_application_2026',
      { expiresIn: '1d' }
    );
    console.log('[DB Test] Generated Token successfully!');
  } catch (err: any) {
    console.error('❌ [TEST LOGIN ERROR STACK]:', err);
  } finally {
    process.exit(0);
  }
}

testLogin();
