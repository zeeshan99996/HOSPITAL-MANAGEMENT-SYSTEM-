import { Sequelize } from 'sequelize';
import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';

async function generateDump() {
  console.log('[SQL Exporter] Initializing models and seeding data...');

  const dbPath = path.resolve(__dirname, '../../temp_dump.db');
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }

  const sequelize = new Sequelize({
    dialect: 'sqlite',
    dialectModule: sqlite3,
    storage: dbPath,
    logging: false
  });

  process.env.DB_DIALECT = 'sqlite';
  const models = await import('../models');
  const { seedDatabase } = await import('../seeders/initialSeed');

  await sequelize.sync({ force: true });
  await seedDatabase();

  console.log('[SQL Exporter] Database seeded successfully. Generating MySQL schema and SQL file...');

  let sqlOutput = `-- LifeFlow Hospital Management System - Hostinger MySQL Database Dump\n`;
  sqlOutput += `-- Target Database: u526981273_BfYkc\n`;
  sqlOutput += `-- Generated: ${new Date().toISOString()}\n\n`;
  sqlOutput += `SET FOREIGN_KEY_CHECKS = 0;\n\n`;

  const modelsObj: any = models;
  const tables = Object.keys(modelsObj).filter(key => modelsObj[key] && modelsObj[key].tableName);
  
  for (const modelName of tables) {
    const model = modelsObj[modelName];
    if (!model || !model.tableName || typeof model.findAll !== 'function') continue;

    const tableName = model.tableName;
    const attributes = model.rawAttributes;

    sqlOutput += `-- Table structure for table \`${tableName}\`\n`;
    sqlOutput += `DROP TABLE IF EXISTS \`${tableName}\`;\n`;
    sqlOutput += `CREATE TABLE \`${tableName}\` (\n`;

    const colDefs: string[] = [];
    const pkCols: string[] = [];

    for (const [colName, attr] of Object.entries<any>(attributes)) {
      let typeStr = 'VARCHAR(255)';
      const typeKey = attr.type ? attr.type.constructor.name : 'STRING';

      if (typeKey === 'INTEGER' || typeKey === 'BIGINT') {
        typeStr = attr.autoIncrement ? 'INT AUTO_INCREMENT NOT NULL' : 'INT';
      } else if (typeKey === 'FLOAT' || typeKey === 'DOUBLE' || typeKey === 'DECIMAL') {
        typeStr = 'DECIMAL(10, 2)';
      } else if (typeKey === 'TEXT') {
        typeStr = 'TEXT';
      } else if (typeKey === 'BOOLEAN') {
        typeStr = 'TINYINT(1)';
      } else if (typeKey === 'DATE' || typeKey === 'DATEONLY') {
        typeStr = 'DATETIME';
      }

      let nullable = attr.autoIncrement ? '' : (attr.allowNull === false ? 'NOT NULL' : 'NULL');
      let defaultVal = '';
      if (attr.defaultValue !== undefined && typeof attr.defaultValue !== 'function') {
        if (typeof attr.defaultValue === 'boolean') {
          defaultVal = `DEFAULT ${attr.defaultValue ? 1 : 0}`;
        } else if (typeof attr.defaultValue === 'number') {
          defaultVal = `DEFAULT ${attr.defaultValue}`;
        } else if (typeof attr.defaultValue === 'string') {
          defaultVal = `DEFAULT '${attr.defaultValue.replace(/'/g, "''")}'`;
        }
      }

      colDefs.push(`  \`${colName}\` ${typeStr} ${nullable} ${defaultVal}`.trim());
      if (attr.primaryKey) pkCols.push(`\`${colName}\``);
    }

    if (pkCols.length > 0) {
      colDefs.push(`  PRIMARY KEY (${pkCols.join(', ')})`);
    }
    sqlOutput += colDefs.join(',\n') + `\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;\n\n`;

    try {
      const records = await model.findAll({ raw: true });
      if (records && records.length > 0) {
        sqlOutput += `-- Dumping data for table \`${tableName}\`\n`;
        for (const row of records) {
          const keys = Object.keys(row).map(k => `\`${k}\``).join(', ');
          const values = Object.values(row).map(val => {
            if (val === null || val === undefined) return 'NULL';
            if (typeof val === 'boolean') return val ? 1 : 0;
            if (typeof val === 'number') return val;
            if (val instanceof Date) return `'${val.toISOString().slice(0, 19).replace('T', ' ')}'`;
            return `'${String(val).replace(/'/g, "''").replace(/\\/g, '\\\\')}'`;
          }).join(', ');

          sqlOutput += `INSERT INTO \`${tableName}\` (${keys}) VALUES (${values});\n`;
        }
        sqlOutput += `\n`;
      }
    } catch (e) {
      console.warn(`[Dump Warn] Could not dump records for table ${tableName}:`, e);
    }
  }

  sqlOutput += `SET FOREIGN_KEY_CHECKS = 1;\n`;

  const outputPath = path.resolve(__dirname, '../../../lifeflow_hms_hostinger_export.sql');
  fs.writeFileSync(outputPath, sqlOutput, 'utf8');
  console.log(`[SQL Exporter] Successfully generated SQL file: ${outputPath}`);

  try {
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
  } catch (e) {}
}

generateDump().catch(err => {
  console.error('[SQL Exporter Error]:', err);
  process.exit(1);
});
