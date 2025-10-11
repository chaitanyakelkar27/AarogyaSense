<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { authStore } from '$lib/stores/auth-store';
	import { apiClient } from '$lib/api-client';
	import { get } from 'svelte/store';

	let unauthorized = false;
	let loading = false;
	let submitting = false;
	let aiThinking = false;
	let setupError = '';

	// Patient Information
	let patientName = '';
	let patientAge = '';
	let patientGender = 'MALE';
	let patientPhone = '';
	let patientVillage = '';

	// Chat/Conversation State
	type Message = {
		id: string;
		role: 'ai' | 'user';
		text: string;
		timestamp: Date;
		options?: string[];
	};

	type AIMessage = {
		role: 'user' | 'assistant';
		content: string;
	};

	let messages: Message[] = [];
	let conversationHistory: AIMessage[] = [];
	let awaitingResponse = false;
	let userInput = '';
	let showPatientForm = true;
	let diagnosisComplete = false;
	let questionCount = 0;

	// Diagnosis Result
	let diagnosisResult = {
		priority: 0,
		riskLevel: 'LOW' as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
		symptoms: [] as string[],
		recommendations: '',
		needsEscalation: false,
		escalateTo: '' as 'ASHA' | 'CLINICIAN' | '',
		summary: ''
	};

	// AI Functions
	async function callAI(userMessage: string): Promise<void> {
		aiThinking = true;
		
		try {
			// Add user message to conversation history
			conversationHistory.push({
				role: 'user',
				content: userMessage
			});

			// Call backend AI API
			const response = await fetch('/api/ai/chat', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					messages: conversationHistory,
					patientInfo: {
						name: patientName,
						age: patientAge,
						gender: patientGender,
						village: patientVillage
					}
				})
			});

			const data = await response.json();

			if (!response.ok) {
				if (data.setup_required || data.auth_error || data.quota_error) {
					setupError = data.error;
					addMessage('ai', '⚠️ ' + data.error);
					awaitingResponse = false;
					aiThinking = false;
					return;
				}
				throw new Error(data.error || 'AI request failed');
			}

			// Add AI response to conversation history
			conversationHistory.push({
				role: 'assistant',
				content: data.message
			});

			questionCount++;

			// Check if assessment is complete
			if (data.assessment_complete && data.assessment) {
				// AI has completed assessment
				addMessage('ai', data.message);
				
				// Parse assessment
				diagnosisResult = {
					priority: data.assessment.priority || 2,
					riskLevel: data.assessment.risk_level || 'LOW',
					symptoms: data.assessment.symptoms || [],
					recommendations: data.assessment.recommendations || '',
					needsEscalation: data.assessment.needs_escalation || false,
					escalateTo: data.assessment.escalate_to || '',
					summary: `Risk Score: ${data.assessment.risk_score}/100 - ${data.assessment.risk_level} Priority`
				};
				
				setTimeout(() => {
					diagnosisComplete = true;
					awaitingResponse = false;
					aiThinking = false;
				}, 1500);
			} else {
				// Continue conversation
				addMessage('ai', data.message);
				awaitingResponse = true;
				aiThinking = false;
			}

		} catch (error: any) {
			console.error('AI Error:', error);
			addMessage('ai', '❌ Sorry, I encountered an error. Please try again or contact support.');
			awaitingResponse = false;
			aiThinking = false;
		}
	}

	function addMessage(role: 'ai' | 'user', text: string, options?: string[]) {
		messages = [...messages, {
			id: Date.now().toString(),
			role,
			text,
			timestamp: new Date(),
			options
		}];
		
		// Auto-scroll to bottom
		setTimeout(() => {
			const chatContainer = document.getElementById('chat-container');
			if (chatContainer) {
				chatContainer.scrollTop = chatContainer.scrollHeight;
			}
		}, 100);
	}

	async function startDiagnosis() {
		if (!patientName || !patientAge || !patientGender) {
			alert('Please fill in all patient information');
			return;
		}
		
		showPatientForm = false;
		setupError = '';
		
		// Welcome message
		addMessage('ai', `Hello! I'm your AI health assistant powered by GPT-4. Let's assess ${patientName}'s condition together.`);
		
		// Start conversation with AI
		setTimeout(async () => {
			await callAI("Please start the health assessment. Ask your first question about the patient's condition.");
		}, 1000);
	}

	async function handleSendMessage() {
		if (!userInput.trim() || !awaitingResponse || aiThinking) return;
		
		const message = userInput;
		userInput = '';
		
		// Add user message to UI
		addMessage('user', message);
		
		awaitingResponse = false;
		
		// Call AI with user's response
		await callAI(message);
	}

	async function submitCase() {
		if (!diagnosisResult) return;
		
		submitting = true;
		
		try {
			const caseData = {
				patient: {
					name: patientName,
					age: parseInt(patientAge),
					gender: patientGender,
					phone: patientPhone,
					village: patientVillage
				},
				symptoms: diagnosisResult.symptoms.join(', '),
				notes: `AI Assessment:\n${diagnosisResult.summary}\n\nRecommendations: ${diagnosisResult.recommendations}\n\nConversation: ${JSON.stringify(userResponses, null, 2)}`,
				priority: diagnosisResult.priority,
				status: diagnosisResult.needsEscalation ? 'PENDING' : 'COMPLETED',
				vitalSigns: {},
				location: patientVillage
			};
			
			await apiClient.cases.create(caseData);
			
			alert('✅ Case submitted successfully!');
			
			// Reset form
			resetForm();
			
		} catch (error: any) {
			console.error('Error submitting case:', error);
			alert('Failed to submit case: ' + (error.message || 'Unknown error'));
		} finally {
			submitting = false;
		}
	}

	function resetForm() {
		patientName = '';
		patientAge = '';
		patientGender = 'MALE';
		patientPhone = '';
		patientVillage = '';
		messages = [];
		conversationHistory = [];
		showPatientForm = true;
		diagnosisComplete = false;
		awaitingResponse = false;
		aiThinking = false;
		questionCount = 0;
		setupError = '';
		diagnosisResult = {
			priority: 0,
			riskLevel: 'LOW',
			symptoms: [],
			recommendations: '',
			needsEscalation: false,
			escalateTo: '',
			summary: ''
		};
	}

	onMount(() => {
		const state = get(authStore);
		if (!state.isAuthenticated) {
			goto('/auth', { replaceState: true });
			return;
		}
		
		const allowedRoles = ['CHW', 'ASHA', 'ASHA_SUPERVISOR', 'CLINICIAN', 'DOCTOR', 'ADMIN'];
		if (!allowedRoles.includes(state.user?.role || '')) {
			unauthorized = true;
			return;
		}
	});
