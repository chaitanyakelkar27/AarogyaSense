<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { authStore } from '$lib/stores/auth-store';
	import { get } from 'svelte/store';
	import { apiClient } from '$lib/api-client';
	import NotificationCenter from '$lib/components/NotificationCenter.svelte';
	
	// State management
	let activeTab: 'cases' | 'metrics' = 'cases';
	let cases: any[] = [];
	let stats: any = {
		totalEscalated: 0,
		pending: 0,
		underReview: 0,
		criticalPriority: 0
	};
	let metrics: any = null;
	let selectedCase: any = null;
	let showCaseModal = false;
	let showPrescriptionModal = false;
	let showNotifications = false;
	
	// Loading states
	let isLoading = true;
	let isSubmitting = false;
	let errorMessage = '';
	let successMessage = '';
	
	// Filter state
	let statusFilter = 'all';
	let priorityFilter = 3; // Minimum priority for escalated cases
	
	// Prescription form state
	let prescriptionForm = {
		diagnosis: '',
		condition: '',
		prescription: '',
		notes: '',
		followUpDate: '',
		urgency: 'MEDIUM',
		recommendations: ''
	};

	let unauthorized = false;

	onMount(() => {
		console.log('[CLINICIAN] Page mounted, checking auth...');
		// Simple one-time auth check using get()
		const state = get(authStore);
		console.log('[CLINICIAN] Auth state:', { isAuthenticated: state.isAuthenticated, isLoading: state.isLoading, role: state.user?.role });
		
		if (!state.isAuthenticated) {
			console.log('[CLINICIAN] Not authenticated, redirecting to /auth');
			goto('/auth', { replaceState: true });
			return;
		}
		
		// Check if user has permission to access Clinician portal
		const allowedRoles = ['CLINICIAN', 'DOCTOR', 'ADMIN'];
		if (!allowedRoles.includes(state.user?.role || '')) {
			console.log('[CLINICIAN] Unauthorized role:', state.user?.role);
			unauthorized = true;
			return;
		}

		console.log('[CLINICIAN] Auth check passed, loading cases...');
		loadCases();
		
		// Auto-refresh every 30 seconds
		const interval = setInterval(() => {
			if (activeTab === 'cases') {
				loadCases();
			}
		}, 30000);

		return () => {
			clearInterval(interval);
		};
	});

	async function loadCases() {
		try {
			isLoading = true;
			errorMessage = '';
			
			const params: any = {
				priorityMin: priorityFilter,
				limit: 100
			};
			
			if (statusFilter !== 'all') {
				params.status = statusFilter.toUpperCase();
			}
			
			const response = await apiClient.clinician.getCases(params);
			cases = response.cases;
			stats = response.stats;
			
		} catch (error: any) {
			console.error('Failed to load cases:', error);
			errorMessage = error.message || 'Failed to load cases';
		} finally {
			isLoading = false;
		}
	}

	async function loadMetrics() {
		try {
			const userId = $authStore.user?.id;
			const response = await apiClient.analytics.clinicianPerformance({
				clinicianId: userId,
				days: 30
			});
			metrics = response;
		} catch (error: any) {
			console.error('Failed to load metrics:', error);
			errorMessage = error.message || 'Failed to load metrics';
		}
	}

	function viewCaseDetails(caseItem: any) {
		selectedCase = caseItem;
		showCaseModal = true;
	}

	function closeCaseModal() {
		showCaseModal = false;
		selectedCase = null;
	}

	function openPrescriptionModal(caseItem: any) {
		selectedCase = caseItem;
		showCaseModal = false;
		showPrescriptionModal = true;
		
		// Reset form
		prescriptionForm = {
			diagnosis: '',
			condition: '',
			prescription: '',
			notes: '',
			followUpDate: '',
			urgency: 'MEDIUM',
			recommendations: ''
		};
	}

	function closePrescriptionModal() {
		showPrescriptionModal = false;
		selectedCase = null;
	}

	async function acceptCase() {
		if (!selectedCase) return;
		
		try {
			isSubmitting = true;
			errorMessage = '';
			
			const userId = $authStore.user?.id;
			await apiClient.clinician.reviewCase(selectedCase.id, {
				action: 'accept',
				notes: 'Case accepted for clinical review',
				clinicianId: userId
			});
			
			successMessage = 'Case accepted successfully';
			closeCaseModal();
			await loadCases();
			
			setTimeout(() => { successMessage = ''; }, 3000);
		} catch (error: any) {
			console.error('Failed to accept case:', error);
			errorMessage = error.message || 'Failed to accept case';
		} finally {
			isSubmitting = false;
		}
	}

	async function referCase() {
		if (!selectedCase) return;
		
		const referralReason = prompt('Please provide referral reason:');
		if (!referralReason) return;
		
		try {
			isSubmitting = true;
			errorMessage = '';
			
			const userId = $authStore.user?.id;
			await apiClient.clinician.reviewCase(selectedCase.id, {
				action: 'refer',
				referralReason,
				notes: referralReason,
				clinicianId: userId
			});
			
			successMessage = 'Case referred to specialist';
			closeCaseModal();
			await loadCases();
			
			setTimeout(() => { successMessage = ''; }, 3000);
		} catch (error: any) {
			console.error('Failed to refer case:', error);
			errorMessage = error.message || 'Failed to refer case';
		} finally {
			isSubmitting = false;
		}
	}

	async function submitPrescription() {
		if (!selectedCase) return;
		
		// Validate form
		if (!prescriptionForm.condition || !prescriptionForm.prescription) {
			alert('Please provide diagnosis and prescription');
			return;
		}
		
		try {
			isSubmitting = true;
			errorMessage = '';
			
			const userId = $authStore.user?.id;
			await apiClient.clinician.reviewCase(selectedCase.id, {
				action: 'prescribe',
				diagnosis: {
					condition: prescriptionForm.condition,
					confidence: 0.9,
					riskScore: selectedCase.priority / 5,
					urgency: prescriptionForm.urgency,
					recommendations: prescriptionForm.recommendations
				},
				prescription: prescriptionForm.prescription,
				notes: prescriptionForm.notes,
				followUpDate: prescriptionForm.followUpDate || undefined,
				clinicianId: userId
			});
			
			successMessage = 'Prescription created successfully';
			closePrescriptionModal();
			await loadCases();
			
			setTimeout(() => { successMessage = ''; }, 3000);
		} catch (error: any) {
			console.error('Failed to submit prescription:', error);
			errorMessage = error.message || 'Failed to submit prescription';
		} finally {
			isSubmitting = false;
		}
	}

	function getPriorityBadge(priority: number) {
		if (priority >= 4) return 'bg-red-100 text-red-800 border-red-200';
		if (priority === 3) return 'bg-orange-100 text-orange-800 border-orange-200';
		return 'bg-yellow-100 text-yellow-800 border-yellow-200';
	}

	function getPriorityLabel(priority: number) {
		if (priority >= 4) return 'Critical';
		if (priority === 3) return 'High';
		return 'Medium';
	}

	function getStatusBadge(status: string) {
		const badges: any = {
			PENDING: 'bg-yellow-100 text-yellow-800',
			UNDER_REVIEW: 'bg-blue-100 text-blue-800',
			APPROVED: 'bg-green-100 text-green-800',
			REJECTED: 'bg-red-100 text-red-800',
			COMPLETED: 'bg-gray-100 text-gray-800'
		};
		return badges[status] || 'bg-gray-100 text-gray-800';
	}

	function formatDate(date: string | Date) {
		const d = new Date(date);
		const now = new Date();
		const diffMs = now.getTime() - d.getTime();
		const diffMins = Math.floor(diffMs / 60000);
		
		if (diffMins < 1) return 'just now';
		if (diffMins < 60) return `${diffMins}m ago`;
		
		const diffHours = Math.floor(diffMins / 60);
		if (diffHours < 24) return `${diffHours}h ago`;
		
		const diffDays = Math.floor(diffHours / 24);
		if (diffDays < 7) return `${diffDays}d ago`;
		
		return d.toLocaleDateString();
	}

	function parseVitalSigns(vitalSigns: string | null) {
		if (!vitalSigns) return {};
		try {
			return JSON.parse(vitalSigns);
		} catch {
			return {};
		}
	}

	$: if (activeTab === 'metrics' && !metrics) {
		loadMetrics();
	}

	$: filteredCases = cases;
