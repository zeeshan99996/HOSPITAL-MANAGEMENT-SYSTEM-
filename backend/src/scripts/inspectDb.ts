import sequelize from '../config/db';

async function inspectDatabase() {
  console.log(`\n=============================================================`);
  console.log(`🔍 DATABASE FULL INSPECTION REPORT (Tables, Columns & Rows)`);
  console.log(`=============================================================\n`);

  try {
    await sequelize.authenticate();
    const dialect = sequelize.getDialect();
    console.log(`✅ Active Database Dialect: ${dialect.toUpperCase()}\n`);

    // Fetch all tables in database
    let tables: string[] = [];

    if (dialect === 'postgres') {
      const [results]: any = await sequelize.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name;
      `);
      tables = results.map((r: any) => r.table_name);
    } else if (dialect === 'mysql') {
      const [results]: any = await sequelize.query(`SHOW TABLES;`);
      tables = results.map((r: any) => Object.values(r)[0] as string);
    } else {
      const [results]: any = await sequelize.query(`SELECT name FROM sqlite_master WHERE type='table';`);
      tables = results.map((r: any) => r.name);
    }

    console.log(`📌 Found Total ${tables.length} Tables in Database:\n`);

    for (const tableName of tables) {
      if (tableName.startsWith('pg_') || tableName.startsWith('sql_')) continue;

      // Count rows
      const [[{ count }]]: any = await sequelize.query(`SELECT COUNT(*) as count FROM "${tableName}";`).catch(async () => {
        return await sequelize.query(`SELECT COUNT(*) as count FROM \`${tableName}\`;`);
      });

      // Get columns
      let columnNames: string[] = [];
      if (dialect === 'postgres') {
        const [cols]: any = await sequelize.query(`
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_name = '${tableName}'
          ORDER BY ordinal_position;
        `);
        columnNames = cols.map((c: any) => `${c.column_name} (${c.data_type})`);
      } else {
        const [cols]: any = await sequelize.query(`SHOW COLUMNS FROM \`${tableName}\`;`).catch(() => [[]]);
        columnNames = cols.map((c: any) => `${c.Field} (${c.Type})`);
      }

      console.log(`-------------------------------------------------------------`);
      console.log(`📊 TABLE: "${tableName}" | Total Rows: ${count}`);
      console.log(`🏛️ Columns (${columnNames.length}):`);
      console.log(`   ${columnNames.join(', ')}`);
    }

    console.log(`\n=============================================================`);
    console.log(`🎉 Database Inspection Completed Successfully!`);
    console.log(`=============================================================\n`);
    process.exit(0);
  } catch (err: any) {
    console.error('❌ Inspection error:', err.message);
    process.exit(1);
  }
}

inspectDatabase();
