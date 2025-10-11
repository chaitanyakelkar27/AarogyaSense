<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { authStore } from '$lib/stores/auth-store';
	import { apiClient } from '$lib/api-client';
	import { analyzeImage, loadImage } from '$lib/ai/image-analyzer';
	import { analyzeAudio, recordAudio } from '$lib/ai/voice-analyzer';
	import { calculateRiskScore } from '$lib/ai/risk-scorer';
	import type { RiskAssessment } from '$lib/ai/risk-scorer';

	// Auth check
	onMount(() => {
		const unsubscribe = authStore.subscribe(state => {
			if (!state.isAuthenticated && !state.isLoading) {
				goto('/auth');
			}
		});
		return unsubscribe;
	});

	// Patient Info
	let patientName = '';
	let patientAge: number | '' = '';
	let patientGender = 'male';
	let patientPhone = '';
	let patientVillage = '';
	let emergencyContact = '';

	// Symptoms
	let selectedSymptoms: string[] = [];
	const symptomOptions = [
		'fever', 'cough', 'difficulty breathing', 'headache', 'body ache',
		'sore throat', 'nausea', 'vomiting', 'diarrhea', 'chest pain',
		'fatigue', 'loss of appetite', 'rash', 'joint pain', 'dizziness'
	];

	// Vital Signs
	let temperature: number | '' = '';
	let bloodPressure = '';
	let heartRate: number | '' = '';
	let oxygenSaturation: number | '' = '';
	let respiratoryRate: number | '' = '';

	// Media Capture
	let capturedImages: { file: File; dataUrl: string; analysis?: any }[] = [];
	let capturedAudio: { blob: Blob; dataUrl: string; analysis?: any } | null = null;
	let isRecording = false;
	let recordingDuration = 0;
	let recordingInterval: any = null;

	// Camera
	let videoElement: HTMLVideoElement;
	let canvasElement: HTMLCanvasElement;
	let stream: MediaStream | null = null;
	let isCameraActive = false;

	// AI Analysis
	let riskAssessment: RiskAssessment | null = null;
	let isAnalyzing = false;

	// Form State
	let isSaving = false;
	let saveMessage = '';
	let notes = '';

	// Camera Functions
	async function startCamera() {
		try {
			stream = await navigator.mediaDevices.getUserMedia({ 
				video: { 
					facingMode: 'environment',
					width: { ideal: 1280 },
					height: { ideal: 720 }
				} 
			});
			if (videoElement) {
				videoElement.srcObject = stream;
				isCameraActive = true;
			}
		} catch (error) {
			console.error('Camera error:', error);
			alert('Failed to access camera. Please check permissions.');
		}
	}

	async function captureImage() {
		if (!videoElement || !canvasElement) return;

		const context = canvasElement.getContext('2d');
		if (!context) return;

		canvasElement.width = videoElement.videoWidth;
		canvasElement.height = videoElement.videoHeight;
		context.drawImage(videoElement, 0, 0);

		canvasElement.toBlob(async (blob) => {
			if (!blob) return;

			const file = new File([blob], `image-${Date.now()}.jpg`, { type: 'image/jpeg' });
			const dataUrl = await readFileAsDataURL(file);

			// Analyze image
			const img = await loadImage(dataUrl);
			const analysis = await analyzeImage(img);

			capturedImages = [...capturedImages, { file, dataUrl, analysis }];
		}, 'image/jpeg', 0.9);
	}

	function stopCamera() {
		if (stream) {
			stream.getTracks().forEach(track => track.stop());
			stream = null;
			isCameraActive = false;
		}
	}

	function removeImage(index: number) {
		capturedImages = capturedImages.filter((_, i) => i !== index);
	}

	// Audio Functions
	async function startRecording() {
		try {
			isRecording = true;
			recordingDuration = 0;
			
			// Start duration counter
			recordingInterval = setInterval(() => {
				recordingDuration++;
			}, 1000);

			// Record 10 seconds
			const audioBlob = await recordAudio(10000);
			
			clearInterval(recordingInterval);
			isRecording = false;

			// Analyze audio
			const analysis = await analyzeAudio(audioBlob);
			const dataUrl = URL.createObjectURL(audioBlob);

			capturedAudio = { blob: audioBlob, dataUrl, analysis };

		} catch (error) {
			console.error('Recording error:', error);
			alert('Failed to record audio. Please check microphone permissions.');
			isRecording = false;
			clearInterval(recordingInterval);
		}
	}

	function removeAudio() {
		if (capturedAudio?.dataUrl) {
			URL.revokeObjectURL(capturedAudio.dataUrl);
		}
		capturedAudio = null;
	}

	// Risk Analysis
	function calculateRisk() {
		if (selectedSymptoms.length === 0) {
			alert('Please select at least one symptom');
			return;
		}

		isAnalyzing = true;

		// Gather vital signs
		const vitalSigns: any = {};
		if (temperature) vitalSigns.temperature = Number(temperature);
		if (bloodPressure) vitalSigns.bloodPressure = bloodPressure;
		if (heartRate) vitalSigns.heartRate = Number(heartRate);
		if (oxygenSaturation) vitalSigns.oxygenSaturation = Number(oxygenSaturation);
		if (respiratoryRate) vitalSigns.respiratoryRate = Number(respiratoryRate);

		// Get AI predictions
		const imageAnalysis = capturedImages[0]?.analysis;
		const audioAnalysis = capturedAudio?.analysis;

		const aiConfidence = imageAnalysis?.confidence || audioAnalysis?.confidence || 0;
		const aiPrediction = imageAnalysis?.condition || audioAnalysis?.condition;

		// Calculate risk
		riskAssessment = calculateRiskScore({
			symptoms: selectedSymptoms,
			vitalSigns: Object.keys(vitalSigns).length > 0 ? vitalSigns : undefined,
			age: typeof patientAge === 'number' ? patientAge : undefined,
			aiConfidence: aiConfidence > 0 ? aiConfidence : undefined,
			aiPrediction
		});

		isAnalyzing = false;
	}

	// Save Case
	async function saveCase() {
		if (!patientName || !patientAge || selectedSymptoms.length === 0) {
			alert('Please fill in patient name, age, and select at least one symptom');
			return;
		}

		// Calculate risk if not done
		if (!riskAssessment) {
			calculateRisk();
		}

		isSaving = true;
		saveMessage = '';

		try {
			// Save images to localStorage
			const imageUrls = await Promise.all(
				capturedImages.map(async (img, idx) => {
					const key = `image_${Date.now()}_${idx}`;
					localStorage.setItem(key, img.dataUrl);
					return key;
				})
			);

			// Save audio to localStorage
			let audioUrl = '';
			if (capturedAudio && capturedAudio.blob) {
				const key = `audio_${Date.now()}`;
				const reader = new FileReader();
				const audioDataUrl = await new Promise<string>((resolve) => {
					reader.onloadend = () => resolve(reader.result as string);
					reader.readAsDataURL(capturedAudio!.blob);
				});
				localStorage.setItem(key, audioDataUrl);
				audioUrl = key;
			}

			// Create case
			const caseData = {
				patient: {
					name: patientName,
					age: Number(patientAge),
					gender: patientGender,
					phone: patientPhone || undefined,
					village: patientVillage || undefined,
					emergencyContact: emergencyContact || undefined
				},
				symptoms: selectedSymptoms.join(', '),
				vitalSigns: {
					temperature: temperature || undefined,
					bloodPressure: bloodPressure || undefined,
					heartRate: heartRate || undefined,
					oxygenSaturation: oxygenSaturation || undefined,
					respiratoryRate: respiratoryRate || undefined
				},
				images: imageUrls,
				audioRecordings: audioUrl ? [audioUrl] : [],
				notes: notes || undefined
			};

			const result = await apiClient.cases.create(caseData);

			saveMessage = `✅ Case saved successfully! ID: ${result.id}`;

			// Send alert if high risk
			if (riskAssessment && (riskAssessment.level === 'HIGH' || riskAssessment.level === 'CRITICAL')) {
				try {
					await apiClient.alerts.create({
						caseId: result.id,
						recipientId: $authStore.user?.id || '',
						level: riskAssessment.level,
						message: `${riskAssessment.level} RISK: Patient ${patientName} requires attention. Risk score: ${riskAssessment.score}/100`,
						channels: ['sms']
					});
				} catch (alertError) {
					console.error('Failed to send alert:', alertError);
				}
			}

			// Reset form after 2 seconds
			setTimeout(() => {
				resetForm();
			}, 2000);

		} catch (error: any) {
			console.error('Save error:', error);
			saveMessage = `❌ Failed to save: ${error.message || 'Unknown error'}`;
		} finally {
			isSaving = false;
		}
	}

	function resetForm() {
		patientName = '';
		patientAge = '';
		patientGender = 'male';
		patientPhone = '';
		patientVillage = '';
		emergencyContact = '';
		selectedSymptoms = [];
		temperature = '';
		bloodPressure = '';
		heartRate = '';
		oxygenSaturation = '';
		respiratoryRate = '';
		notes = '';
		capturedImages = [];
		capturedAudio = null;
		riskAssessment = null;
		saveMessage = '';
	}

	function readFileAsDataURL(file: File): Promise<string> {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => resolve(reader.result as string);
			reader.onerror = reject;
			reader.readAsDataURL(file);
		});
	}

	onMount(() => {
		return () => {
			stopCamera();
			if (recordingInterval) clearInterval(recordingInterval);
		};
	});