</script>

<div class="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
	{#if unauthorized}
		<!-- Unauthorized Access Message -->
		<div class="flex min-h-screen items-center justify-center p-4">
			<div class="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
				<div class="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
					<svg class="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
					</svg>
				</div>
				<h2 class="text-2xl font-bold text-gray-900 mb-3">Access Denied</h2>
				<p class="text-gray-600 mb-6">
					You don't have permission to access the Clinician Portal. This area is restricted to clinicians, doctors, and administrators only.
				</p>
				<div class="space-y-3">
					<p class="text-sm text-gray-500">Your role: <strong>{$authStore.user?.role}</strong></p>
					<a href="/" class="block w-full bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors">
						Return to Home
					</a>
					{#if $authStore.user?.role === 'ASHA' || $authStore.user?.role === 'ASHA_SUPERVISOR'}
						<a href="/asha" class="block w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
							Go to ASHA Portal
						</a>
					{:else if $authStore.user?.role === 'CHW'}
						<a href="/chw" class="block w-full bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors">
							Go to CHW Portal
						</a>
					{/if}
				</div>
			</div>
		</div>
	{:else}
	<!-- Header -->
	<header class="bg-white shadow-sm border-b border-gray-200">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
			<div class="flex items-center justify-between">
				<div class="flex items-center space-x-4">
					<a href="/" class="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center hover:bg-purple-700 transition-colors" title="Back to Home" aria-label="Back to Home">
						<svg class="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
							<polyline points="9 22 9 12 15 12 15 22"/>
						</svg>
					</a>
					<div>
						<h1 class="text-2xl font-bold text-gray-900">Clinician Portal</h1>
						<p class="text-sm text-gray-600">Dr. {$authStore.user?.name || 'Clinician'}</p>
					</div>
				</div>
				
				<!-- Notification Bell -->
				<button 
					onclick={() => showNotifications = !showNotifications}
					class="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
					aria-label="Notifications"
				>
					<svg class="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
					</svg>
				</button>
			</div>
		</div>
	</header>

	<!-- Notification Center -->
	{#if showNotifications}
		<NotificationCenter 
			isOpen={showNotifications} 
			onClose={() => showNotifications = false} 
		/>
	{/if}

	<!-- Messages -->
	{#if errorMessage}
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
			<div class="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
				{errorMessage}
			</div>
		</div>
	{/if}
	
	{#if successMessage}
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
			<div class="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
				✅ {successMessage}
			</div>
		</div>
	{/if}

	<!-- Main Content -->
	<main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
		<!-- Tabs -->
		<div class="bg-white rounded-t-lg shadow-sm border-b border-gray-200">
			<div class="flex space-x-1 p-2">
				<button
					onclick={() => activeTab = 'cases'}
					class="flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors {activeTab === 'cases' ? 'bg-purple-600 text-white' : 'text-gray-600 hover:bg-gray-100'}"
				>
					📋 Escalated Cases {stats.totalEscalated > 0 ? `(${stats.totalEscalated})` : ''}
				</button>
				<button
					onclick={() => activeTab = 'metrics'}
					class="flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors {activeTab === 'metrics' ? 'bg-purple-600 text-white' : 'text-gray-600 hover:bg-gray-100'}"
				>
					📊 Performance Metrics
				</button>
			</div>
		</div>

		<!-- Tab Content -->
		<div class="bg-white rounded-b-lg shadow-sm">
			{#if activeTab === 'cases'}
				<!-- Statistics Cards -->
				<div class="p-6 grid grid-cols-1 md:grid-cols-4 gap-4 border-b border-gray-200">
					<div class="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
						<p class="text-sm text-purple-600 font-medium">Total Escalated</p>
						<p class="text-3xl font-bold text-purple-900">{stats.totalEscalated}</p>
					</div>
					<div class="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-4 border border-yellow-200">
						<p class="text-sm text-yellow-600 font-medium">Pending Review</p>
						<p class="text-3xl font-bold text-yellow-900">{stats.pending}</p>
					</div>
					<div class="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
						<p class="text-sm text-blue-600 font-medium">Under Review</p>
						<p class="text-3xl font-bold text-blue-900">{stats.underReview}</p>
					</div>
					<div class="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 border border-red-200">
						<p class="text-sm text-red-600 font-medium">Critical Priority</p>
						<p class="text-3xl font-bold text-red-900">{stats.criticalPriority}</p>
					</div>
				</div>

				<!-- Filters -->
				<div class="p-6 border-b border-gray-200 flex gap-4">
					<div>
						<label for="statusFilter" class="block text-sm font-medium text-gray-700 mb-1">Status</label>
						<select 
							id="statusFilter"
							bind:value={statusFilter} 
							onchange={() => loadCases()}
							class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
						>
							<option value="all">All Statuses</option>
							<option value="pending">Pending</option>
							<option value="under_review">Under Review</option>
							<option value="approved">Approved</option>
						</select>
					</div>
					<div>
						<label for="priorityFilter" class="block text-sm font-medium text-gray-700 mb-1">Min Priority</label>
						<select 
							id="priorityFilter"
							bind:value={priorityFilter} 
							onchange={() => loadCases()}
							class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
						>
							<option value={3}>High (3+)</option>
							<option value={4}>Critical (4+)</option>
							<option value={5}>Maximum (5)</option>
						</select>
					</div>
					<div class="flex items-end">
						<button 
							onclick={() => loadCases()}
							disabled={isLoading}
							class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
						>
							{isLoading ? '⏳ Loading...' : '🔄 Refresh'}
						</button>
					</div>
				</div>

				<!-- Cases List -->
				<div class="p-6">
					{#if isLoading}
						<div class="text-center py-12">
							<div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
							<p class="mt-4 text-gray-600">Loading cases...</p>
						</div>
					{:else if filteredCases.length === 0}
						<div class="text-center py-12">
							<div class="text-6xl mb-4">🏥</div>
							<h3 class="text-xl font-semibold text-gray-900 mb-2">No Escalated Cases</h3>
							<p class="text-gray-600">All cases are being handled at lower levels</p>
						</div>
					{:else}
						<div class="space-y-4">
							{#each filteredCases as caseItem}
								{@const vitals = parseVitalSigns(caseItem.vitalSigns)}
								<div class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
									<div class="flex items-start justify-between">
										<div class="flex-1">
											<div class="flex items-center gap-3 mb-2">
												<span class="px-3 py-1 rounded-full text-xs font-semibold border {getPriorityBadge(caseItem.priority)}">
													⚠️ {getPriorityLabel(caseItem.priority)}
												</span>
												<span class="px-3 py-1 rounded-full text-xs font-semibold {getStatusBadge(caseItem.status)}">
													{caseItem.status}
												</span>
												<span class="text-sm text-gray-500">
													{formatDate(caseItem.createdAt)}
												</span>
											</div>
											
											<h3 class="text-lg font-semibold text-gray-900 mb-2">
												{caseItem.patient?.name || 'Unknown Patient'} • {vitals.age || 'N/A'} years
											</h3>
											
											<p class="text-gray-700 mb-2">
												<strong>Symptoms:</strong> {caseItem.symptoms}
											</p>
											
											{#if vitals}
												<div class="flex gap-4 text-sm text-gray-600 mb-2">
													{#if vitals.bloodPressure}
														<span>BP: {vitals.bloodPressure}</span>
													{/if}
													{#if vitals.temperature}
														<span>Temp: {vitals.temperature}°C</span>
													{/if}
													{#if vitals.heartRate}
														<span>HR: {vitals.heartRate} bpm</span>
													{/if}
												</div>
											{/if}
											
											<p class="text-sm text-gray-600">
												<strong>CHW:</strong> {caseItem.user?.name || 'Unknown'} 
												{#if caseItem.user?.phone}
													• 📞 {caseItem.user.phone}
												{/if}
											</p>
											
											{#if caseItem.diagnoses && caseItem.diagnoses.length > 0}
												<div class="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
													<p class="text-sm font-medium text-blue-900">
														Latest Diagnosis: {caseItem.diagnoses[0].condition}
													</p>
													{#if caseItem.diagnoses[0].recommendations}
														<p class="text-sm text-blue-700 mt-1">
															{caseItem.diagnoses[0].recommendations}
														</p>
													{/if}
												</div>
											{/if}
										</div>
										
										<div class="flex flex-col gap-2 ml-4">
											<button
												onclick={() => viewCaseDetails(caseItem)}
												class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium whitespace-nowrap"
											>
												👁️ View Details
											</button>
											<button
												onclick={() => openPrescriptionModal(caseItem)}
												class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium whitespace-nowrap"
											>
												💊 Prescribe
											</button>
										</div>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</div>

			{:else if activeTab === 'metrics'}
				<!-- Performance Metrics -->
				<div class="p-6">
					{#if !metrics}
						<div class="text-center py-12">
							<div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
							<p class="mt-4 text-gray-600">Loading metrics...</p>
						</div>
					{:else}
						<!-- Summary Cards -->
						<div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
							<div class="bg-white border border-gray-200 rounded-lg p-4">
								<p class="text-sm text-gray-600 mb-1">Total Diagnoses</p>
								<p class="text-3xl font-bold text-purple-600">{metrics.summary.totalDiagnoses}</p>
							</div>
							<div class="bg-white border border-gray-200 rounded-lg p-4">
								<p class="text-sm text-gray-600 mb-1">Unique Patients</p>
								<p class="text-3xl font-bold text-blue-600">{metrics.summary.uniquePatients}</p>
							</div>
							<div class="bg-white border border-gray-200 rounded-lg p-4">
								<p class="text-sm text-gray-600 mb-1">Prescriptions</p>
								<p class="text-3xl font-bold text-green-600">{metrics.summary.prescriptionsGiven}</p>
								<p class="text-xs text-gray-500">{metrics.summary.prescriptionRate}% rate</p>
							</div>
							<div class="bg-white border border-gray-200 rounded-lg p-4">
								<p class="text-sm text-gray-600 mb-1">Referrals</p>
								<p class="text-3xl font-bold text-orange-600">{metrics.summary.referrals}</p>
								<p class="text-xs text-gray-500">{metrics.summary.referralRate}% rate</p>
							</div>
						</div>

						<!-- Urgency Breakdown -->
						<div class="bg-white border border-gray-200 rounded-lg p-6 mb-8">
							<h3 class="text-lg font-semibold text-gray-900 mb-4">Case Urgency Distribution</h3>
							<div class="space-y-3">
								{#each Object.entries(metrics.summary.urgencyBreakdown) as [level, count]}
									{@const total = metrics.summary.totalDiagnoses}
									{@const percentage = total > 0 ? ((count as number / total) * 100).toFixed(1) : '0'}
									<div>
										<div class="flex justify-between text-sm mb-1">
											<span class="font-medium text-gray-700">{level}</span>
											<span class="text-gray-600">{count} ({percentage}%)</span>
										</div>
										<div class="w-full bg-gray-200 rounded-full h-2">
											<div 
												class="h-2 rounded-full {level === 'CRITICAL' ? 'bg-red-500' : level === 'HIGH' ? 'bg-orange-500' : level === 'MEDIUM' ? 'bg-yellow-500' : 'bg-green-500'}"
												style="width: {percentage}%"
											></div>
										</div>
									</div>
								{/each}
							</div>
						</div>

						<!-- Recent Critical Cases -->
						{#if metrics.criticalCases && metrics.criticalCases.length > 0}
							<div class="bg-white border border-gray-200 rounded-lg p-6">
								<h3 class="text-lg font-semibold text-gray-900 mb-4">Recent Critical Cases</h3>
								<div class="space-y-3">
									{#each metrics.criticalCases.slice(0, 5) as critical}
										<div class="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
											<div>
												<p class="font-medium text-gray-900">Case #{critical.caseId.slice(0, 8)}</p>
												<p class="text-sm text-gray-600">Priority: {critical.priority} • {critical.status}</p>
											</div>
											<div class="text-right">
												<span class="text-sm {critical.hasClinicianReview ? 'text-green-600' : 'text-red-600'}">
													{critical.hasClinicianReview ? '✅ Reviewed' : '⏳ Pending'}
												</span>
											</div>
										</div>
									{/each}
								</div>
							</div>
						{/if}
					{/if}
				</div>
			{/if}
		</div>
	</main>

<!-- Case Details Modal -->
{#if showCaseModal && selectedCase}
	<div 
		class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
		onclick={(e) => { if (e.target === e.currentTarget) closeCaseModal(); }}
		onkeydown={(e) => { if (e.key === 'Escape') closeCaseModal(); }}
		role="dialog"
		aria-modal="true"
		aria-labelledby="modal-title"
		tabindex="-1"
	>
		<div class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
			<div class="p-6 border-b border-gray-200">
				<div class="flex items-start justify-between">
					<h2 id="modal-title" class="text-2xl font-bold text-gray-900">Case Details</h2>
					<button 
						onclick={() => closeCaseModal()}
						class="text-gray-400 hover:text-gray-600 transition-colors"
						aria-label="Close modal"
					>
						<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>
			</div>
			
			<div class="p-6 space-y-4">
				{#if selectedCase}
					{@const vitals = parseVitalSigns(selectedCase.vitalSigns)}
					
					<!-- Patient Info -->
					<div class="bg-gray-50 rounded-lg p-4">
						<h3 class="font-semibold text-gray-900 mb-2">Patient Information</h3>
						<div class="grid grid-cols-2 gap-3 text-sm">
							<div><strong>Name:</strong> {selectedCase.patient?.name || 'N/A'}</div>
							<div><strong>Age:</strong> {vitals.age || 'N/A'} years</div>
							<div><strong>Gender:</strong> {selectedCase.patient?.gender || 'N/A'}</div>
							<div><strong>Phone:</strong> {selectedCase.patient?.phone || 'N/A'}</div>
							<div class="col-span-2"><strong>Village:</strong> {selectedCase.patient?.village || 'N/A'}</div>
						</div>
					</div>

					<!-- Case Info -->
					<div>
						<h3 class="font-semibold text-gray-900 mb-2">Case Information</h3>
						<div class="space-y-2 text-sm">
							<p><strong>Symptoms:</strong> {selectedCase.symptoms}</p>
							<p><strong>Status:</strong> <span class="px-2 py-1 rounded text-xs {getStatusBadge(selectedCase.status)}">{selectedCase.status}</span></p>
							<p><strong>Priority:</strong> <span class="px-2 py-1 rounded text-xs {getPriorityBadge(selectedCase.priority)}">{getPriorityLabel(selectedCase.priority)}</span></p>
							<p><strong>Created:</strong> {new Date(selectedCase.createdAt).toLocaleString()}</p>
						</div>
					</div>

					<!-- Vital Signs -->
					{#if Object.keys(vitals).length > 0}
						<div>
							<h3 class="font-semibold text-gray-900 mb-2">Vital Signs</h3>
							<div class="grid grid-cols-2 gap-3 text-sm">
								{#if vitals.bloodPressure}<p><strong>Blood Pressure:</strong> {vitals.bloodPressure}</p>{/if}
								{#if vitals.temperature}<p><strong>Temperature:</strong> {vitals.temperature}°C</p>{/if}
								{#if vitals.heartRate}<p><strong>Heart Rate:</strong> {vitals.heartRate} bpm</p>{/if}
								{#if vitals.oxygenSaturation}<p><strong>O2 Saturation:</strong> {vitals.oxygenSaturation}%</p>{/if}
							</div>
						</div>
					{/if}

					<!-- CHW Info -->
					<div>
						<h3 class="font-semibold text-gray-900 mb-2">Reporting CHW</h3>
						<div class="text-sm">
							<p><strong>Name:</strong> {selectedCase.user?.name || 'Unknown'}</p>
							{#if selectedCase.user?.phone}
								<p><strong>Phone:</strong> {selectedCase.user.phone}</p>
							{/if}
						</div>
					</div>

					<!-- Diagnoses -->
					{#if selectedCase.diagnoses && selectedCase.diagnoses.length > 0}
						<div>
							<h3 class="font-semibold text-gray-900 mb-2">Previous Diagnoses</h3>
							<div class="space-y-2">
								{#each selectedCase.diagnoses as diagnosis}
									<div class="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
										<p><strong>Condition:</strong> {diagnosis.condition}</p>
										<p><strong>Recommendations:</strong> {diagnosis.recommendations}</p>
										{#if diagnosis.prescription}
											<p><strong>Prescription:</strong> {diagnosis.prescription}</p>
										{/if}
										<p class="text-xs text-gray-600 mt-1">{new Date(diagnosis.createdAt).toLocaleString()}</p>
									</div>
								{/each}
							</div>
						</div>
					{/if}

					<!-- Notes -->
					{#if selectedCase.notes}
						<div>
							<h3 class="font-semibold text-gray-900 mb-2">Notes</h3>
							<p class="text-sm text-gray-700 bg-gray-50 rounded p-3">{selectedCase.notes}</p>
						</div>
					{/if}
				{/if}
			</div>

			<div class="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
				<button
					onclick={() => closeCaseModal()}
					class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
				>
					Close
				</button>
				<button
					onclick={() => referCase()}
					disabled={isSubmitting}
					class="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors"
				>
					{isSubmitting ? '⏳ Processing...' : '🔀 Refer to Specialist'}
				</button>
				<button
					onclick={() => acceptCase()}
					disabled={isSubmitting}
					class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
				>
					{isSubmitting ? '⏳ Processing...' : '✅ Accept Case'}
				</button>
				<button
					onclick={() => openPrescriptionModal(selectedCase)}
					class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
				>
					💊 Prescribe
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Prescription Modal -->
{#if showPrescriptionModal && selectedCase}
	<div 
		class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
		onclick={(e) => { if (e.target === e.currentTarget) closePrescriptionModal(); }}
		onkeydown={(e) => { if (e.key === 'Escape') closePrescriptionModal(); }}
		role="dialog"
		aria-modal="true"
		aria-labelledby="prescription-modal-title"
		tabindex="-1"
	>
		<div class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
			<div class="p-6 border-b border-gray-200">
				<div class="flex items-start justify-between">
					<div>
						<h2 id="prescription-modal-title" class="text-2xl font-bold text-gray-900">Create Prescription</h2>
						<p class="text-sm text-gray-600 mt-1">Patient: {selectedCase.patient?.name || 'Unknown'}</p>
					</div>
					<button 
						onclick={() => closePrescriptionModal()}
						class="text-gray-400 hover:text-gray-600 transition-colors"
						aria-label="Close prescription modal"
					>
						<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>
			</div>
			
			<form onsubmit={(e) => { e.preventDefault(); submitPrescription(); }} class="p-6 space-y-4">
				<div>
					<label for="condition" class="block text-sm font-medium text-gray-700 mb-1">Diagnosis / Condition *</label>
					<input
						id="condition"
						type="text"
						bind:value={prescriptionForm.condition}
						required
						placeholder="e.g., Acute Bronchitis"
						class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
					/>
				</div>

				<div>
					<label for="urgency" class="block text-sm font-medium text-gray-700 mb-1">Urgency Level</label>
					<select
						id="urgency"
						bind:value={prescriptionForm.urgency}
						class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
					>
						<option value="LOW">Low</option>
						<option value="MEDIUM">Medium</option>
						<option value="HIGH">High</option>
						<option value="CRITICAL">Critical</option>
					</select>
				</div>

				<div>
					<label for="prescription" class="block text-sm font-medium text-gray-700 mb-1">Prescription *</label>
					<textarea
						id="prescription"
						bind:value={prescriptionForm.prescription}
						required
						rows="4"
						placeholder="e.g., Amoxicillin 500mg, 3 times daily for 7 days&#10;Paracetamol 500mg as needed for pain"
						class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
					></textarea>
				</div>

				<div>
					<label for="recommendations" class="block text-sm font-medium text-gray-700 mb-1">Recommendations</label>
					<textarea
						id="recommendations"
						bind:value={prescriptionForm.recommendations}
						rows="3"
						placeholder="e.g., Rest, increase fluid intake, avoid cold drinks"
						class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
					></textarea>
				</div>

				<div>
					<label for="notes" class="block text-sm font-medium text-gray-700 mb-1">Clinical Notes</label>
					<textarea
						id="notes"
						bind:value={prescriptionForm.notes}
						rows="2"
						placeholder="Additional notes for CHW or patient"
						class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
					></textarea>
				</div>

				<div>
					<label for="followUpDate" class="block text-sm font-medium text-gray-700 mb-1">Follow-up Date</label>
					<input
						id="followUpDate"
						type="date"
						bind:value={prescriptionForm.followUpDate}
						min={new Date().toISOString().split('T')[0]}
						class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
					/>
				</div>

				<div class="flex justify-end gap-3 pt-4 border-t border-gray-200">
					<button
						type="button"
						onclick={() => closePrescriptionModal()}
						class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={isSubmitting}
						class="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors font-medium"
					>
						{isSubmitting ? '⏳ Submitting...' : '💊 Create Prescription'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
{/if}
</div>
