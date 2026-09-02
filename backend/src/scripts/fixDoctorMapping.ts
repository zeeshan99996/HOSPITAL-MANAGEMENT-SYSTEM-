import sequelize from '../config/db';
import { Doctor, User, TokenQueue } from '../models';

async function fixDoctorMapping() {
  await sequelize.authenticate();
  console.log('--- FIXING DOCTOR MAPPING ---');

  // 1. Link Doctor ID: 10 to User ID: 17 (or User ID: 23)
  const doc10 = await Doctor.findByPk(10);
  if (doc10) {
    await doc10.update({ userId: 23 });
    console.log('✅ Linked Doctor ID: 10 to User ID: 23 (doctor@lifeflow.com).');
  }

  // 2. Also ensure User ID 17 has a doctor record or link
  const doc14 = await Doctor.findByPk(14);
  if (doc14) {
    await doc14.update({ userId: 17, name: 'Dr. Muhammad Talha' });
    console.log('✅ Updated Doctor ID: 14 for User ID: 17.');
  }

  // 3. Update Token #10 status to 'waiting' or 'processing' so it is actively in doctor queue
  const t10 = await TokenQueue.findByPk(10);
  if (t10) {
    await t10.update({ status: 'waiting', doctorId: 10 });
    console.log(`✅ Updated Token #10 status to "${t10.status}".`);
  }
}

fixDoctorMapping();
