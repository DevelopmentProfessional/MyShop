const axios = require('axios');

const BASE_URL = 'http://localhost:3030';

// Test configuration
const testConfig = {
    timeout: 5000,
    headers: {
        'Content-Type': 'application/json'
    }
};

// Test results storage
const testResults = {
    passed: 0,
    failed: 0,
    errors: []
};

// Helper function to run tests
async function runTest(testName, testFunction) {
    try {
        console.log(`\n🧪 Running test: ${testName}`);
        await testFunction();
        console.log(`✅ ${testName} - PASSED`);
        testResults.passed++;
    } catch (error) {
        console.log(`❌ ${testName} - FAILED`);
        console.log(`   Error: ${error.message}`);
        testResults.failed++;
        testResults.errors.push({ test: testName, error: error.message });
    }
}

// Test functions
async function testEmployeesAPI() {
    // Test GET /api/employees
    const response = await axios.get(`${BASE_URL}/api/employees`, testConfig);
    if (!response.data.success) {
        throw new Error('GET /api/employees failed - success flag is false');
    }
    console.log(`   Found ${response.data.data.length} employees`);
}

async function testServicesAPI() {
    // Test GET /api/services
    const response = await axios.get(`${BASE_URL}/api/services`, testConfig);
    if (!response.data.success) {
        throw new Error('GET /api/services failed - success flag is false');
    }
    console.log(`   Found ${response.data.data.length} services`);
}

async function testClientsAPI() {
    // Test GET /api/clients
    const response = await axios.get(`${BASE_URL}/api/clients`, testConfig);
    if (!response.data.success) {
        throw new Error('GET /api/clients failed - success flag is false');
    }
    console.log(`   Found ${response.data.data.length} clients`);
}

async function testProductsAPI() {
    // Test GET /api/products
    const response = await axios.get(`${BASE_URL}/api/products`, testConfig);
    if (!response.data.success) {
        throw new Error('GET /api/products failed - success flag is false');
    }
    console.log(`   Found ${response.data.data.length} products`);
}

async function testProjectsAPI() {
    // Test GET /api/projects
    const response = await axios.get(`${BASE_URL}/api/projects`, testConfig);
    if (!response.data.success) {
        throw new Error('GET /api/projects failed - success flag is false');
    }
    console.log(`   Found ${response.data.data.length} projects`);
}

async function testTasksAPI() {
    // Test GET /api/tasks
    const response = await axios.get(`${BASE_URL}/api/tasks`, testConfig);
    if (!response.data.success) {
        throw new Error('GET /api/tasks failed - success flag is false');
    }
    console.log(`   Found ${response.data.data.length} tasks`);
}

async function testAppointmentsAPI() {
    // Test GET /api/appointments
    const response = await axios.get(`${BASE_URL}/api/appointments`, testConfig);
    if (!response.data.success) {
        throw new Error('GET /api/appointments failed - success flag is false');
    }
    console.log(`   Found ${response.data.data.length} appointments`);
}

async function testPayrollAPI() {
    // Test GET /api/payroll
    const response = await axios.get(`${BASE_URL}/api/payroll`, testConfig);
    if (!response.data.success) {
        throw new Error('GET /api/payroll failed - success flag is false');
    }
    console.log(`   Found ${response.data.data.length} payroll records`);
}

async function testShiftTemplatesAPI() {
    // Test GET /api/shift-templates
    const response = await axios.get(`${BASE_URL}/api/shift-templates`, testConfig);
    if (!response.data.success) {
        throw new Error('GET /api/shift-templates failed - success flag is false');
    }
    console.log(`   Found ${response.data.data.length} shift templates`);
}

async function testShiftRotationsAPI() {
    // Test GET /api/shift-rotations
    const response = await axios.get(`${BASE_URL}/api/shift-rotations`, testConfig);
    if (!response.data.success) {
        throw new Error('GET /api/shift-rotations failed - success flag is false');
    }
    console.log(`   Found ${response.data.data.length} shift rotations`);
}

async function testShiftAssignmentsAPI() {
    // Test GET /api/shift-assignments
    const response = await axios.get(`${BASE_URL}/api/shift-assignments`, testConfig);
    if (!response.data.success) {
        throw new Error('GET /api/shift-assignments failed - success flag is false');
    }
    console.log(`   Found ${response.data.data.length} shift assignments`);
}

