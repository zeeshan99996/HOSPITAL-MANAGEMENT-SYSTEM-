import sequelize from '../config/db';
import { Doctor, User, StaffMember, TokenQueue } from '../models';

async function inspectAll() {
  await sequelize.authenticate();
  console.log('=== USERS ===');
  const users = await User.findAll();
  users.forEach((u: any) => console.log(`User ID: ${u.id} | Name: "${u.name}" | Email: "${u.email}" | Role: ${u.role}`));

  console.log('\n=== STAFF MEMBERS ===');
  const staff = await StaffMember.findAll();
  staff.forEach((s: any) => console.log(`Staff ID: ${s.id} | Name: "${s.name}" | Designation: "${s.designation}" | Email: "${s.email}"`));

  console.log('\n=== DOCTORS ===');
  const docs = await Doctor.findAll();
  docs.forEach((d: any) => console.log(`Doctor ID: ${d.id} | userId: ${d.userId} | staffId: ${d.staffId} | Specialization: "${d.specialization}"`));

  console.log('\n=== ALL TOKENS ===');
  const tokens = await TokenQueue.findAll({ order: [['id', 'DESC']] });
  tokens.forEach((t: any) => console.log(`Token ID: ${t.id} | Token#: ${t.tokenNumber} | PatientId: ${t.patientId} | DoctorId: ${t.doctorId} | TransferredTo: ${t.transferredToDoctorId} | Status: ${t.status} | CreatedAt: ${t.createdAt}`));
}

inspectAll();