</script>

<div class="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-8 px-4">
	<div class="mx-auto max-w-4xl">
		<!-- Header -->
		<div class="mb-8 rounded-2xl bg-white p-6 shadow-lg">
			<div class="flex items-center justify-between">
				<div>
					<h1 class="text-3xl font-bold text-gray-900">CHW Field App</h1>
					<p class="mt-1 text-gray-600">Community Health Worker Data Collection</p>
				</div>
				<div class="text-right">
					<p class="text-sm text-gray-600">Logged in as</p>
					<p class="font-semibold text-gray-900">{$authStore.user?.name}</p>
				</div>
			</div>
		</div>

		{#if saveMessage}
			<div class="mb-6 rounded-lg {saveMessage.startsWith('✅') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'} p-4 font-medium">
				{saveMessage}
			</div>
		{/if}

		<form class="space-y-6">
			<!-- Patient Information -->
			<div class="rounded-2xl bg-white p-6 shadow-lg">
				<h2 class="mb-4 text-xl font-bold text-gray-900">Patient Information</h2>
				
				<div class="grid gap-4 md:grid-cols-2">
					<div>
						<label for="name" class="mb-1 block text-sm font-medium text-gray-700">Name *</label>
						<input
							type="text"
							id="name"
							bind:value={patientName}
							required
							class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
							placeholder="Patient's full name"
						/>
					</div>

					<div>
						<label for="age" class="mb-1 block text-sm font-medium text-gray-700">Age *</label>
						<input
							type="number"
							id="age"
							bind:value={patientAge}
							required
							min="0"
							max="120"
							class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
							placeholder="Age in years"
						/>
					</div>

					<div>
						<label for="gender" class="mb-1 block text-sm font-medium text-gray-700">Gender</label>
						<select
							id="gender"
							bind:value={patientGender}
							class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
						>
							<option value="male">Male</option>
							<option value="female">Female</option>
							<option value="other">Other</option>
						</select>
					</div>

					<div>
						<label for="phone" class="mb-1 block text-sm font-medium text-gray-700">Phone</label>
						<input
							type="tel"
							id="phone"
							bind:value={patientPhone}
							class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
							placeholder="+91 9876543210"
						/>
					</div>

					<div>
						<label for="village" class="mb-1 block text-sm font-medium text-gray-700">Village</label>
						<input
							type="text"
							id="village"
							bind:value={patientVillage}
							class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
							placeholder="Village name"
						/>
					</div>

					<div>
						<label for="emergency" class="mb-1 block text-sm font-medium text-gray-700">Emergency Contact</label>
						<input
							type="tel"
							id="emergency"
							bind:value={emergencyContact}
							class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
							placeholder="+91 9876543210"
						/>
					</div>
				</div>
			</div>

			<!-- Symptoms -->
			<div class="rounded-2xl bg-white p-6 shadow-lg">
				<h2 class="mb-4 text-xl font-bold text-gray-900">Symptoms *</h2>
				
				<div class="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
					{#each symptomOptions as symptom}
						<label class="flex items-center gap-2 cursor-pointer rounded-lg border border-gray-200 p-3 transition-colors hover:bg-gray-50 {selectedSymptoms.includes(symptom) ? 'bg-blue-50 border-blue-300' : ''}">
							<input
								type="checkbox"
								value={symptom}
								bind:group={selectedSymptoms}
								class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
							/>
							<span class="text-sm font-medium text-gray-700 capitalize">{symptom}</span>
						</label>
					{/each}
				</div>
			</div>

			<!-- Vital Signs -->
			<div class="rounded-2xl bg-white p-6 shadow-lg">
				<h2 class="mb-4 text-xl font-bold text-gray-900">Vital Signs</h2>
				
				<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					<div>
						<label for="temp" class="mb-1 block text-sm font-medium text-gray-700">Temperature (°C)</label>
						<input
							type="number"
							id="temp"
							bind:value={temperature}
							step="0.1"
							class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
							placeholder="37.0"
						/>
					</div>

					<div>
						<label for="bp" class="mb-1 block text-sm font-medium text-gray-700">Blood Pressure</label>
						<input
							type="text"
							id="bp"
							bind:value={bloodPressure}
							class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
							placeholder="120/80"
						/>
					</div>

					<div>
						<label for="hr" class="mb-1 block text-sm font-medium text-gray-700">Heart Rate (bpm)</label>
						<input
							type="number"
							id="hr"
							bind:value={heartRate}
							class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
							placeholder="75"
						/>
					</div>

					<div>
						<label for="spo2" class="mb-1 block text-sm font-medium text-gray-700">Oxygen Saturation (%)</label>
						<input
							type="number"
							id="spo2"
							bind:value={oxygenSaturation}
							min="0"
							max="100"
							class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
							placeholder="98"
						/>
					</div>

					<div>
						<label for="rr" class="mb-1 block text-sm font-medium text-gray-700">Respiratory Rate</label>
						<input
							type="number"
							id="rr"
							bind:value={respiratoryRate}
							class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
							placeholder="16"
						/>
					</div>
				</div>
			</div>

			<!-- Camera Capture -->
			<div class="rounded-2xl bg-white p-6 shadow-lg">
				<h2 class="mb-4 text-xl font-bold text-gray-900">📸 Image Capture</h2>
				
				<div class="space-y-4">
					{#if !isCameraActive}
						<button
							type="button"
							onclick={startCamera}
							class="w-full rounded-lg bg-green-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-green-700"
						>
							Start Camera
						</button>
					{:else}
						<div class="space-y-4">
							<!-- Video Preview -->
							<video
								bind:this={videoElement}
								autoplay
								playsinline
								class="w-full rounded-lg bg-black"
							>
								<track kind="captions" />
							</video>
							<canvas bind:this={canvasElement} class="hidden"></canvas>

							<div class="flex gap-3">
								<button
									type="button"
									onclick={captureImage}
									class="flex-1 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-700"
								>
									📷 Capture Photo
								</button>
								<button
									type="button"
									onclick={stopCamera}
									class="rounded-lg bg-gray-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-gray-700"
								>
									Stop Camera
								</button>
							</div>
						</div>
					{/if}

					<!-- Captured Images -->
					{#if capturedImages.length > 0}
						<div class="mt-4 grid gap-4 sm:grid-cols-2">
							{#each capturedImages as image, index}
								<div class="relative rounded-lg border border-gray-200 p-3">
									<img src={image.dataUrl} alt="Captured" class="w-full rounded-lg" />
									
									{#if image.analysis}
										<div class="mt-2 rounded-lg bg-gray-50 p-3 text-sm">
											<p class="font-semibold text-gray-900">{image.analysis.condition}</p>
											<p class="text-gray-600">Confidence: {(image.analysis.confidence * 100).toFixed(1)}%</p>
											<p class="text-gray-600">Severity: {image.analysis.severity}</p>
										</div>
									{/if}

									<button
										type="button"
										onclick={() => removeImage(index)}
										class="absolute top-5 right-5 rounded-full bg-red-600 p-2 text-white hover:bg-red-700"
										aria-label="Remove image"
									>
										✕
									</button>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			</div>

			<!-- Audio Recording -->
			<div class="rounded-2xl bg-white p-6 shadow-lg">
				<h2 class="mb-4 text-xl font-bold text-gray-900">🎙️ Audio Recording</h2>
				
				<div class="space-y-4">
					{#if !capturedAudio}
						{#if !isRecording}
							<button
								type="button"
								onclick={startRecording}
								class="w-full rounded-lg bg-red-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-red-700"
							>
								🎙️ Record Breathing/Cough (10s)
							</button>
						{:else}
							<div class="rounded-lg bg-red-50 p-6 text-center">
								<div class="text-4xl font-bold text-red-600">{recordingDuration}s</div>
								<p class="mt-2 text-gray-600">Recording... Please breathe or cough near the microphone</p>
								<div class="mt-4 flex justify-center">
									<div class="h-2 w-2 animate-ping rounded-full bg-red-600"></div>
								</div>
							</div>
						{/if}
					{:else}
						<div class="rounded-lg border border-gray-200 p-4">
							<audio controls src={capturedAudio.dataUrl} class="w-full"></audio>
							
							{#if capturedAudio.analysis}
								<div class="mt-3 rounded-lg bg-gray-50 p-3 text-sm">
									<p class="font-semibold text-gray-900">{capturedAudio.analysis.condition}</p>
									<p class="text-gray-600">Confidence: {(capturedAudio.analysis.confidence * 100).toFixed(1)}%</p>
									<p class="text-gray-600">Severity: {capturedAudio.analysis.severity}</p>
									{#if capturedAudio.analysis.audioFeatures.breathingRate}
										<p class="text-gray-600">Breathing Rate: {capturedAudio.analysis.audioFeatures.breathingRate} breaths/min</p>
									{/if}
								</div>
							{/if}

							<button
								type="button"
								onclick={removeAudio}
								class="mt-3 w-full rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
							>
								Remove Recording
							</button>
						</div>
					{/if}
				</div>
			</div>

			<!-- Notes -->
			<div class="rounded-2xl bg-white p-6 shadow-lg">
				<h2 class="mb-4 text-xl font-bold text-gray-900">Additional Notes</h2>
				<textarea
					bind:value={notes}
					rows="4"
					class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
					placeholder="Any additional observations or patient history..."
				></textarea>
			</div>

			<!-- Risk Assessment -->
			{#if riskAssessment}
				<div class="rounded-2xl bg-white p-6 shadow-lg">
					<h2 class="mb-4 text-xl font-bold text-gray-900">🤖 AI Risk Assessment</h2>
					
					<div class="space-y-4">
						<div class="flex items-center justify-between rounded-lg bg-gradient-to-r {
							riskAssessment.level === 'CRITICAL' ? 'from-red-500 to-red-600' :
							riskAssessment.level === 'HIGH' ? 'from-orange-500 to-orange-600' :
							riskAssessment.level === 'MEDIUM' ? 'from-yellow-500 to-yellow-600' :
							'from-green-500 to-green-600'
						} p-6 text-white">
							<div>
								<p class="text-sm font-medium opacity-90">Risk Level</p>
								<p class="text-3xl font-bold">{riskAssessment.level}</p>
							</div>
							<div class="text-right">
								<p class="text-sm font-medium opacity-90">Risk Score</p>
								<p class="text-3xl font-bold">{riskAssessment.score}/100</p>
							</div>
						</div>

						<div>
							<p class="mb-2 font-semibold text-gray-900">Risk Factors:</p>
							<ul class="space-y-1">
								{#each riskAssessment.factors as factor}
									<li class="text-sm text-gray-700">• {factor}</li>
								{/each}
							</ul>
						</div>

						<div>
							<p class="mb-2 font-semibold text-gray-900">Recommendations:</p>
							<ul class="space-y-1">
								{#each riskAssessment.recommendations as rec}
									<li class="text-sm text-gray-700">• {rec}</li>
								{/each}
							</ul>
						</div>
					</div>
				</div>
			{/if}

			<!-- Action Buttons -->
			<div class="flex gap-4">
				<button
					type="button"
					onclick={calculateRisk}
					disabled={isAnalyzing || selectedSymptoms.length === 0}
					class="flex-1 rounded-lg bg-purple-600 px-6 py-4 font-semibold text-white transition-colors hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{isAnalyzing ? 'Analyzing...' : '🤖 Calculate Risk Score'}
				</button>

				<button
					type="button"
					onclick={saveCase}
					disabled={isSaving || !patientName || !patientAge || selectedSymptoms.length === 0}
					class="flex-1 rounded-lg bg-blue-600 px-6 py-4 font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{isSaving ? 'Saving...' : '💾 Save Case'}
				</button>
			</div>

			<button
				type="button"
				onclick={resetForm}
				class="w-full rounded-lg border border-gray-300 px-6 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-50"
			>
				Reset Form
			</button>
		</form>
	</div>
</div>
