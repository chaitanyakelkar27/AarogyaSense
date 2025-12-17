<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { _ } from 'svelte-i18n';
	import { authStore } from '$lib/stores/auth-store';
	import { apiClient } from '$lib/api-client';
	import { get } from 'svelte/store';
	import {
		initializeSocket,
		subscribeToCaseUpdates,
		disconnectSocket
	} from '$lib/stores/socket-store';

	let unauthorized = false;
	let isLoading = true;
	let actionLoading = false;

	// Cases data
	let allCases: any[] = [];
	let selectedCase: any = null;
	let showCaseModal = false;

	// Stats
	let stats = {
		totalCases: 0,
		pendingReview: 0,
		highPriority: 0,
		critical: 0
	};

	let unsubscribe: (() => void) | undefined;

	onMount(() => {
		const state = get(authStore);
		if (!state.isAuthenticated) {
			goto('/auth', { replaceState: true });
			return;
		}

		const allowedRoles = ['CLINICIAN', 'DOCTOR', 'ADMIN'];
		if (!allowedRoles.includes(state.user?.role || '')) {
			unauthorized = true;
			return;
		}

		loadCases();

		// Initialize WebSocket connection
		initializeSocket();

		// Subscribe to real-time case updates
		unsubscribe = subscribeToCaseUpdates((data) => {
			console.log('Received case update:', data);
			// Reload cases when any case is updated
			loadCases();
		});

		const interval = setInterval(loadCases, 30000); // Refresh every 30s
		return () => clearInterval(interval);
	});

	onDestroy(() => {
		// Clean up WebSocket subscription
		if (unsubscribe) {
			unsubscribe();
		}
		disconnectSocket();
	});

	async function loadCases() {
		try {
			isLoading = true;
			const response = await apiClient.cases.list({});
			allCases = response.cases || [];

			// Calculate stats
			stats.totalCases = allCases.length;
			stats.pendingReview = allCases.filter(
				(c) =>
					c.status === 'PENDING' ||
					c.status === 'UNDER_REVIEW' ||
					c.status === 'FORWARDED_TO_CLINICIAN'
			).length;
			stats.highPriority = allCases.filter((c) => c.priority >= 4).length;
			stats.critical = allCases.filter((c) => c.riskLevel === 'CRITICAL').length;

			isLoading = false;
		} catch (error) {
			console.error('Failed to load cases:', error);
			isLoading = false;
		}
	}

	function viewCase(caseItem: any) {
		selectedCase = caseItem;
		showCaseModal = true;
	}

	async function markAsCompleted(caseId: string) {
		if (!confirm('Mark this case as completed?')) return;

		actionLoading = true;
		try {
			const token = localStorage.getItem('auth_token');
			const response = await fetch('/api/cases/update-status', {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`
				},
				body: JSON.stringify({
					caseId,
					action: 'mark_completed'
				})
			});

			const result = await response.json();

			if (!response.ok || !result.success) {
				throw new Error(result.error || 'Failed to update case');
			}

			// Update the case status in the local state immediately
			if (selectedCase && selectedCase.id === caseId) {
				selectedCase.status = 'COMPLETED';
			}

			// Update in the allCases array
			const caseIndex = allCases.findIndex((c) => c.id === caseId);
			if (caseIndex !== -1) {
				allCases[caseIndex].status = 'COMPLETED';
				allCases = [...allCases]; // Trigger reactivity
			}

			alert('Case marked as completed successfully');
			showCaseModal = false;
			await loadCases();
		} catch (error) {
			console.error('Failed to mark case as completed:', error);
			alert(error instanceof Error ? error.message : 'Failed to update case');
		} finally {
			actionLoading = false;
		}
	}

	async function markAsClosed(caseId: string) {
		if (!confirm('Mark this case as closed?')) return;

		actionLoading = true;
		try {
			const token = localStorage.getItem('auth_token');
			const response = await fetch('/api/cases/update-status', {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`
				},
				body: JSON.stringify({
					caseId,
					action: 'mark_closed'
				})
			});

			const result = await response.json();

			if (!response.ok || !result.success) {
				throw new Error(result.error || 'Failed to close case');
			}

			// Update the case status in the local state immediately
			if (selectedCase && selectedCase.id === caseId) {
				selectedCase.status = 'CLOSED';
			}

			// Update in the allCases array
			const caseIndex = allCases.findIndex((c) => c.id === caseId);
			if (caseIndex !== -1) {
				allCases[caseIndex].status = 'CLOSED';
				allCases = [...allCases]; // Trigger reactivity
			}

			alert('Case marked as closed successfully');
			showCaseModal = false;
			await loadCases();
		} catch (error) {
			console.error('Failed to close case:', error);
			alert(error instanceof Error ? error.message : 'Failed to close case');
		} finally {
			actionLoading = false;
		}
	}

	function formatDate(dateString: string) {
		const date = new Date(dateString);
		return (
			date.toLocaleDateString() +
			' ' +
			date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
		);
	}

	function parseSymptoms(symptoms: any): string[] {
		if (!symptoms) return [];
		if (Array.isArray(symptoms)) return symptoms;
		if (typeof symptoms === 'string') {
			try {
				const parsed = JSON.parse(symptoms);
				return Array.isArray(parsed) ? parsed : [symptoms];
			} catch {
				// If not JSON, treat as comma-separated string
				return symptoms
					.split(',')
					.map((s: string) => s.trim())
					.filter((s: string) => s);
			}
		}
		return [];
	}

	function parseMediaUrls(mediaJson: any): string[] {
		if (!mediaJson) return [];
		if (Array.isArray(mediaJson)) return mediaJson;
		if (typeof mediaJson === 'string') {
			try {
				const parsed = JSON.parse(mediaJson);
				return Array.isArray(parsed) ? parsed : [];
			} catch {
				return [];
			}
		}
		return [];
	}

	function getRiskBadgeClass(riskLevel: string) {
		switch (riskLevel) {
			case 'CRITICAL':
				return 'bg-red-100 text-red-800 border-red-200';
			case 'HIGH':
				return 'bg-orange-100 text-orange-800 border-orange-200';
			case 'MEDIUM':
				return 'bg-yellow-100 text-yellow-800 border-yellow-200';
			case 'LOW':
				return 'bg-green-100 text-green-800 border-green-200';
			default:
				return 'bg-gray-100 text-gray-800 border-gray-200';
		}
	}

	function getStatusBadgeClass(status: string) {
		switch (status) {
			case 'PENDING':
				return 'bg-yellow-100 text-yellow-800';
			case 'UNDER_REVIEW':
				return 'bg-blue-100 text-blue-800';
			case 'FORWARDED_TO_CLINICIAN':
				return 'bg-purple-100 text-purple-800';
			case 'COMPLETED':
				return 'bg-green-100 text-green-800';
			case 'CLOSED':
				return 'bg-gray-100 text-gray-800';
			default:
				return 'bg-gray-100 text-gray-800';
		}
	}
