import sequelize from '../config/db';
import { Doctor, User, TokenQueue, Patient } from '../models';

async function checkDoctorTokens() {
  await sequelize.authenticate();
  console.log('--- DOCTORS IN DB ---');
  const doctors = await Doctor.findAll({
    include: [{ model: User }]
  });
  doctors.forEach((d: any) => {
    console.log(`Doctor ID: ${d.id} | Name: "${d.name}" | userId: ${d.userId} | staffId: ${d.staffId} | User email: ${d.user?.email} | User name: ${d.user?.name}`);
  });

  console.log('\n--- USERS WITH ROLE DOCTOR ---');
  const docUsers = await User.findAll({ where: { role: 'doctor' } });
  docUsers.forEach((u: any) => {
    console.log(`User ID: ${u.id} | Name: "${u.name}" | Email: "${u.email}" | Role: ${u.role}`);
  });

  console.log('\n--- RECENT TOKEN QUEUES ---');
  const tokens = await TokenQueue.findAll({
    limit: 10,
    order: [['id', 'DESC']],
    include: [{ model: Patient }]
  });
  tokens.forEach((t: any) => {
    console.log(`Token ID: ${t.id} | Token#: ${t.tokenNumber} | PatientId: ${t.patientId} (Name: ${t.patient?.name}) | DoctorId: ${t.doctorId} | TransferredTo: ${t.transferredToDoctorId} | Status: ${t.status} | CreatedAt: ${t.createdAt}`);
  });
}

checkDoctorTokens();
