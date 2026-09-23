import sequelize from '../config/db';
import { SystemUser, User } from '../models';
import bcrypt from 'bcryptjs';

async function syncPasswords() {
  console.log('--- SYNCING ALL STAFF ACCOUNTS WITH DEFAULT PASSWORD: Password123 ---');
  try {
    await sequelize.authenticate();
    const hashedPassword = await bcrypt.hash('Password123', 10);

    const accounts = [
      { name: 'System Admin', email: 'admin@gmail.com', role: 'admin' },
      { name: 'Dr. Talha', email: 'drtalha@gmail.com', role: 'doctor' },
      { name: 'Front Desk Receptionist', email: 'receptionist@gmail.com', role: 'receptionist' },
      { name: 'Pharmacy Dispensary', email: 'pharmacist@gmail.com', role: 'pharmacist' },
      { name: 'Finance & Accountant', email: 'accountant@gmail.com', role: 'accountant' },
      { name: 'Clinical Nurse', email: 'nurse@gmail.com', role: 'nurse' },
    ];

    for (const acc of accounts) {
      let sysUser = await SystemUser.findOne({ where: { email: acc.email } });
      if (!sysUser) {
        sysUser = await SystemUser.create({
          name: acc.name,
          email: acc.email,
          password: hashedPassword,
          role: acc.role as any,
          phone: '0300-0000000',
          status: 'active',
        });
        console.log(`✅ Created SystemUser: ${acc.email}`);
      } else {
        await sysUser.update({
          name: acc.name,
          password: hashedPassword,
          role: acc.role as any,
          status: 'active',
        });
        console.log(`✅ Updated SystemUser: ${acc.email}`);
      }

      let user = await User.findOne({ where: { email: acc.email } });
      if (!user) {
        await User.create({
          name: acc.name,
          email: acc.email,
          password: hashedPassword,
          role: acc.role as any,
          phone: '0300-0000000',
          status: 'active',
        });
        console.log(`✅ Created User: ${acc.email}`);
      } else {
        await user.update({
          name: acc.name,
          password: hashedPassword,
          role: acc.role as any,
          status: 'active',
        });
        console.log(`✅ Updated User: ${acc.email}`);
      }
    }

    console.log('\n🎉 ALL STAFF ACCOUNTS SYNCED SUCCESSFULLY!');
    process.exit(0);
  } catch (err: any) {
    console.error('❌ Sync Error:', err);
    process.exit(1);
  }
}

syncPasswords();
