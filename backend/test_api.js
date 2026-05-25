const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
  try {
    console.log('1. Signing up a test user...');
    const signupEmail = `test_${Date.now()}@example.com`;
    const signupRes = await axios.post(`${BASE_URL}/auth/signup`, {
      name: 'Test User',
      email: signupEmail,
      password: 'password123'
    });
    console.log('✅ Signup success:', signupRes.data);

    console.log('\n2. Logging in...');
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: signupEmail,
      password: 'password123'
    });
    const token = loginRes.data.token;
    console.log('✅ Login success! Token received.');

    const headers = { Authorization: `Bearer ${token}` };

    console.log('\n3. Fetching empty dashboard...');
    const dashboardRes1 = await axios.get(`${BASE_URL}/dashboard`, { headers });
    console.log('✅ Dashboard (empty stats) response:', JSON.stringify(dashboardRes1.data, null, 2));

    console.log('\n4. Submitting daily tracker data...');
    const trackerRes = await axios.post(`${BASE_URL}/tracker`, {
      mood: 'excited',
      sleepHours: 8.5,
      screenTime: 3.5,
      stepCount: 12000,
      aqi: 45
    }, { headers });
    console.log('✅ Tracker submission success:', trackerRes.data);

    console.log('\n5. Fetching populated dashboard...');
    const dashboardRes2 = await axios.get(`${BASE_URL}/dashboard`, { headers });
    console.log('✅ Dashboard (populated stats) response:', JSON.stringify(dashboardRes2.data, null, 2));

    console.log('\n6. Fetching analytics...');
    const analyticsRes = await axios.get(`${BASE_URL}/analytics`, { headers });
    console.log('✅ Analytics response:', JSON.stringify(analyticsRes.data, null, 2));

    console.log('\n7. Fetching profile...');
    const profileRes = await axios.get(`${BASE_URL}/profile`, { headers });
    console.log('✅ Profile response:', JSON.stringify(profileRes.data, null, 2));

    console.log('\n🎉 ALL TESTS PASSED!');
  } catch (err) {
    console.error('❌ Test failed:', err.response?.data || err.message);
  }
}

runTests();
