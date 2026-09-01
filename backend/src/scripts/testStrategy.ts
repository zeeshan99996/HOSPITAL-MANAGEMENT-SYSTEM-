import dotenv from 'dotenv';
import { backupScheduler } from '../services/backupScheduler';
import sequelize from '../config/db';

dotenv.config();

async function main() {
  console.log('--- TESTING BACKUP STRATEGY EVALUATOR ---');
  try {
    await sequelize.authenticate();
    console.log('[DB Status] Database Connection OK.');

    const result = await backupScheduler.evaluateAndRunStrategy();
    console.log('Strategy Evaluation Result:', result);
    process.exit(0);
  } catch (err: any) {
    console.error('Strategy Evaluation Error:', err.message);
    process.exit(1);
  }
}

main();
