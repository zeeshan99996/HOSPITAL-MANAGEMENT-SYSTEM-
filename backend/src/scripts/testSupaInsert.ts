import { supabaseAdmin } from '../config/supabase';

async function testInsertNew() {
  const testEmail = `user_${Date.now()}@gmail.com`;
  console.log(`Testing insert of new user: ${testEmail}...`);

  const { data, error } = await supabaseAdmin
    .from('system_users')
    .insert([
      {
        name: 'New Test User',
        email: testEmail,
        password: 'hashed_password_123',
        phone: '0300-9999999',
        role: 'doctor',
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
    console.log(`📋 Supabase Current Rows Count: ${selectData?.length}`, selectData);
  }
}

testInsertNew();
