#!/usr/bin/env node

// Direct test of the registration flow - simulates the web app integration
const https = require('http');

console.log('🚀 STARTING END-TO-END REGISTRATION TEST');
console.log('==========================================');

const testRegistration = async () => {
  console.log('🔍 Testing API connectivity...');
  
  // Test 1: API Connectivity Check
  const connectivityTest = {
    query: `query HealthCheck { __schema { queryType { name } } }`
  };
  
  try {
    const connectivityResult = await makeGraphQLRequest(connectivityTest);
    console.log('✅ API connectivity test successful:', connectivityResult);
  } catch (error) {
    console.error('❌ API connectivity test failed:', error.message);
    return;
  }
  
  console.log('📝 Form submitted with test credentials: testuser@dojopool.com');
  console.log('🚀 Sending registration mutation to API...');
  
  // Test 2: User Registration Mutation
  const registrationMutation = {
    query: `
      mutation RegisterUser($input: RegisterInput!) {
        register(input: $input) {
          success
          message
          user {
            id
            email
            firstName
            lastName
            role
            profileComplete
          }
          token
        }
      }
    `,
    variables: {
      input: {
        email: "testuser@dojopool.com",
        password: "test123",
        firstName: "Test",
        lastName: "User", 
        role: "PROFESSIONAL"
      }
    }
  };
  
  try {
    const registrationResult = await makeGraphQLRequest(registrationMutation);
    console.log('🎉 Registration mutation completed:', registrationResult);
    
    if (registrationResult.data.register.success) {
      const { user, token } = registrationResult.data.register;
      console.log('✅ Registration successful! User data:', user);
      console.log('🔑 JWT Token received:', token.substring(0, 20) + '...');
      console.log('📱 Would redirect to dashboard with user:', {
        id: user.id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        role: user.role
      });
    } else {
      console.error('❌ Registration failed:', registrationResult.data.register.message);
    }
  } catch (error) {
    console.error('💥 Registration mutation error:', error.message);
  }
};

function makeGraphQLRequest(payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/graphql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };
    
    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          if (parsed.errors) {
            reject(new Error(`GraphQL Error: ${JSON.stringify(parsed.errors)}`));
          } else {
            resolve(parsed);
          }
        } catch (error) {
          reject(new Error(`Failed to parse response: ${responseData}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.write(data);
    req.end();
  });
}

// Execute the test
testRegistration();