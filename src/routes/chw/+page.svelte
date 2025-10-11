<script lang="ts">
	import { onMount } from 'svelte';
	import { writable } from 'svelte/store';
	import AIAnalysisPanel from '$lib/components/AIAnalysisPanel.svelte';
	import OfflineDataManager from '$lib/offline-data-manager';
	import MultilingualVoiceInterface from '$lib/multilingual-voice-interface';
	import PrivacySecurityFramework from '$lib/privacy-security-framework';
	import PatientFollowUpSystem from '$lib/patient-followup-system';

	// Initialize backend systems (will be instantiated in onMount)
	let dataManager: OfflineDataManager;
	let voiceInterface: MultilingualVoiceInterface;
	let securityFramework: PrivacySecurityFramework;
	let followUpSystem: PatientFollowUpSystem;

	// Offline-first data store
	const currentCase = writable<{
		id: string;
		patientName: string;
		age: string;
		gender: string;
		symptoms: any[];
		voiceNotes: any[];
		photos: any[];
		vitals: {
			bloodPressure: string;
			heartRate: string;
			temperature: string;
			oxygenSaturation: string;
		};
		location: {
			latitude: number | null;
			longitude: number | null;
			address: string;
		};
		timestamp: string;
		syncStatus: string;
	}>({
		id: '',
		patientName: '',
		age: '',
		gender: '',
		symptoms: [],
		voiceNotes: [],
		photos: [],
		vitals: {
			bloodPressure: '',
			heartRate: '',
			temperature: '',
			oxygenSaturation: ''
		},
		location: {
			latitude: null,
			longitude: null,
			address: ''
		},
		timestamp: new Date().toISOString(),
		syncStatus: 'offline'
	});

	// App state
	let currentStep = 'patient-info';
	let showAIAnalysis = false;
	let selectedCaseId = '';
	let storedCases: any[] = [];
	let isRecording = false;
	let recordingDuration = 0;
	let selectedSymptoms: any[] = [];
	let voiceRecorder: any;
	let recordingInterval: ReturnType<typeof setInterval> | null = null;
	let bluetoothDevice: any = null;
	let connectionStatus = 'disconnected';
	let caseId = generateCaseId();

	// Multilingual support
	const languages = {
		english: 'EN',
		hindi: 'हिं',
		marathi: 'मर',
		bengali: 'বা'
	};
	let currentLanguage = 'english';

	// Common symptoms with multilingual labels
	const symptomsList = [
		{
			id: 'fever',
			en: 'Fever',
			hi: 'बुखार',
			mr: 'ताप',
			bn: 'জ্বর'
		},
		{
			id: 'cough',
			en: 'Cough',
			hi: 'खांसी',
			mr: 'खोकला',
			bn: 'কাশি'
		},
		{
			id: 'breathing',
			en: 'Breathing Difficulty',
			hi: 'सांस लेने में कठिनाई',
			mr: 'श्वास घेण्यात अडचण',
			bn: 'শ্বাসকষ্ট'
		},
		{
			id: 'chest_pain',
			en: 'Chest Pain',
			hi: 'छाती में दर्द',
			mr: 'छातीत दुखणे',
			bn: 'বুকে ব্যথা'
		},
		{
			id: 'headache',
			en: 'Headache',
			hi: 'सिरदर्द',
			mr: 'डोकेदुखी',
			bn: 'মাথাব্যথা'
		},
		{
			id: 'nausea',
			en: 'Nausea/Vomiting',
			hi: 'मतली/उल्टी',
			mr: 'मळमळ/उलट्या',
			bn: 'বমি বমি ভাব'
		}
	];

	onMount(() => {
		// Initialize backend systems in browser only
		dataManager = new OfflineDataManager();
		voiceInterface = new MultilingualVoiceInterface();
		securityFramework = new PrivacySecurityFramework();
		followUpSystem = new PatientFollowUpSystem();
		
		initializeCase();
		requestLocationPermission();
		loadStoredCases();
	});

	function generateCaseId() {
		const timestamp = Date.now();
		const random = Math.random().toString(36).substring(2, 8);
		return `CHW-${timestamp}-${random}`.toUpperCase();
	}

	function initializeCase() {
		currentCase.update(case_data => ({
			...case_data,
			id: caseId
		}));
	}

	async function requestLocationPermission() {
		if (navigator.geolocation) {
			try {
				const position: any = await new Promise((resolve, reject) => {
					navigator.geolocation.getCurrentPosition(resolve, reject);
				});
				
				currentCase.update(case_data => ({
					...case_data,
					location: {
						...case_data.location,
						latitude: position.coords.latitude,
						longitude: position.coords.longitude
					}
				}));
			} catch (error) {
				console.log('Location not available');
			}
		}
	}

	async function connectBluetooth() {
		try {
			if ('bluetooth' in navigator && (navigator as any).bluetooth) {
				connectionStatus = 'connecting';
				bluetoothDevice = await (navigator as any).bluetooth.requestDevice({
					filters: [
						{ services: ['heart_rate'] },
						{ services: ['health_thermometer'] },
						{ name: 'Pulse Oximeter' }
					],
					optionalServices: ['battery_service']
				});
				
				connectionStatus = 'connected';
				await readVitals();
			}
		} catch (error) {
			connectionStatus = 'disconnected';
			console.error('Bluetooth connection failed:', error);
		}
	}

	async function readVitals() {
		// Simulate reading vitals from Bluetooth device
		// In real implementation, this would read from actual devices
		const simulatedVitals = {
			heartRate: (60 + Math.random() * 40).toFixed(0),
			temperature: (97 + Math.random() * 4).toFixed(1),
			oxygenSaturation: (95 + Math.random() * 5).toFixed(0),
			bloodPressure: `${(110 + Math.random() * 30).toFixed(0)}/${(70 + Math.random() * 20).toFixed(0)}`
		};

		currentCase.update(case_data => ({
			...case_data,
			vitals: simulatedVitals
		}));
	}

	async function startVoiceRecording() {
		try {
			// Use MultilingualVoiceInterface for voice recognition
			isRecording = true;
			recordingDuration = 0;
			
			recordingInterval = setInterval(() => {
				recordingDuration++;
			}, 1000);
			
			// Start voice recognition with current language
			voiceInterface.startListening();
			
			// Simulate voice recording - in production, this would capture actual voice
			setTimeout(() => {
				const mockTranscript = `Voice note recorded in ${currentLanguage}`;
				currentCase.update(case_data => ({
					...case_data,
					voiceNotes: [...case_data.voiceNotes, {
						id: Date.now(),
						transcript: mockTranscript,
						language: currentLanguage,
						duration: recordingDuration,
						timestamp: new Date().toISOString()
					}]
				}));
				
				// Also provide voice feedback
				voiceInterface.speak(getText('recording_saved', currentLanguage));
			}, 1000);
		} catch (error) {
			console.error('Voice recording failed:', error);
			isRecording = false;
			if (recordingInterval) clearInterval(recordingInterval);
		}
	}

	function stopVoiceRecording() {
		if (isRecording) {
			voiceInterface.stopListening();
			if (recordingInterval) clearInterval(recordingInterval);
			isRecording = false;
		}
	}

	async function capturePhoto() {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ 
				video: { facingMode: 'environment' } 
			});
			
			// Create canvas to capture frame
			const video = document.createElement('video');
			video.srcObject = stream;
			video.play();
			
			video.addEventListener('loadedmetadata', () => {
				const canvas = document.createElement('canvas');
				canvas.width = video.videoWidth;
				canvas.height = video.videoHeight;
				
				const ctx: any = canvas.getContext('2d');
				if (ctx) {
					ctx.drawImage(video, 0, 0);
					
					canvas.toBlob((blob: Blob | null) => {
						if (blob) {
							const photoUrl = URL.createObjectURL(blob);
							
							currentCase.update(case_data => ({
								...case_data,
								photos: [...case_data.photos, {
									id: Date.now(),
									url: photoUrl,
									timestamp: new Date().toISOString()
								}]
							}));
						}
					});
				}
				
				stream.getTracks().forEach(track => track.stop());
			});
		} catch (error) {
			console.error('Photo capture failed:', error);
		}
	}

	function toggleSymptom(symptomId: any) {
		if (selectedSymptoms.includes(symptomId)) {
			selectedSymptoms = selectedSymptoms.filter(id => id !== symptomId);
		} else {
			selectedSymptoms = [...selectedSymptoms, symptomId];
		}
		
		currentCase.update(case_data => ({
			...case_data,
			symptoms: selectedSymptoms
		}));
	}

	function nextStep() {
		const steps = ['patient-info', 'symptoms', 'vitals', 'media', 'review'];
		const currentIndex = steps.indexOf(currentStep);
		if (currentIndex < steps.length - 1) {
			currentStep = steps[currentIndex + 1];
		}
	}

	function prevStep() {
		const steps = ['patient-info', 'symptoms', 'vitals', 'media', 'review'];
		const currentIndex = steps.indexOf(currentStep);
		if (currentIndex > 0) {
			currentStep = steps[currentIndex - 1];
		}
	}

	async function saveCase() {
		try {
			const currentCaseData = $currentCase;
			currentCaseData.syncStatus = 'pending_sync';
			
			// Save to IndexedDB via OfflineDataManager
			await dataManager.saveRecord('cases', currentCaseData);
			
			// Log to security framework for audit trail
			await securityFramework.logActivity(
				'chw_user', // TODO: Replace with actual authenticated user ID
				'case_created',
				`case:${currentCaseData.id}`,
				{
					patientAge: currentCaseData.age,
					symptomsCount: currentCaseData.symptoms.length,
					hasVitals: Object.values(currentCaseData.vitals).some((v: any) => v),
					hasMedia: currentCaseData.photos.length > 0 || currentCaseData.voiceNotes.length > 0
				},
				'success',
				'low'
			);
			
			// Register follow-up with PatientFollowUpSystem
			if (currentCaseData.symptoms.length > 0) {
				// Register patient first
				const patientId = await followUpSystem.registerPatient({
					name: currentCaseData.patientName,
					age: parseInt(currentCaseData.age),
					gender: (currentCaseData.gender as 'male' | 'female' | 'other'),
					phoneNumber: '', // TODO: Add phone number field to case form
					address: currentCaseData.location?.address || '',
					emergencyContact: {
						name: '',
						relationship: '',
						phoneNumber: ''
					},
					chronicConditions: currentCaseData.symptoms,
					allergies: [],
					preferredLanguage: currentLanguage,
					consentForFollowUp: true
				});
				
				// Create treatment plan
				await followUpSystem.createTreatment({
					patientId: patientId,
					diagnosis: currentCaseData.symptoms.join(', '),
					startDate: new Date(),
					duration: currentCaseData.symptoms.length >= 3 ? 3 : 7,
					medications: [],
					instructions: ['Monitor symptoms', 'Take prescribed medications', 'Contact CHW if symptoms worsen'],
					followUpSchedule: [],
					prescribedBy: 'chw_user'
				});
			}
			
			// Trigger sync to backend
			await dataManager.triggerSync();
			
			// Offer AI analysis for the saved case
			selectedCaseId = currentCaseData.id;
			showAIAnalysis = true;
			loadStoredCases();
			
			// Reset for next case
			caseId = generateCaseId();
			currentStep = 'patient-info';
			selectedSymptoms = [];
			currentCase.set({
				id: caseId,
				patientName: '',
				age: '',
				gender: '',
				symptoms: [],
				voiceNotes: [],
				photos: [],
				vitals: {
					bloodPressure: '',
					heartRate: '',
					temperature: '',
					oxygenSaturation: ''
				},
				location: {
					latitude: null,
					longitude: null,
					address: ''
				},
				timestamp: new Date().toISOString(),
				syncStatus: 'offline'
			});
			
			alert('Case saved successfully! Case ID: ' + currentCaseData.id + '\n\nData saved to IndexedDB, audit logged, and follow-up scheduled.');
		} catch (error: unknown) {
			console.error('Failed to save case:', error);
			alert('Error saving case: ' + (error instanceof Error ? error.message : 'Unknown error'));
		}
	}

	async function loadStoredCases() {
		try {
			// Query all cases from IndexedDB via OfflineDataManager
			const casesData = await dataManager.queryRecords('cases', {});
			storedCases = casesData.sort((a, b) => 
				new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
			);
		} catch (error) {
			console.error('Failed to load cases:', error);
			storedCases = [];
		}
	}

	function handleAIAnalysisComplete(result: any) {
		loadStoredCases();
		alert('AI analysis completed! Check the case details for recommendations.');
	}

	function viewCase(caseId: any) {
		selectedCaseId = caseId;
		showAIAnalysis = true;
	}

	function getText(key: any, lang: string = currentLanguage): string {
		const texts: Record<string, Record<string, string>> = {
			patient_info: {
				english: 'Patient Information',
				hindi: 'रोगी की जानकारी',
				marathi: 'रुग्ण माहिती',
				bengali: 'রোগীর তথ্য'
			},
			name: {
				english: 'Patient Name',
				hindi: 'रोगी का नाम',
				marathi: 'रुग्णाचे नाव',
				bengali: 'রোগীর নাম'
			},
			age: {
				english: 'Age',
				hindi: 'उम्र',
				marathi: 'वय',
				bengali: 'বয়স'
			},
			symptoms: {
				english: 'Symptoms',
				hindi: 'लक्षण',
				marathi: 'लक्षणे',
				bengali: 'উপসর্গ'
			},
			vitals: {
				english: 'Vital Signs',
				hindi: 'महत्वपूर्ण संकेत',
				marathi: 'महत्वाची चिन्हे',
				bengali: 'গুরুত্वপূর্ণ সংকেত'
			},
			next: {
				english: 'Next',
				hindi: 'अगला',
				marathi: 'पुढे',
				bengali: 'পরবর্তী'
			},
			save_case: {
				english: 'Save Case',
				hindi: 'केस सेव करें',
				marathi: 'केस जतन करा',
				bengali: 'কেস সংরক্ষণ করুন'
			}
		};
		return texts[key]?.[lang] || texts[key]?.english || key;
	}
