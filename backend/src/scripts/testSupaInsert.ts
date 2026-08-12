import { supabaseAdmin } from '../config/supabase';

async function testInsert() {
  console.log('Testing insert into Supabase system_users table...');
  const { data, error } = await supabaseAdmin
    .from('system_users')
    .insert([
      {
        name: 'System Admin',
        email: 'admin@lifeflow.com',
        password: 'hashed_password_123',
        phone: '0300-1234567',
        role: 'admin',
        status: 'active',
      }
    ])
    .select();

  if (error) {
    console.error('❌ Supabase Insert Error:', error);
  } else {
    console.log('✅ Supabase Insert Success:', data);
  }

  const { data: selectData, error: selectError } = await supabaseAdmin
    .from('system_users')
    .select('*');

  if (selectError) {
    console.error('❌ Supabase Select Error:', selectError);
  } else {
    console.log('📋 Supabase Current Rows:', selectData);
  }
}

testInsert();
