// testAPI.js - Simple script to test the API
const https = require('https');
const http = require('http');

const makeRequest = (options, data) => {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
};

const testAPI = async () => {
  try {
    console.log('Testing login with test admin...');
    
    const loginData = JSON.stringify({
      email: "admin@test.com",
      password: "TestAdmin123"
    });
    
    const loginOptions = {
      hostname: 'localhost',
      port: 4000,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(loginData)
      }
    };
    
    const loginResult = await makeRequest(loginOptions, loginData);
    console.log('Login result:', loginResult);
    
    if (loginResult.status === 200) {
      console.log('✅ Login successful!');
      console.log('Token:', loginResult.data.token);
      
      // Test clients endpoint
      console.log('\nTesting clients endpoint...');
      const clientsOptions = {
        hostname: 'localhost',
        port: 4000,
        path: '/api/clients',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${loginResult.data.token}`,
          'Content-Type': 'application/json'
        }
      };
      
      const clientsResult = await makeRequest(clientsOptions);
      console.log('Clients result:', clientsResult);
      
    } else {
      console.log('❌ Login failed');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
};

testAPI();