</script>

{#if unauthorized}
	<div class="flex min-h-screen items-center justify-center bg-gray-50 p-4">
		<div class="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
			<div class="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
				<svg class="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
				</svg>
			</div>
			<h2 class="text-2xl font-bold text-gray-900 mb-3">Access Denied</h2>
			<p class="text-gray-600 mb-6">
				You don't have permission to access this page.
			</p>
			<a href="/" class="block w-full bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors">
				Return to Home
			</a>
		</div>
	</div>
{:else}
	<div class="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50">
		<!-- Header -->
		<header class="bg-white shadow-sm border-b">
			<div class="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
				<div class="flex items-center gap-4">
					<a href="/" class="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center hover:bg-green-700 transition-colors">
						<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
						</svg>
					</a>
					<div>
						<h1 class="text-xl font-bold text-gray-900">🤖 AI Health Assistant</h1>
						<p class="text-sm text-gray-600">Powered by GPT-4 • Intelligent diagnostic assessment</p>
					</div>
				</div>
				<div class="text-sm text-gray-600">
					CHW: {$authStore.user?.name}
				</div>
			</div>
		</header>

		<div class="max-w-4xl mx-auto p-4 py-8">
			{#if showPatientForm}
				<!-- Patient Information Form -->
				<div class="bg-white rounded-2xl shadow-xl p-8">
					<h2 class="text-2xl font-bold text-gray-900 mb-6">Patient Information</h2>
					
					<div class="space-y-4">
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-2">Patient Name *</label>
							<input
								type="text"
								bind:value={patientName}
								placeholder="Enter patient's full name"
								class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
							/>
						</div>
						
						<div class="grid grid-cols-2 gap-4">
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-2">Age *</label>
								<input
									type="number"
									bind:value={patientAge}
									placeholder="Age"
									min="0"
									max="120"
									class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
								/>
							</div>
							
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-2">Gender *</label>
								<select
									bind:value={patientGender}
									class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
								>
									<option value="MALE">Male</option>
									<option value="FEMALE">Female</option>
									<option value="OTHER">Other</option>
								</select>
							</div>
						</div>
						
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
							<input
								type="tel"
								bind:value={patientPhone}
								placeholder="+91 XXXXX XXXXX"
								class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
							/>
						</div>
						
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-2">Village/Location</label>
							<input
								type="text"
								bind:value={patientVillage}
								placeholder="Enter village or location"
								class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
							/>
						</div>
					</div>
					
					<button
						onclick={startDiagnosis}
						disabled={!patientName || !patientAge || !patientGender}
						class="w-full mt-6 bg-gradient-to-r from-green-600 to-blue-600 text-white px-6 py-4 rounded-lg font-semibold hover:from-green-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] shadow-lg"
					>
						🚀 Start AI Assessment
					</button>
				</div>
			{:else if !diagnosisComplete}
				<!-- Chat Interface -->
				<div class="bg-white rounded-2xl shadow-xl overflow-hidden">
					<!-- Chat Header -->
					<div class="bg-gradient-to-r from-green-600 to-blue-600 text-white p-6">
						<div class="flex items-center gap-3">
							<div class="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
								<span class="text-2xl">🤖</span>
							</div>
							<div>
								<h3 class="font-bold text-lg">AI Health Assistant</h3>
								<p class="text-sm text-white/80">Assessing {patientName}</p>
							</div>
						</div>
					</div>
					
					<!-- Chat Messages -->
					<div id="chat-container" class="h-[500px] overflow-y-auto p-6 space-y-4 bg-gray-50">
						{#each messages as message}
							<div class="flex {message.role === 'ai' ? 'justify-start' : 'justify-end'}">
								<div class="flex items-start gap-3 max-w-[80%]">
									{#if message.role === 'ai'}
										<div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
											<span class="text-white text-sm">🤖</span>
										</div>
									{/if}
									
									<div>
										<div class="bg-{message.role === 'ai' ? 'white' : 'blue-600'} text-{message.role === 'ai' ? 'gray-900' : 'white'} px-4 py-3 rounded-2xl shadow-sm">
											<p class="text-sm leading-relaxed whitespace-pre-wrap">{message.text}</p>
										</div>
									</div>
									
									{#if message.role === 'user'}
										<div class="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
											<span class="text-white text-sm">👤</span>
										</div>
									{/if}
								</div>
							</div>
						{/each}
						
						{#if aiThinking}
							<div class="flex justify-start">
								<div class="flex items-start gap-3 max-w-[80%]">
									<div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
										<span class="text-white text-sm">🤖</span>
									</div>
									<div class="bg-white px-4 py-3 rounded-2xl shadow-sm">
										<div class="flex items-center gap-2">
											<div class="flex space-x-1">
												<div class="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style="animation-delay: 0ms"></div>
												<div class="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style="animation-delay: 150ms"></div>
												<div class="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style="animation-delay: 300ms"></div>
											</div>
											<span class="text-sm text-gray-500">AI is thinking...</span>
										</div>
									</div>
								</div>
							</div>
						{/if}
					</div>
					
					<!-- Setup Error Alert -->
					{#if setupError}
						<div class="p-4 bg-yellow-50 border-t border-yellow-200">
							<div class="flex items-start gap-3">
								<span class="text-2xl">⚠️</span>
								<div class="flex-1">
									<h4 class="font-bold text-yellow-900 mb-1">Setup Required</h4>
									<p class="text-sm text-yellow-800">{setupError}</p>
									<p class="text-xs text-yellow-700 mt-2">
										Add your OpenAI API key to the .env file to enable AI features.
									</p>
								</div>
							</div>
						</div>
					{/if}
					
					<!-- Input Area -->
					{#if awaitingResponse && !setupError}
						<div class="p-4 border-t bg-white">
							<div class="flex gap-2">
								<input
									type="text"
									bind:value={userInput}
									placeholder="Type your answer..."
									disabled={aiThinking}
									onkeydown={(e) => { if (e.key === 'Enter' && !aiThinking) handleSendMessage(); }}
									class="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
								/>
								<button
									onclick={handleSendMessage}
									disabled={!userInput.trim() || aiThinking}
									class="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
								>
									{aiThinking ? '⏳' : 'Send'}
								</button>
							</div>
							<p class="text-xs text-gray-500 mt-2">
								Question {questionCount} - AI will ask up to 5-6 questions maximum
							</p>
						</div>
					{/if}
				</div>
			{:else}
				<!-- Diagnosis Result -->
				<div class="bg-white rounded-2xl shadow-xl p-8">
					<div class="text-center mb-8">
						<div class="inline-flex items-center justify-center w-20 h-20 rounded-full mb-4
							{diagnosisResult.riskLevel === 'CRITICAL' ? 'bg-red-100' : 
							 diagnosisResult.riskLevel === 'HIGH' ? 'bg-orange-100' : 
							 diagnosisResult.riskLevel === 'MEDIUM' ? 'bg-yellow-100' : 'bg-green-100'}">
							<span class="text-4xl">
								{diagnosisResult.riskLevel === 'CRITICAL' ? '🚨' : 
								 diagnosisResult.riskLevel === 'HIGH' ? '⚠️' : 
								 diagnosisResult.riskLevel === 'MEDIUM' ? '⚡' : '✅'}
							</span>
						</div>
						<h2 class="text-3xl font-bold text-gray-900 mb-2">Assessment Complete</h2>
						<p class="text-lg text-gray-600">{diagnosisResult.summary}</p>
					</div>
					
					<!-- Risk Level Badge -->
					<div class="flex justify-center mb-8">
						<span class="px-6 py-3 rounded-full text-lg font-bold
							{diagnosisResult.riskLevel === 'CRITICAL' ? 'bg-red-100 text-red-800' : 
							 diagnosisResult.riskLevel === 'HIGH' ? 'bg-orange-100 text-orange-800' : 
							 diagnosisResult.riskLevel === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}">
							{diagnosisResult.riskLevel} PRIORITY
						</span>
					</div>
					
					<!-- Recommendations -->
					<div class="bg-gray-50 rounded-xl p-6 mb-6">
						<h3 class="font-bold text-gray-900 mb-3 flex items-center gap-2">
							<span>📋</span> Recommendations:
						</h3>
						<p class="text-gray-700 leading-relaxed">{diagnosisResult.recommendations}</p>
					</div>
					
					<!-- Escalation Info -->
					{#if diagnosisResult.needsEscalation}
						<div class="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 mb-6">
							<h3 class="font-bold text-blue-900 mb-2 flex items-center gap-2">
								<span>🔔</span> Escalation Required
							</h3>
							<p class="text-blue-800">
								This case will be automatically escalated to: <strong>{diagnosisResult.escalateTo}</strong>
							</p>
						</div>
					{/if}
					
					<!-- Patient Info Summary -->
					<div class="border rounded-xl p-6 mb-6">
						<h3 class="font-bold text-gray-900 mb-4">Patient Details</h3>
						<div class="grid grid-cols-2 gap-4 text-sm">
							<div>
								<span class="text-gray-600">Name:</span>
								<span class="font-medium ml-2">{patientName}</span>
							</div>
							<div>
								<span class="text-gray-600">Age:</span>
								<span class="font-medium ml-2">{patientAge}</span>
							</div>
							<div>
								<span class="text-gray-600">Gender:</span>
								<span class="font-medium ml-2">{patientGender}</span>
							</div>
							<div>
								<span class="text-gray-600">Priority:</span>
								<span class="font-medium ml-2">{diagnosisResult.priority}/5</span>
							</div>
						</div>
					</div>
					
					<!-- Action Buttons -->
					<div class="flex gap-4">
						<button
							onclick={submitCase}
							disabled={submitting}
							class="flex-1 bg-green-600 text-white px-6 py-4 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 transition-all transform hover:scale-[1.02] shadow-lg"
						>
							{submitting ? '⏳ Submitting...' : '✅ Submit Case'}
						</button>
						
						<button
							onclick={resetForm}
							class="px-6 py-4 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
						>
							🔄 New Assessment
						</button>
					</div>
				</div>
			{/if}
		</div>
	</div>
{/if}