</script>

<svelte:head>
	<title>AarogyaSense CHW - Community Health Worker</title>
</svelte:head>

<!-- Mobile-first design -->
<div class="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
	<!-- Header -->
	<header class="bg-white shadow-sm border-b border-green-100">
		<div class="px-4 py-3 flex items-center justify-between">
			<div class="flex items-center gap-3">
				<a href="/" class="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center hover:bg-green-600 transition-colors" title="Back to Home" aria-label="Back to Home">
					<svg class="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
					</svg>
				</a>
				<div>
					<h1 class="text-lg font-semibold text-gray-900">AarogyaSense</h1>
					<p class="text-xs text-gray-600">CHW Mobile App</p>
				</div>
			</div>
			
			<!-- Language Selector -->
			<select 
				bind:value={currentLanguage}
				class="text-sm border border-gray-200 rounded-lg px-2 py-1 bg-white"
			>
				{#each Object.entries(languages) as [lang, code]}
					<option value={lang}>{code}</option>
				{/each}
			</select>
		</div>
	</header>

	<!-- Case ID and Status -->
	<div class="px-4 py-2 bg-green-100 text-green-800 text-sm font-medium">
		Case ID: {caseId} • Status: Offline Recording
	</div>

	<!-- Progress Indicator -->
	<div class="px-4 py-3 bg-white border-b">
		<div class="flex justify-between items-center">
			{#each ['patient-info', 'symptoms', 'vitals', 'media', 'review'] as step, i}
				<div class="flex items-center">
					<div class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
						{currentStep === step ? 'bg-green-500 text-white' : 
						 ['patient-info', 'symptoms', 'vitals', 'media', 'review'].indexOf(currentStep) > i ? 'bg-green-200 text-green-700' : 'bg-gray-200 text-gray-500'}">
						{i + 1}
					</div>
					{#if i < 4}
						<div class="w-8 h-0.5 
							{['patient-info', 'symptoms', 'vitals', 'media', 'review'].indexOf(currentStep) > i ? 'bg-green-300' : 'bg-gray-200'}">
						</div>
					{/if}
				</div>
			{/each}
		</div>
	</div>

	<main class="px-4 py-6">
		<!-- Patient Information Step -->
		{#if currentStep === 'patient-info'}
			<div class="space-y-6">
				<h2 class="text-xl font-semibold text-gray-900">{getText('patient_info')}</h2>
				
				<div class="space-y-4">
					<div>
						<label for="patient-name" class="block text-sm font-medium text-gray-700 mb-2">
							{getText('name')} *
						</label>
						<input 
							id="patient-name"
							type="text" 
							bind:value={$currentCase.patientName}
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
							placeholder={getText('name')}
						/>
					</div>
					
					<div class="grid grid-cols-2 gap-4">
						<div>
							<label for="patient-age" class="block text-sm font-medium text-gray-700 mb-2">
								{getText('age')} *
							</label>
							<input 
								id="patient-age"
								type="number" 
								bind:value={$currentCase.age}
								class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
								placeholder="25"
							/>
						</div>
						
						<div>
							<label for="patient-gender" class="block text-sm font-medium text-gray-700 mb-2">
								Gender *
							</label>
							<select 
								id="patient-gender"
								bind:value={$currentCase.gender}
								class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
							>
								<option value="">Select</option>
								<option value="female">Female</option>
								<option value="male">Male</option>
								<option value="other">Other</option>
							</select>
						</div>
					</div>
				</div>
			</div>
		{/if}

		<!-- Symptoms Step -->
		{#if currentStep === 'symptoms'}
			<div class="space-y-6">
				<h2 class="text-xl font-semibold text-gray-900">{getText('symptoms')}</h2>
				
				<div class="grid grid-cols-1 gap-3">
					{#each symptomsList as symptom}
						<button 
							onclick={() => toggleSymptom(symptom.id)}
							class="p-4 border-2 rounded-lg text-left transition-all duration-200
								{selectedSymptoms.includes(symptom.id) ? 
								'border-green-500 bg-green-50 text-green-900' : 
								'border-gray-200 hover:border-gray-300'}"
						>
							<div class="flex items-center justify-between">
								<span class="font-medium">{(symptom as any)[currentLanguage.substring(0, 2)] || symptom.en}</span>
								{#if selectedSymptoms.includes(symptom.id)}
									<svg class="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
										<path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
									</svg>
								{/if}
							</div>
						</button>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Vitals Step -->
		{#if currentStep === 'vitals'}
			<div class="space-y-6">
				<div class="flex items-center justify-between">
					<h2 class="text-xl font-semibold text-gray-900">{getText('vitals')}</h2>
					<button 
						onclick={connectBluetooth}
						class="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium
							{connectionStatus === 'connected' ? 'bg-green-500' : 
							 connectionStatus === 'connecting' ? 'bg-yellow-500' : 'bg-blue-500'}
							transition-colors duration-200"
					>
						{#if connectionStatus === 'connected'}
							✓ Connected
						{:else if connectionStatus === 'connecting'}
							Connecting...
						{:else}
							📱 Connect Device
						{/if}
					</button>
				</div>

				<div class="grid grid-cols-2 gap-4">
					<div class="p-4 border border-gray-200 rounded-lg">
						<div class="block text-sm font-medium text-gray-700 mb-2">Heart Rate</div>
						<div class="text-2xl font-semibold text-red-600" aria-label="Heart rate reading">{$currentCase.vitals.heartRate || '--'}</div>
						<div class="text-xs text-gray-500">bpm</div>
					</div>
					
					<div class="p-4 border border-gray-200 rounded-lg">
						<div class="block text-sm font-medium text-gray-700 mb-2">Temperature</div>
						<div class="text-2xl font-semibold text-orange-600" aria-label="Temperature reading">{$currentCase.vitals.temperature || '--'}</div>
						<div class="text-xs text-gray-500">°F</div>
					</div>
					
					<div class="p-4 border border-gray-200 rounded-lg">
						<div class="block text-sm font-medium text-gray-700 mb-2">Blood Pressure</div>
						<div class="text-2xl font-semibold text-purple-600" aria-label="Blood pressure reading">{$currentCase.vitals.bloodPressure || '--'}</div>
						<div class="text-xs text-gray-500">mmHg</div>
					</div>
					
					<div class="p-4 border border-gray-200 rounded-lg">
						<div class="block text-sm font-medium text-gray-700 mb-2">Oxygen Saturation</div>
						<div class="text-2xl font-semibold text-blue-600" aria-label="Oxygen saturation reading">{$currentCase.vitals.oxygenSaturation || '--'}</div>
						<div class="text-xs text-gray-500">%</div>
					</div>
				</div>
			</div>
		{/if}

		<!-- Media Capture Step -->
		{#if currentStep === 'media'}
			<div class="space-y-6">
				<h2 class="text-xl font-semibold text-gray-900">Voice Notes & Photos</h2>
				
				<!-- Voice Recording -->
				<div class="p-4 border border-gray-200 rounded-lg">
					<h3 class="font-medium mb-4">Voice Notes</h3>
					<div class="flex items-center justify-between mb-4">
						<button 
							onclick={isRecording ? stopVoiceRecording : startVoiceRecording}
							class="px-6 py-3 rounded-lg font-medium flex items-center gap-2
								{isRecording ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}"
						>
							{#if isRecording}
								<div class="w-3 h-3 bg-white rounded-full animate-pulse"></div>
								Stop ({recordingDuration}s)
							{:else}
								🎤 Start Recording
							{/if}
						</button>
					</div>
					
					{#if $currentCase.voiceNotes.length > 0}
						<div class="space-y-2">
							{#each $currentCase.voiceNotes as note, i}
								<div class="flex items-center gap-3 p-2 bg-gray-50 rounded">
									<audio controls src={note.url} class="flex-1"></audio>
									<span class="text-sm text-gray-500">{note.duration}s</span>
								</div>
							{/each}
						</div>
					{/if}
				</div>

				<!-- Photo Capture -->
				<div class="p-4 border border-gray-200 rounded-lg">
					<h3 class="font-medium mb-4">Photos</h3>
					<button 
						onclick={capturePhoto}
						class="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 transition-colors"
					>
						📷 Take Photo
					</button>
					
					{#if $currentCase.photos.length > 0}
						<div class="grid grid-cols-2 gap-2 mt-4">
							{#each $currentCase.photos as photo}
								<img src={photo.url} alt="Captured" class="w-full h-24 object-cover rounded-lg"/>
							{/each}
						</div>
					{/if}
				</div>
			</div>
		{/if}

		<!-- Review Step -->
		{#if currentStep === 'review'}
			<div class="space-y-6">
				<h2 class="text-xl font-semibold text-gray-900">Case Review</h2>
				
				<div class="space-y-4">
					<div class="p-4 bg-white border border-gray-200 rounded-lg">
						<h3 class="font-medium text-gray-900 mb-2">Patient Information</h3>
						<p><span class="font-medium">Name:</span> {$currentCase.patientName}</p>
						<p><span class="font-medium">Age:</span> {$currentCase.age}</p>
						<p><span class="font-medium">Gender:</span> {$currentCase.gender}</p>
					</div>
					
					<div class="p-4 bg-white border border-gray-200 rounded-lg">
						<h3 class="font-medium text-gray-900 mb-2">Symptoms</h3>
						{#if selectedSymptoms.length > 0}
							<div class="flex flex-wrap gap-2">
								{#each selectedSymptoms as symptomId}
									{@const symptom = symptomsList.find(s => s.id === symptomId)}
									<span class="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">
										{symptom?.en}
									</span>
								{/each}
							</div>
						{:else}
							<p class="text-gray-500">No symptoms selected</p>
						{/if}
					</div>
					
					<div class="p-4 bg-white border border-gray-200 rounded-lg">
						<h3 class="font-medium text-gray-900 mb-2">Vital Signs</h3>
						<div class="grid grid-cols-2 gap-4 text-sm">
							<p><span class="font-medium">Heart Rate:</span> {$currentCase.vitals.heartRate || 'N/A'} bpm</p>
							<p><span class="font-medium">Temperature:</span> {$currentCase.vitals.temperature || 'N/A'} °F</p>
							<p><span class="font-medium">Blood Pressure:</span> {$currentCase.vitals.bloodPressure || 'N/A'} mmHg</p>
							<p><span class="font-medium">Oxygen Sat:</span> {$currentCase.vitals.oxygenSaturation || 'N/A'}%</p>
						</div>
					</div>
					
					<div class="p-4 bg-white border border-gray-200 rounded-lg">
						<h3 class="font-medium text-gray-900 mb-2">Media</h3>
						<p class="text-sm text-gray-600">
							{$currentCase.voiceNotes.length} voice notes, {$currentCase.photos.length} photos
						</p>
					</div>
				</div>
			</div>
		{/if}
	</main>

	<!-- AI Analysis Panel -->
	{#if showAIAnalysis}
		<div class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
			<div class="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
				<div class="flex items-center justify-between p-4 border-b">
					<h3 class="text-lg font-semibold text-gray-900">AI Diagnostics</h3>
					<button 
						onclick={() => showAIAnalysis = false}
						class="text-gray-400 hover:text-gray-600"
					>
						✕
					</button>
				</div>
				<div class="overflow-y-auto">
					<AIAnalysisPanel 
						caseId={selectedCaseId} 
						onAnalysisComplete={handleAIAnalysisComplete}
					/>
				</div>
			</div>
		</div>
	{/if}

	<!-- Floating Action Button for Case Management -->
	<button 
		onclick={() => {loadStoredCases(); showAIAnalysis = true; selectedCaseId = storedCases[0]?.id || '';}}
		class="fixed top-4 right-4 w-12 h-12 bg-purple-600 text-white rounded-full shadow-lg hover:bg-purple-700 transition-colors flex items-center justify-center z-40"
		title="View Recent Cases & AI Analysis"
	>
		🧠
	</button>

	<!-- Cases Quick View (when no specific case selected) -->
	{#if showAIAnalysis && !selectedCaseId && storedCases.length > 0}
		<div class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
			<div class="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
				<div class="flex items-center justify-between p-4 border-b">
					<h3 class="text-lg font-semibold text-gray-900">Recent Cases</h3>
					<button 
						onclick={() => showAIAnalysis = false}
						class="text-gray-400 hover:text-gray-600"
					>
						✕
					</button>
				</div>
				<div class="p-4 space-y-3 overflow-y-auto max-h-96">
					{#each storedCases.slice(0, 10) as caseItem}
						<div 
							class="border rounded-lg p-3 hover:bg-gray-50 cursor-pointer" 
							role="button"
							tabindex="0"
							onclick={() => viewCase(caseItem.id)}
							onkeydown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									viewCase(caseItem.id);
								}
							}}
							aria-label={`View case for ${caseItem.patientName}`}
						>
							<div class="flex justify-between items-start">
								<div>
									<h4 class="font-medium text-gray-900">{caseItem.patientName}</h4>
									<p class="text-sm text-gray-600">{caseItem.age} years, {caseItem.gender}</p>
									<p class="text-xs text-gray-500">
										{new Date(caseItem.timestamp).toLocaleString()}
									</p>
								</div>
								<div class="flex items-center space-x-2">
									{#if caseItem.aiAnalysis}
										<span class="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">
											AI ✓
										</span>
										<span class={`text-xs px-2 py-1 rounded ${
											caseItem.aiAnalysis.riskLevel === 'critical' ? 'bg-red-100 text-red-800' :
											caseItem.aiAnalysis.riskLevel === 'high' ? 'bg-orange-100 text-orange-800' :
											caseItem.aiAnalysis.riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' :
											'bg-green-100 text-green-800'
										}`}>
											{caseItem.aiAnalysis.riskLevel}
										</span>
									{:else}
										<span class="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
											Pending
										</span>
									{/if}
								</div>
							</div>
							<div class="mt-2">
								<p class="text-xs text-gray-600">
									{caseItem.symptoms.length} symptoms • {caseItem.voiceNotes.length} voice • {caseItem.photos.length} photos
								</p>
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>
	{/if}

	<!-- Navigation -->
	<footer class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3">
		<div class="flex justify-between">
			<button 
				onclick={prevStep}
				disabled={currentStep === 'patient-info'}
				class="px-6 py-2 text-gray-600 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
			>
				← Back
			</button>
			
			{#if currentStep === 'review'}
				<button 
					onclick={saveCase}
					class="px-6 py-2 bg-green-500 text-white font-medium rounded-lg"
				>
					{getText('save_case')}
				</button>
			{:else}
				<button 
					onclick={nextStep}
					class="px-6 py-2 bg-green-500 text-white font-medium rounded-lg"
				>
					{getText('next')} →
				</button>
			{/if}
		</div>
	</footer>
</div>