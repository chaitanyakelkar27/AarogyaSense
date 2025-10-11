/**
 * Demo Script - Test Aarogya Health System APIs
 * Run in browser console: http://localhost:5173
 */

// Color helpers for console
const colors = {
	success: 'color: #10b981; font-weight: bold',
	error: 'color: #ef4444; font-weight: bold',
	info: 'color: #3b82f6; font-weight: bold',
	warning: 'color: #f59e0b; font-weight: bold'
};

console.log('%c🏥 Aarogya Health System - Demo Script', colors.info);
console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', colors.info);

// Test 1: User Registration
async function testRegistration() {
	console.log('\n%c📝 Test 1: User Registration', colors.info);
	
	try {
		const response = await fetch('/api/auth/register', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				email: `chw${Date.now()}@example.com`,
				password: 'test123456',
				name: 'Demo CHW',
				role: 'CHW',
				phone: '+919876543210',
				language: 'en'
			})
		});
		
		const data = await response.json();
		
		if (response.ok) {
			console.log('%c✅ Registration successful!', colors.success);
			console.log('User:', data.user);
			console.log('Token:', data.token.substring(0, 20) + '...');
			return data.token;
		} else {
			console.log('%c❌ Registration failed:', colors.error, data.error);
			return null;
		}
	} catch (error) {
		console.error('%c❌ Registration error:', colors.error, error);
		return null;
	}
}

// Test 2: User Login
async function testLogin() {
	console.log('\n%c🔐 Test 2: User Login', colors.info);
	
	try {
		const response = await fetch('/api/auth/login', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				email: 'chw@example.com',
				password: 'test123'
			})
		});
		
		const data = await response.json();
		
		if (response.ok) {
			console.log('%c✅ Login successful!', colors.success);
			console.log('User:', data.user);
			return data.token;
		} else {
			console.log('%c⚠️ Login failed (user may not exist):', colors.warning, data.error);
			return null;
		}
	} catch (error) {
		console.error('%c❌ Login error:', colors.error, error);
		return null;
	}
}

// Test 3: Create Case
async function testCreateCase(token) {
	console.log('\n%c📋 Test 3: Create Case', colors.info);
	
	if (!token) {
		console.log('%c⚠️ No token available, skipping case creation', colors.warning);
		return null;
	}
	
	try {
		const response = await fetch('/api/cases', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${token}`
			},
			body: JSON.stringify({
				patient: {
					name: 'Demo Patient',
					age: 45,
					gender: 'male',
					phone: '+919876543211',
					village: 'Demo Village',
					district: 'Demo District'
				},
				symptoms: 'fever, cough, headache, body ache',
				vitalSigns: {
					temperature: 38.5,
					bloodPressure: '120/80',
					heartRate: 85,
					oxygenSaturation: 97,
					respiratoryRate: 18
				},
				notes: 'Patient reports symptoms started 2 days ago',
				location: '28.6139,77.2090'
			})
		});
		
		const data = await response.json();
		
		if (response.ok) {
			console.log('%c✅ Case created successfully!', colors.success);
			console.log('Case ID:', data.id);
			console.log('Patient:', data.patient.name);
			console.log('Status:', data.status);
			return data.id;
		} else {
			console.log('%c❌ Case creation failed:', colors.error, data.error);
			return null;
		}
	} catch (error) {
		console.error('%c❌ Case creation error:', colors.error, error);
		return null;
	}
}

// Test 4: List Cases
async function testListCases(token) {
	console.log('\n%c📊 Test 4: List Cases', colors.info);
	
	if (!token) {
		console.log('%c⚠️ No token available, skipping case listing', colors.warning);
		return;
	}
	
	try {
		const response = await fetch('/api/cases?limit=5', {
			headers: {
				'Authorization': `Bearer ${token}`
			}
		});
		
		const data = await response.json();
		
		if (response.ok) {
			console.log('%c✅ Cases retrieved successfully!', colors.success);
			console.log(`Total cases: ${data.pagination.total}`);
			console.log('Cases:', data.cases);
		} else {
			console.log('%c❌ Failed to retrieve cases:', colors.error, data.error);
		}
	} catch (error) {
		console.error('%c❌ Case listing error:', colors.error, error);
	}
}

// Test 5: AI Risk Scoring
function testRiskScoring() {
	console.log('\n%c🤖 Test 5: AI Risk Scoring', colors.info);
	
	// Import the risk scorer (works in browser if module is available)
	const riskFactors = {
		symptoms: ['fever', 'difficulty breathing', 'chest pain'],
		vitalSigns: {
			temperature: 39.5,
			heartRate: 110,
			oxygenSaturation: 92,
			respiratoryRate: 26
		},
		age: 65,
		existingConditions: ['diabetes', 'hypertension']
	};
	
	console.log('Input:', riskFactors);
	console.log('%c⚠️ Note: Import risk-scorer.ts module to test AI scoring', colors.warning);
	console.log('Example result would be:');
	console.log({
		score: 78,
		level: 'HIGH',
		urgency: 7,
		factors: [
			'Critical symptom: chest pain',
			'Critical symptom: difficulty breathing',
			'Abnormal temperature',
			'Abnormal heart rate',
			'Low oxygen saturation',
			'Abnormal respiratory rate',
			'Vulnerable age group',
			'Pre-existing medical conditions'
		],
		recommendations: [
			'High priority: Medical consultation within 24 hours',
			'Extra monitoring recommended',
			'Review medical history',
			'Document all symptoms and vital signs',
			'Prepare for possible hospitalization'
		]
	});
}

// Test 6: PWA Installation
function testPWA() {
	console.log('\n%c📱 Test 6: PWA Status', colors.info);
	
	if ('serviceWorker' in navigator) {
		navigator.serviceWorker.getRegistrations().then(registrations => {
			if (registrations.length > 0) {
				console.log('%c✅ Service Worker registered!', colors.success);
				console.log('Registrations:', registrations);
			} else {
				console.log('%c⚠️ No Service Worker registered yet', colors.warning);
			}
		});
	} else {
		console.log('%c❌ Service Worker not supported', colors.error);
	}
	
	// Check cache
	if ('caches' in window) {
		caches.keys().then(keys => {
			console.log('%cCache storages:', colors.info, keys);
		});
	}
}

// Run all tests
async function runAllTests() {
	console.log('%c\n🚀 Starting Demo Tests...', colors.info);
	console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', colors.info);
	
	// Test registration
	let token = await testRegistration();
	
	// If registration fails, try login
	if (!token) {
		token = await testLogin();
	}
	
	// Test case creation
	if (token) {
		const caseId = await testCreateCase(token);
		
		// Test case listing
		await testListCases(token);
	}
	
	// Test AI (informational)
	testRiskScoring();
	
	// Test PWA
	testPWA();
	
	console.log('\n%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', colors.info);
	console.log('%c✨ Demo tests completed!', colors.success);
	console.log('%c\nNext steps:', colors.info);
	console.log('1. Check Prisma Studio: npx prisma studio');
	console.log('2. Test in CHW interface: /chw');
	console.log('3. Try ASHA dashboard: /asha');
	console.log('4. Explore Clinician portal: /clinician');
}

// Export for manual testing
window.aarogyaDemo = {
	runAll: runAllTests,
	testRegistration,
	testLogin,
	testCreateCase,
	testListCases,
	testRiskScoring,
	testPWA
};

console.log('\n%c💡 Usage:', colors.info);
console.log('Run all tests: aarogyaDemo.runAll()');
console.log('Individual tests: aarogyaDemo.testRegistration(), etc.');
console.log('\n');
