import sequelize from '../config/db';
import { User, SystemUser } from '../models';
import bcrypt from 'bcryptjs';

async function seedAdminUser() {
  console.log(`\n=============================================================`);
  console.log(`🔑 SEEDING SYSTEM ADMIN ACCOUNTS IN MYSQL (system_users)`);
  console.log(`=============================================================\n`);

  try {
    await sequelize.authenticate();
    await sequelize.sync({ force: false });
    console.log('[DB Status] Database Connection OK & Tables Synced.');

    const adminAccounts = [
      { name: 'System Admin', email: 'admin@drtalhaclinic.com', password: 'Password123' },
      { name: 'System Admin', email: 'admin@gmail.com', password: 'Password123' },
    ];

    for (const acc of adminAccounts) {
      console.log(`Processing Admin Account: ${acc.email}...`);
      const hashedPassword = await bcrypt.hash(acc.password, 10);
      
      let sysUser = await SystemUser.findOne({ where: { email: acc.email } });
      if (!sysUser) {
        sysUser = await SystemUser.create({
          name: acc.name,
          email: acc.email,
          password: hashedPassword,
          role: 'admin',
          phone: '0300-1234567',
          status: 'active',
        });
        console.log(`✅ [system_users Table] Created SystemUser record! ID: ${sysUser.id}`);
      } else {
        await sysUser.update({
          name: acc.name,
          password: hashedPassword,
          role: 'admin',
          status: 'active',
        });
        console.log(`✅ [system_users Table] Updated SystemUser record! ID: ${sysUser.id}`);
      }

      // Also sync legacy User table
      try {
        let localUser = await User.findOne({ where: { email: acc.email } });
        if (!localUser) {
          await User.create({
            name: acc.name,
            email: acc.email,
            password: hashedPassword,
            role: 'admin',
            phone: '0300-1234567',
            status: 'active',
          });
        }
      } catch (e) {}
    }

    console.log(`\n=============================================================`);
    console.log(`🎉 SYSTEM ADMIN ACCOUNTS SUCCESSFULLY CREATED IN MYSQL!`);
    console.log(`   Emails:   admin@drtalhaclinic.com  /  admin@gmail.com`);
    console.log(`   Password: Password123`);
    console.log(`=============================================================\n`);
    process.exit(0);
  } catch (error: any) {
    console.error('❌ [Seed Admin Error]:', error.message);
    process.exit(1);
  }
}

seedAdminUser();
