// Test script để kiểm tra API và chart data
require('dotenv').config();
const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:3000';
const DEVICE_ID = 'farm01';

async function testAPIs() {
  console.log('🧪 Testing Backend APIs...\n');

  try {
    // Test 1: Get latest data
    console.log('1️⃣ Testing GET /data (latest)...');
    const latest = await axios.get(`${API_URL}/data`, { params: { limit: 1 } });
    console.log('✅ Latest data:', latest.data.items[0]);
    console.log('');

    // Test 2: Get chart data
    console.log('2️⃣ Testing GET /data/search (chart data)...');
    const to = new Date();
    const from = new Date(to.getTime() - 24 * 60 * 60 * 1000);
    
    const chartData = await axios.get(`${API_URL}/data/search`, {
      params: {
        device: DEVICE_ID,
        from: from.toISOString(),
        to: to.toISOString()
      }
    });
    
    console.log(`✅ Found ${chartData.data.count} records for device: ${DEVICE_ID}`);
    console.log('Sample record:', chartData.data.items[0]);
    console.log('');

    // Test 3: Group and aggregate (simulate frontend logic)
    console.log('3️⃣ Testing data aggregation...');
    const items = chartData.data.items || [];
    const groupedData = {};
    
    items.forEach(item => {
      if (!item.createdAt) return;
      
      const date = new Date(item.createdAt);
      const hourKey = `${date.toLocaleDateString('vi-VN', { month: 'short', day: 'numeric' })} ${String(date.getHours()).padStart(2, '0')}:00`;
      
      if (!groupedData[hourKey]) {
        groupedData[hourKey] = {
          timestamp: date.getTime(),
          temps: [],
          hums: [],
          soils: []
        };
      }
      
      if (item.temperature != null) groupedData[hourKey].temps.push(item.temperature);
      if (item.humidity != null) groupedData[hourKey].hums.push(item.humidity);
      if (item.humiGround != null) groupedData[hourKey].soils.push(item.humiGround);
    });
    
    const aggregated = Object.entries(groupedData)
      .sort((a, b) => a[1].timestamp - b[1].timestamp)
      .map(([key, g]) => ({
        time: key,
        avgTemp: g.temps.length ? (g.temps.reduce((a,b) => a+b, 0) / g.temps.length).toFixed(1) : 0,
        avgHum: g.hums.length ? (g.hums.reduce((a,b) => a+b, 0) / g.hums.length).toFixed(1) : 0,
        avgSoil: g.soils.length ? (g.soils.reduce((a,b) => a+b, 0) / g.soils.length).toFixed(1) : 0,
        count: g.temps.length
      }));
    
    console.log(`✅ Aggregated into ${aggregated.length} hourly groups`);
    console.log('First 5 groups:');
    console.table(aggregated.slice(0, 5));
    console.log('');

    console.log('✅ All tests passed! Frontend should display chart data now.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

testAPIs();
