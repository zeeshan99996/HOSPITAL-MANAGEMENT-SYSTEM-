import express from 'express';
import apiRouter from '../routes/api';
import sequelize from '../config/db';

const app = express();
app.use(express.json());
app.use('/api', apiRouter);

async function runTest() {
  try {
    await sequelize.authenticate();
    console.log('✅ DB Connected');

    const server = app.listen(5099, async () => {
      console.log('Test server running on port 5099');

      // Test 1: GET /api/auth/system-users
      console.log('\nTesting GET /api/auth/system-users...');
      const res1 = await fetch('http://localhost:5099/api/auth/system-users');
      console.log('Status:', res1.status);
      const data1 = await res1.json();
      console.log('System users count:', data1.length);
      console.log('Users sample:', data1.slice(0, 3));

      // Test 2: POST /api/auth/login with valid admin user
      console.log('\nTesting POST /api/auth/login with admin@gmail.com...');
      const res2 = await fetch('http://localhost:5099/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@gmail.com', password: 'Password123' })
      });
      console.log('Status:', res2.status);
      const data2 = await res2.json();
      console.log('Login Response:', data2);

      // Test 3: POST /api/auth/login with wrong password
      console.log('\nTesting POST /api/auth/login with wrong password...');
      const res3 = await fetch('http://localhost:5099/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@gmail.com', password: 'wrongpassword' })
      });
      console.log('Status:', res3.status);
      const data3 = await res3.json();
      console.log('Wrong Password Response:', data3);

      // Test 4: POST /api/auth/login with invalid email format
      console.log('\nTesting POST /api/auth/login with invalid email format...');
      const res4 = await fetch('http://localhost:5099/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'invalid-email', password: 'Password123' })
      });
      console.log('Status:', res4.status);
      const data4 = await res4.json();
      console.log('Invalid Email Response:', data4);

      server.close();
      process.exit(0);
    });
  } catch (err: any) {
    console.error('Test server error:', err);
    process.exit(1);
  }
}

runTest();
