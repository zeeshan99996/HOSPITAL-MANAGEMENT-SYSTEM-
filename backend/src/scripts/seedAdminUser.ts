import sequelize from '../config/db';
import { User, SystemUser } from '../models';
import { supabaseAdmin } from '../config/supabase';
import bcrypt from 'bcryptjs';

async function seedAdminUser() {
  console.log(`\n=============================================================`);
  console.log(`🔑 SEEDING SYSTEM ADMIN ACCOUNTS IN SUPABASE AUTH & SYSTEM_USERS`);
  console.log(`=============================================================\n`);

  try {
    await sequelize.authenticate();
    await sequelize.sync({ force: false });
    console.log('[DB Status] Database Connection OK & Tables Synced.');

    const adminAccounts = [
      { name: 'System Admin', email: 'admin@lifeflow.com', password: 'Password123' },
      { name: 'System Admin', email: 'admin@gmail.com', password: 'Password123' },
    ];

    for (const acc of adminAccounts) {
      console.log(`\n-------------------------------------------------------------`);
      console.log(`Processing Admin Account: ${acc.email}...`);

      let supabaseUserId: string | null = null;

      // 1. Create/Retrieve User in Supabase Auth
      try {
        const { data: sbData, error: sbError } = await supabaseAdmin.auth.admin.createUser({
          email: acc.email,
          password: acc.password,
          email_confirm: true,
          user_metadata: { name: acc.name, role: 'admin' },
        });

        if (sbData?.user) {
          supabaseUserId = sbData.user.id;
          console.log(`✅ [Supabase Auth] Created Supabase Auth user! UUID: ${supabaseUserId}`);
        } else if (sbError) {
          console.warn(`[Supabase Auth Notice]: ${sbError.message}`);
          const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
          const found = listData?.users?.find((u: any) => u.email?.toLowerCase() === acc.email.toLowerCase());
          if (found) {
            supabaseUserId = found.id;
            console.log(`✅ [Supabase Auth] Found existing Supabase Auth UUID: ${supabaseUserId}`);
          }
        }
      } catch (sbEx: any) {
        console.warn(`[Supabase Admin Exception]: ${sbEx.message}`);
      }

      // 2. Create/Update SystemUser in Dedicated system_users table
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
          supabase_user_id: supabaseUserId,
        });
        console.log(`✅ [system_users Table] Created SystemUser record! ID: ${sysUser.id}`);
      } else {
        await sysUser.update({
          name: acc.name,
          password: hashedPassword,
          role: 'admin',
          status: 'active',
          supabase_user_id: supabaseUserId || sysUser.supabase_user_id,
        });
        console.log(`✅ [system_users Table] Updated SystemUser record! ID: ${sysUser.id}`);
      }

      // Also sync User table
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
            supabase_user_id: supabaseUserId,
          });
        }
      } catch (e) {}
    }

    console.log(`\n=============================================================`);
    console.log(`🎉 SYSTEM ADMIN ACCOUNTS SUCCESSFULLY CREATED & SYNCED!`);
    console.log(`   Emails:   admin@lifeflow.com  /  admin@gmail.com`);
    console.log(`   Password: Password123`);
    console.log(`=============================================================\n`);
    process.exit(0);
  } catch (err: any) {
    console.error('❌ Admin Seeding Failed:', err.message);
    process.exit(1);
  }
}

seedAdminUser();
