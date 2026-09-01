import sequelize from '../config/db';

async function runSchemaMigration() {
  console.log('[Migration] Starting safe database schema migration...');
  try {
    await sequelize.authenticate();
    console.log('[Migration] Database connection authenticated successfully.');

    // Ensure all tables are created
    await sequelize.sync({ force: false });
    console.log('[Migration] Tables synchronized.');

    const dialect = sequelize.getDialect();
    console.log(`[Migration] Database dialect: ${dialect}`);

    if (dialect === 'mysql') {
      const mysqlCols = [
        // admissions
        { table: 'admissions', col: 'admissionCategory', type: 'VARCHAR(255) DEFAULT \'medical\'' },
        { table: 'admissions', col: 'stayType', type: 'VARCHAR(255) DEFAULT \'short\'' },
        { table: 'admissions', col: 'surgeryDetails', type: 'TEXT' },
        { table: 'admissions', col: 'treatmentPlan', type: 'TEXT' },
        { table: 'admissions', col: 'transferredFromBedId', type: 'INT NULL' },
        { table: 'admissions', col: 'transferReason', type: 'VARCHAR(255) NULL' },
        { table: 'admissions', col: 'dischargeSummary', type: 'TEXT NULL' },
        { table: 'admissions', col: 'dischargeCondition', type: 'VARCHAR(255) NULL' },
        { table: 'admissions', col: 'homeMedications', type: 'TEXT NULL' },

        // token_queues
        { table: 'token_queues', col: 'transferredToDoctorId', type: 'INT NULL' },

        // invoices
        { table: 'invoices', col: 'isVoided', type: 'TINYINT(1) DEFAULT 0' },
        { table: 'invoices', col: 'voidReason', type: 'VARCHAR(255) NULL' },
        { table: 'invoices', col: 'refundAmount', type: 'DECIMAL(10, 2) DEFAULT 0' },
        { table: 'invoices', col: 'refundReason', type: 'VARCHAR(255) NULL' },
        { table: 'invoices', col: 'refundDate', type: 'DATETIME NULL' },

        // users & staff
        { table: 'users', col: 'deletedAt', type: 'DATETIME' },
        { table: 'users', col: 'roleId', type: 'INT' },
        { table: 'users', col: 'supabase_user_id', type: 'VARCHAR(255)' },
        { table: 'doctors', col: 'staffId', type: 'INT' },
        { table: 'nurses', col: 'staffId', type: 'INT' }
      ];

      for (const item of mysqlCols) {
        try {
          await sequelize.query(`ALTER TABLE \`${item.table}\` ADD COLUMN \`${item.col}\` ${item.type};`);
          console.log(`[Migration] ✅ Added column \`${item.col}\` to \`${item.table}\`.`);
        } catch (e: any) {
          // Column already exists or duplicate column error in MySQL (Error 1060)
          if (e.original?.errno === 1060 || e.message?.includes('Duplicate column name')) {
            console.log(`[Migration] ℹ️ Column \`${item.col}\` already exists in \`${item.table}\`.`);
          } else {
            console.warn(`[Migration] ⚠️ Notice on \`${item.table}\`.\`${item.col}\`:`, e.message);
          }
        }
      }

      // Safe Index Creation for High-Traffic Query Paths
      const mysqlIndexes = [
        { table: 'token_queues', name: 'idx_token_queues_created_status_doc', cols: '`createdAt`, `status`, `doctorId`' },
        { table: 'token_queues', name: 'idx_token_queues_patient_id', cols: '`patientId`' },
        { table: 'appointments', name: 'idx_appts_date_doc_status', cols: '`appointmentDate`, `doctorId`, `status`' },
        { table: 'appointments', name: 'idx_appts_patient_id', cols: '`patientId`' },
        { table: 'invoices', name: 'idx_invoices_patient_status_created', cols: '`patientId`, `status`, `createdAt`' },
        { table: 'activity_logs', name: 'idx_activity_logs_created_user', cols: '`createdAt`, `userId`' },
        { table: 'patient_visits', name: 'idx_patient_visits_patient_date', cols: '`patientId`, `visitDate`' },
        { table: 'prescriptions', name: 'idx_prescriptions_appt_date', cols: '`appointmentId`, `prescriptionDate`' },
        { table: 'lab_requests', name: 'idx_lab_requests_patient_status', cols: '`patientId`, `status`' },
        { table: 'beds', name: 'idx_beds_status_ward', cols: '`status`, `wardName`' },
      ];

      for (const idx of mysqlIndexes) {
        try {
          await sequelize.query(`CREATE INDEX \`${idx.name}\` ON \`${idx.table}\` (${idx.cols});`);
          console.log(`[Migration] ⚡ Created index \`${idx.name}\` on \`${idx.table}\`.`);
        } catch (idxErr: any) {
          if (idxErr.original?.errno === 1061 || idxErr.message?.includes('Duplicate key name')) {
            console.log(`[Migration] ℹ️ Index \`${idx.name}\` already exists on \`${idx.table}\`.`);
          } else {
            console.warn(`[Migration] ⚠️ Index notice on \`${idx.table}\`.\`${idx.name}\`:`, idxErr.message);
          }
        }
      }
    } else if (dialect === 'postgres') {
      const pgCols = [
        'ALTER TABLE "admissions" ADD COLUMN IF NOT EXISTS "admissionCategory" VARCHAR DEFAULT \'medical\';',
        'ALTER TABLE "admissions" ADD COLUMN IF NOT EXISTS "stayType" VARCHAR DEFAULT \'short\';',
        'ALTER TABLE "admissions" ADD COLUMN IF NOT EXISTS "surgeryDetails" TEXT;',
        'ALTER TABLE "admissions" ADD COLUMN IF NOT EXISTS "treatmentPlan" TEXT;',
        'ALTER TABLE "admissions" ADD COLUMN IF NOT EXISTS "transferredFromBedId" INTEGER;',
        'ALTER TABLE "admissions" ADD COLUMN IF NOT EXISTS "transferReason" VARCHAR(255);',
        'ALTER TABLE "admissions" ADD COLUMN IF NOT EXISTS "dischargeSummary" TEXT;',
        'ALTER TABLE "admissions" ADD COLUMN IF NOT EXISTS "dischargeCondition" VARCHAR(255);',
        'ALTER TABLE "admissions" ADD COLUMN IF NOT EXISTS "homeMedications" TEXT;',
        'ALTER TABLE "token_queues" ADD COLUMN IF NOT EXISTS "transferredToDoctorId" INTEGER;',
        'ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "isVoided" BOOLEAN DEFAULT FALSE;',
        'ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "voidReason" VARCHAR(255);',
        'ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "refundAmount" NUMERIC(10, 2) DEFAULT 0;',
        'ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "refundReason" VARCHAR(255);',
        'ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "refundDate" TIMESTAMP WITH TIME ZONE;',
        'ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP WITH TIME ZONE;',
        'ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "roleId" INTEGER;',
        'ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "supabase_user_id" VARCHAR(255);',
        'ALTER TABLE "doctors" ADD COLUMN IF NOT EXISTS "staffId" INTEGER;',
        'ALTER TABLE "nurses" ADD COLUMN IF NOT EXISTS "staffId" INTEGER;'
      ];

      for (const q of pgCols) {
        try {
          await sequelize.query(q);
        } catch (e: any) {
          console.warn('[PostgreSQL Migration Warning]:', e.message);
        }
      }
    }

    console.log('[Migration] 🎉 Database schema migration completed successfully!');
    process.exit(0);
  } catch (err: any) {
    console.error('[Migration] ❌ Critical migration failure:', err);
    process.exit(1);
  }
}

runSchemaMigration();