async function testEmployeeBenefitsAPI() {
    // Test GET /api/employees/1/benefits (assuming employee ID 1 exists)
    try {
        const response = await axios.get(`${BASE_URL}/api/employees/1/benefits`, testConfig);
        console.log(`   Found ${response.data.length} benefits for employee 1`);
    } catch (error) {
        if (error.response && error.response.status === 404) {
            console.log(`   Employee 1 not found (expected if no data)`);
        } else {
            throw error;
        }
    }
}

async function testEmployeeDeductionsAPI() {
    // Test GET /api/employees/1/deductions (assuming employee ID 1 exists)
    try {
        const response = await axios.get(`${BASE_URL}/api/employees/1/deductions`, testConfig);
        console.log(`   Found ${response.data.length} deductions for employee 1`);
    } catch (error) {
        if (error.response && error.response.status === 404) {
            console.log(`   Employee 1 not found (expected if no data)`);
        } else {
            throw error;
        }
    }
}

async function testDeductionsAPI() {
    // Test GET /api/deductions
    const response = await axios.get(`${BASE_URL}/api/deductions`, testConfig);
    console.log(`   Found ${response.data.length} deductions`);
}

async function testTeamsAPI() {
    // Test GET /api/teams
    const response = await axios.get(`${BASE_URL}/api/teams`, testConfig);
    if (!response.data.success) {
        throw new Error('GET /api/teams failed - success flag is false');
    }
    console.log(`   Found ${response.data.data.length} teams`);
}

async function testResourcesAPI() {
    // Test GET /api/resources
    const response = await axios.get(`${BASE_URL}/api/resources`, testConfig);
    if (!response.data.success) {
        throw new Error('GET /api/resources failed - success flag is false');
    }
    console.log(`   Found ${response.data.data.length} resources`);
}

async function testFacilitiesAPI() {
    // Test GET /api/facilities
    const response = await axios.get(`${BASE_URL}/api/facilities`, testConfig);
    if (!response.data.success) {
        throw new Error('GET /api/facilities failed - success flag is false');
    }
    console.log(`   Found ${response.data.data.length} facilities`);
}

// Main test runner
async function runAllTests() {
    console.log('🚀 Starting API Tests...\n');
    console.log(`Testing server at: ${BASE_URL}\n`);

    const tests = [
        { name: 'Employees API', fn: testEmployeesAPI },
        { name: 'Services API', fn: testServicesAPI },
        { name: 'Clients API', fn: testClientsAPI },
        { name: 'Products API', fn: testProductsAPI },
        { name: 'Projects API', fn: testProjectsAPI },
        { name: 'Tasks API', fn: testTasksAPI },
        { name: 'Appointments API', fn: testAppointmentsAPI },
        { name: 'Payroll API', fn: testPayrollAPI },
        { name: 'Shift Templates API', fn: testShiftTemplatesAPI },
        { name: 'Shift Rotations API', fn: testShiftRotationsAPI },
        { name: 'Shift Assignments API', fn: testShiftAssignmentsAPI },
        { name: 'Employee Benefits API', fn: testEmployeeBenefitsAPI },
        { name: 'Employee Deductions API', fn: testEmployeeDeductionsAPI },
        { name: 'Deductions API', fn: testDeductionsAPI },
        { name: 'Teams API', fn: testTeamsAPI },
        { name: 'Resources API', fn: testResourcesAPI },
        { name: 'Facilities API', fn: testFacilitiesAPI }
    ];

    for (const test of tests) {
        await runTest(test.name, test.fn);
    }

    // Print summary
    console.log('\n📊 Test Summary:');
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    console.log(`📈 Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);

    if (testResults.errors.length > 0) {
        console.log('\n❌ Failed Tests:');
        testResults.errors.forEach(error => {
            console.log(`   - ${error.test}: ${error.error}`);
        });
    }

    if (testResults.failed === 0) {
        console.log('\n🎉 All tests passed! APIs are working correctly.');
    } else {
        console.log('\n⚠️  Some tests failed. Check the errors above.');
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    runAllTests().catch(error => {
        console.error('Test runner error:', error.message);
        process.exit(1);
    });
}

module.exports = { runAllTests, testResults }; 