</script>

{#if unauthorized}
	<div class="flex min-h-screen items-center justify-center bg-gray-50 p-4">
		<div class="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
			<h2 class="text-2xl font-bold text-gray-900 mb-3">Access Denied</h2>
			<p class="text-gray-600 mb-6">You don't have permission to access this page.</p>
			<a
				href="/"
				class="block w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
			>
				Return to Home
			</a>
		</div>
	</div>
{:else}
	<div class="min-h-screen bg-gray-50">
		<!-- Header -->
		<header class="bg-white shadow-sm border-b">
			<div class="max-w-7xl mx-auto px-4 py-4">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-4">
						<a
							href="/"
							class="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center hover:bg-blue-700 transition-colors"
							aria-label="Home"
						>
							<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
								/>
							</svg>
						</a>
						<div>
							<h1 class="text-xl font-bold text-gray-900">{$_('clinician.title')}</h1>
							<p class="text-sm text-gray-600">{$_('clinician.medicalReview')}</p>
						</div>
					</div>
					<div class="text-right">
						<p class="text-sm font-medium text-gray-900">{$authStore.user?.name}</p>
						<p class="text-xs text-gray-600">{$_('clinician.clinicianLabel')}</p>
					</div>
				</div>
			</div>
		</header>

		<div class="max-w-7xl mx-auto p-4 py-8">
			{#if isLoading}
				<div class="flex items-center justify-center py-20">
					<div class="text-center">
						<div
							class="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"
						></div>
						<p class="text-gray-600">{$_('clinician.loading')}</p>
					</div>
				</div>
			{:else}
				<div class="space-y-6">
					<!-- Stats Cards -->
					<div class="grid grid-cols-4 gap-6">
						<div class="bg-white rounded-lg shadow p-6">
							<p class="text-sm text-gray-600 mb-2">{$_('clinician.totalCases')}</p>
							<p class="text-3xl font-bold text-gray-900">{stats.totalCases}</p>
						</div>
						<div class="bg-white rounded-lg shadow p-6">
							<p class="text-sm text-gray-600 mb-2">{$_('clinician.pendingReview')}</p>
							<p class="text-3xl font-bold text-yellow-600">{stats.pendingReview}</p>
						</div>
						<div class="bg-white rounded-lg shadow p-6">
							<p class="text-sm text-gray-600 mb-2">{$_('clinician.highPriority')}</p>
							<p class="text-3xl font-bold text-orange-600">{stats.highPriority}</p>
						</div>
						<div class="bg-white rounded-lg shadow p-6">
							<p class="text-sm text-gray-600 mb-2">{$_('clinician.critical')}</p>
							<p class="text-3xl font-bold text-red-600">{stats.critical}</p>
						</div>
					</div>

					<!-- All Cases -->
					<div class="bg-white rounded-lg shadow">
						<div class="px-6 py-4 border-b border-gray-200">
							<h2 class="text-xl font-bold text-gray-900">{$_('clinician.allCases')}</h2>
							<p class="text-sm text-gray-600 mt-1">{$_('clinician.reviewManage')}</p>
						</div>
						{#if allCases.length === 0}
							<div class="p-8 text-center">
								<p class="text-gray-600">{$_('clinician.noCasesFound')}</p>
							</div>
						{:else}
							<div class="divide-y divide-gray-200">
								{#each allCases as caseItem}
									<div class="p-6 hover:bg-gray-50 transition-colors">
										<div class="flex items-start justify-between">
											<div class="flex-1">
												<div class="flex items-center gap-3 mb-2">
													<h3 class="text-lg font-bold text-gray-900">
														{caseItem.patient?.name || $_('clinician.unknownPatient')}
													</h3>
													{#if caseItem.riskLevel}
														<span
															class="px-3 py-1 rounded-full text-sm font-medium border {getRiskBadgeClass(
																caseItem.riskLevel
															)}"
														>
															{caseItem.riskLevel}
														</span>
													{/if}
													<span
														class="px-3 py-1 rounded-full text-sm font-medium {getStatusBadgeClass(
															caseItem.status
														)}"
													>
														{caseItem.status.replace(/_/g, ' ')}
													</span>
												</div>

												<div class="grid grid-cols-4 gap-4 text-sm mb-3">
													<div>
														<span class="text-gray-600">Age:</span>
														<span class="font-medium text-gray-900 ml-1"
															>{caseItem.patient?.age} years</span
														>
													</div>
													<div>
														<span class="text-gray-600">Gender:</span>
														<span class="font-medium text-gray-900 ml-1"
															>{caseItem.patient?.gender}</span
														>
													</div>
													<div>
														<span class="text-gray-600">Priority:</span>
														<span class="font-bold text-gray-900 ml-1">{caseItem.priority}/5</span>
													</div>
													<div>
														<span class="text-gray-600">Risk Score:</span>
														<span class="font-bold text-gray-900 ml-1"
															>{caseItem.riskScore || 0}/100</span
														>
													</div>
												</div>

												<div class="mb-3">
													<p class="text-sm text-gray-600 mb-1">Symptoms:</p>
													<div class="flex flex-wrap gap-2">
														{#each parseSymptoms(caseItem.symptoms) as symptom}
															<span class="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs"
																>{symptom}</span
															>
														{/each}
													</div>
												</div>
												<div class="flex items-center gap-4 text-xs text-gray-600">
													<span>CHW: {caseItem.user?.name || 'Unknown'}</span>
													<span
														>Location: {caseItem.patient?.village ||
															caseItem.location ||
															'N/A'}</span
													>
													<span>Reported: {formatDate(caseItem.createdAt)}</span>
												</div>
											</div>

											<div class="flex flex-col gap-2 ml-6">
												<button
													onclick={() => viewCase(caseItem)}
													class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium whitespace-nowrap"
												>
													View Details
												</button>
												{#if caseItem.status !== 'CLOSED' && caseItem.status !== 'COMPLETED'}
													<button
														onclick={() => markAsCompleted(caseItem.id)}
														class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium whitespace-nowrap"
													>
														Complete
													</button>
													<button
														onclick={() => markAsClosed(caseItem.id)}
														class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium whitespace-nowrap"
													>
														Close
													</button>
												{/if}
											</div>
										</div>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				</div>
			{/if}
		</div>
	</div>

	<!-- Case Details Modal -->
	{#if showCaseModal && selectedCase}
		<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
			<div class="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
				<div class="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
					<h2 class="text-2xl font-bold text-gray-900">Case Details</h2>
					<button
						onclick={() => (showCaseModal = false)}
						class="text-gray-400 hover:text-gray-600"
						aria-label="Close modal"
					>
						<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
					</button>
				</div>

				<div class="p-6 space-y-6">
					<!-- Patient Info -->
					<div>
						<h3 class="font-bold text-gray-900 mb-3">Patient Information</h3>
						<div class="grid grid-cols-2 gap-4 text-sm">
							<div>
								<span class="text-gray-600">Name:</span>
								<span class="font-medium text-gray-900 ml-2">{selectedCase.patient?.name}</span>
							</div>
							<div>
								<span class="text-gray-600">Age:</span>
								<span class="font-medium text-gray-900 ml-2">{selectedCase.patient?.age} years</span
								>
							</div>
							<div>
								<span class="text-gray-600">Gender:</span>
								<span class="font-medium text-gray-900 ml-2">{selectedCase.patient?.gender}</span>
							</div>
							<div>
								<span class="text-gray-600">Phone:</span>
								<span class="font-medium text-gray-900 ml-2"
									>{selectedCase.patient?.phone || 'N/A'}</span
								>
							</div>
							<div>
								<span class="text-gray-600">Village:</span>
								<span class="font-medium text-gray-900 ml-2"
									>{selectedCase.patient?.village || 'N/A'}</span
								>
							</div>
						</div>
					</div>

					<!-- Case Info -->
					<div>
						<h3 class="font-bold text-gray-900 mb-3">Case Information</h3>
						<div class="space-y-3">
							<div class="flex items-center gap-4">
								<span
									class="px-4 py-2 rounded-lg border text-sm font-medium {getRiskBadgeClass(
										selectedCase.riskLevel
									)}"
								>
									{selectedCase.riskLevel} RISK
								</span>
								<span
									class="px-4 py-2 rounded-lg text-sm font-medium {getStatusBadgeClass(
										selectedCase.status
									)}"
								>
									{selectedCase.status.replace(/_/g, ' ')}
								</span>
								<span class="text-sm text-gray-600"
									>Priority: <span class="font-bold">{selectedCase.priority}/5</span></span
								>
								<span class="text-sm text-gray-600"
									>Risk Score: <span class="font-bold">{selectedCase.riskScore || 0}/100</span
									></span
								>
							</div>

							<div>
								<p class="text-sm text-gray-600 mb-2">Symptoms:</p>
								<div class="flex flex-wrap gap-2">
									{#each parseSymptoms(selectedCase.symptoms) as symptom}
										<span class="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
											>{symptom}</span
										>
									{/each}
								</div>
							</div>
							{#if selectedCase.notes}
								<div>
									<p class="text-sm text-gray-600 mb-1">AI Assessment & Notes:</p>
									<div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
										<p class="text-gray-900 whitespace-pre-wrap text-sm">{selectedCase.notes}</p>
									</div>
								</div>
							{/if}

							{#if parseMediaUrls(selectedCase.images).length > 0}
								<div>
									<p class="text-sm text-gray-600 mb-2">Attached Images:</p>
									<div class="grid grid-cols-3 gap-4">
										{#each parseMediaUrls(selectedCase.images) as imageUrl}
											<img
												src={imageUrl}
												alt="Patient"
												class="w-full h-32 object-cover rounded-lg border border-gray-200 hover:scale-105 transition-transform cursor-pointer"
											/>
										{/each}
									</div>
								</div>
							{/if}

							{#if parseMediaUrls(selectedCase.audioRecordings).length > 0}
								<div>
									<p class="text-sm text-gray-600 mb-2">Voice Recording:</p>
									{#each parseMediaUrls(selectedCase.audioRecordings) as audioUrl}
										<audio controls src={audioUrl} class="w-full"></audio>
									{/each}
								</div>
							{/if}
						</div>
					</div>

					<!-- Metadata -->
					<div>
						<h3 class="font-bold text-gray-900 mb-3">Case Metadata</h3>
						<div class="text-sm text-gray-600 space-y-1">
							<p>
								CHW: <span class="text-gray-900 font-medium"
									>{selectedCase.user?.name || 'Unknown'}</span
								>
							</p>
							<p>
								Reported: <span class="text-gray-900 font-medium"
									>{formatDate(selectedCase.createdAt)}</span
								>
							</p>
							<p>
								Last Updated: <span class="text-gray-900 font-medium"
									>{formatDate(selectedCase.updatedAt)}</span
								>
							</p>
							{#if selectedCase.forwardedBy}
								<p>Forwarded By: <span class="text-gray-900 font-medium">ASHA Worker</span></p>
								<p>
									Forwarded At: <span class="text-gray-900 font-medium"
										>{formatDate(selectedCase.forwardedAt)}</span
									>
								</p>
							{/if}
							{#if selectedCase.closedBy}
								<p>
									Closed By: <span class="text-gray-900 font-medium">{selectedCase.closedBy}</span>
								</p>
								<p>
									Closed At: <span class="text-gray-900 font-medium"
										>{formatDate(selectedCase.closedAt)}</span
									>
								</p>
							{/if}
						</div>
					</div>

					<!-- Actions -->
					{#if selectedCase.status !== 'CLOSED' && selectedCase.status !== 'COMPLETED'}
						<div class="flex gap-4 pt-4 border-t">
							<button
								onclick={() => markAsCompleted(selectedCase.id)}
								disabled={actionLoading}
								class="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors font-medium"
							>
								{actionLoading ? 'Processing...' : 'Mark as Completed'}
							</button>
							<button
								onclick={() => markAsClosed(selectedCase.id)}
								disabled={actionLoading}
								class="flex-1 bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors font-medium"
							>
								{actionLoading ? 'Processing...' : 'Mark as Closed'}
							</button>
						</div>
					{/if}
				</div>
			</div>
		</div>
	{/if}
{/if}

<style>
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
	.animate-spin {
		animation: spin 1s linear infinite;
	}
</style>
