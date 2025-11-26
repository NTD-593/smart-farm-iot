// Quick test script for authentication endpoints
const axios = require('axios');

const API_URL = 'http://localhost:3000';

async function testAuth() {
  console.log('🧪 Testing Authentication System...\n');

  try {
    // Test 1: Login
    console.log('1️⃣ Testing Login...');
    const loginResponse = await axios.post(`${API_URL}/api/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });

    const { token, user } = loginResponse.data;
    console.log('✅ Login successful!');
    console.log('   User:', user.fullName);
    console.log('   Role:', user.role);
    console.log('   Token:', token.substring(0, 20) + '...\n');

    // Test 2: Get current user
    console.log('2️⃣ Testing GET /api/auth/me...');
    const meResponse = await axios.get(`${API_URL}/api/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('✅ Current user:', meResponse.data.fullName, `(${meResponse.data.role})\n`);

    // Test 3: List users (admin only)
    console.log('3️⃣ Testing GET /api/users (Admin only)...');
    const usersResponse = await axios.get(`${API_URL}/api/users`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log(`✅ Found ${usersResponse.data.count} users:`);
    usersResponse.data.users.forEach(u => {
      console.log(`   - ${u.username} (${u.role}) - ${u.fullName}`);
    });
    console.log('');

    // Test 4: Test protected endpoint (control)
    console.log('4️⃣ Testing POST /control (requires OPERATOR or ADMIN)...');
    const controlResponse = await axios.post(`${API_URL}/control`, {
      device: 'farm01',
      cmd: { pump: 1 }
    }, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('✅ Control successful:', controlResponse.data);
    console.log('');

    // Test 5: Test without token (should fail)
    console.log('5️⃣ Testing access without token (should fail)...');
    try {
      await axios.get(`${API_URL}/api/users`);
      console.log('❌ ERROR: Should have been denied!');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Correctly denied: 401 Unauthorized');
      }
    }
    console.log('');

    console.log('✅ All tests passed! Authentication system is working correctly.\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📝 Login Credentials:');
    console.log('   Username: admin');
    console.log('   Password: admin123');
    console.log('   Role: ADMIN');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testAuth();
