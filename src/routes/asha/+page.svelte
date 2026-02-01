<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { _ } from 'svelte-i18n';
	import { authStore } from '$lib/stores/auth-store';
	import { apiClient } from '$lib/api-client';
	import { get } from 'svelte/store';
	import { caseUpdates } from '$lib/stores/pusher-store';

	let unauthorized = false;
	let isLoading = true;
	let activeTab: 'overview' | 'cases' = 'overview';

	// Cases data
	let allCases: any[] = [];
	let highPriorityCases: any[] = [];
	let selectedCase: any = null;
	let showCaseModal = false;
	let actionLoading = false;

	// Stats
	let stats = {
		totalCases: 0,
		pendingCases: 0,
		highRiskCases: 0,
		criticalCases: 0
	};

	onMount(() => {
		const state = get(authStore);
		if (!state.isAuthenticated) {
			goto('/auth', { replaceState: true });
			return;
		}

		const allowedRoles = ['ASHA', 'ASHA_SUPERVISOR', 'CLINICIAN', 'ADMIN'];
		if (!allowedRoles.includes(state.user?.role || '')) {
			unauthorized = true;
			return;
		}

		loadCases();

		// Subscribe to real-time case updates (Pusher initialized in layout)
		const unsubscribe = caseUpdates.subscribe((updates) => {
			if (updates.length > 0) {
				console.log('Received case update:', updates);
				loadCases();
			}
		});

		const interval = setInterval(loadCases, 30000); // Refresh every 30s
		return () => {
			clearInterval(interval);
			unsubscribe();
		};
	});

	async function loadCases() {
		try {
			isLoading = true;
			const response = await apiClient.cases.list({});
			allCases = response.cases || [];

			// Filter high/critical priority cases
			highPriorityCases = allCases.filter(
				(c) =>
					(c.riskLevel === 'HIGH' || c.riskLevel === 'CRITICAL') &&
					(c.status === 'PENDING' || c.status === 'UNDER_REVIEW')
			);

			// Calculate stats
			stats.totalCases = allCases.length;
			stats.pendingCases = allCases.filter((c) => c.status === 'PENDING').length;
			stats.highRiskCases = allCases.filter((c) => c.riskLevel === 'HIGH').length;
			stats.criticalCases = allCases.filter((c) => c.riskLevel === 'CRITICAL').length;

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

	async function forwardToClinician(caseId: string) {
		if (!confirm('Forward this case to a clinician?')) return;

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
					action: 'forward_to_clinician'
				})
			});

			const result = await response.json();

			if (!response.ok || !result.success) {
				throw new Error(result.error || 'Failed to forward case');
			}

			alert('Case forwarded to clinician successfully');
			showCaseModal = false;
			await loadCases();
		} catch (error) {
			console.error('Failed to forward case:', error);
			alert(error instanceof Error ? error.message : 'Failed to forward case');
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
	<div class="flex min-h-screen items-center justify-center bg-background p-4">
		<div class="w-full max-w-md rounded-lg bg-surface p-8 text-center shadow-lg">
			<h2 class="mb-3 text-2xl font-bold text-surface-emphasis">{$_('asha.accessDenied')}</h2>
			<p class="mb-6 text-surface-muted">{$_('asha.noPermission')}</p>
			<a
				href="/"
				class="block w-full rounded-lg bg-brand px-6 py-3 font-semibold text-white transition-colors hover:bg-brand-dark"
			>
				{$_('asha.returnHome')}
			</a>
		</div>
	</div>
{:else}
	<div class="min-h-screen bg-background">
		<!-- Header -->
		<header
			class="bg-surface shadow-sm border-b border-border/50 sticky top-0 z-50 backdrop-blur-md bg-surface/90"
		>
			<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
				<div class="flex items-center gap-4">
					<a
						href="/"
						class="w-10 h-10 bg-brand rounded-xl flex items-center justify-center hover:bg-brand/90 transition-all shadow-sm hover:shadow-brand/20"
						aria-label="Home"
					>
						<svg
							class="h-6 w-6 text-brand-foreground"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
							/>
						</svg>
					</a>
					<div>
						<h1 class="text-xl font-bold text-surface-emphasis">{$_('asha.portalTitle')}</h1>
						<p class="text-sm text-muted">{$_('asha.portalSubtitle')}</p>
					</div>
				</div>
				<div class="flex items-center gap-3">
					<div class="hidden md:block text-right">
						<p class="text-sm font-bold text-surface-emphasis">{$authStore.user?.name}</p>
						<p class="text-xs text-muted">{$_('asha.ashaWorker')}</p>
					</div>
					<div
						class="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold border border-accent/20"
					>
						{$authStore.user?.name?.charAt(0) || 'A'}
					</div>
				</div>
			</div>
		</header>

		<!-- Tabs -->
		<div class="border-b border-border bg-surface">
			<div class="mx-auto max-w-7xl px-4">
				<div class="flex gap-8">
					<button
						onclick={() => (activeTab = 'overview')}
						class="border-b-2 py-4 font-medium transition-colors {activeTab === 'overview'
							? 'border-brand text-brand'
							: 'border-transparent text-surface-muted hover:text-surface-emphasis'}"
					>
						Overview
					</button>
					<button
						onclick={() => (activeTab = 'cases')}
						class="border-b-2 py-4 font-medium transition-colors {activeTab === 'cases'
							? 'border-brand text-brand'
							: 'border-transparent text-surface-muted hover:text-surface-emphasis'}"
					>
						All Cases
					</button>
				</div>
			</div>
		</div>

		<div class="mx-auto max-w-7xl p-4 py-8">
			{#if isLoading}
				<div class="flex items-center justify-center py-20">
					<div class="text-center">
						<div
							class="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-4 border-brand border-t-transparent"
						></div>
						<p class="text-surface-muted">{$_('asha.loading')}</p>
					</div>
				</div>
			{:else if activeTab === 'overview'}
				<!-- Overview Tab -->
				<div class="space-y-6">
					<!-- Stats Cards -->
					<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
						<div class="rounded-lg bg-surface p-6 shadow-sm ring-1 ring-border">
							<p class="mb-2 text-sm text-surface-muted">{$_('asha.totalCases')}</p>
							<p class="text-3xl font-bold text-surface-emphasis">{stats.totalCases}</p>
						</div>
						<div class="rounded-lg bg-surface p-6 shadow-sm ring-1 ring-border">
							<p class="mb-2 text-sm text-surface-muted">{$_('asha.pendingCases')}</p>
							<p class="text-3xl font-bold text-yellow-600">{stats.pendingCases}</p>
						</div>
						<div class="rounded-lg bg-surface p-6 shadow-sm ring-1 ring-border">
							<p class="mb-2 text-sm text-surface-muted">{$_('asha.highRiskCases')}</p>
							<p class="text-3xl font-bold text-orange-600">{stats.highRiskCases}</p>
						</div>
						<div class="rounded-lg bg-surface p-6 shadow-sm ring-1 ring-border">
							<p class="mb-2 text-sm text-surface-muted">{$_('asha.criticalCases')}</p>
							<p class="text-3xl font-bold text-red-600">{stats.criticalCases}</p>
						</div>
					</div>

					<!-- High Priority Cases Requiring Action -->
					<div class="rounded-lg bg-surface shadow-sm ring-1 ring-border">
						<div class="border-b border-border px-6 py-4">
							<h2 class="text-xl font-bold text-surface-emphasis">
								{$_('asha.highPriorityCases')}
							</h2>
							<p class="mt-1 text-sm text-surface-muted">{$_('asha.requiresAttention')}</p>
						</div>
						{#if highPriorityCases.length === 0}
							<div class="p-8 text-center">
								<svg
									class="mx-auto mb-4 h-16 w-16 text-green-500"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
									/>
								</svg>
								<p class="font-medium text-surface-emphasis">{$_('asha.noCasesFound')}</p>
								<p class="mt-1 text-sm text-surface-muted">{$_('common.allCasesAddressed')}</p>
							</div>
						{:else}
							<div class="divide-y divide-border">
								{#each highPriorityCases as caseItem}
									<div class="p-6 transition-colors hover:bg-surface-soft">
										<div class="flex items-start justify-between">
											<div class="flex-1">
												<div class="mb-2 flex items-center gap-3">
													<h3 class="text-lg font-bold text-surface-emphasis">
														{caseItem.patient?.name || 'Unknown Patient'}
													</h3>
													<span
														class="rounded-full border px-3 py-1 text-sm font-medium {getRiskBadgeClass(
															caseItem.riskLevel
														)}"
													>
														{caseItem.riskLevel}
													</span>
													<span
														class="rounded-full px-3 py-1 text-sm font-medium {getStatusBadgeClass(
															caseItem.status
														)}"
													>
														{caseItem.status.replace(/_/g, ' ')}
													</span>
												</div>

												<div class="mb-3 grid grid-cols-3 gap-4 text-sm">
													<div>
														<span class="text-surface-muted">Age:</span>
														<span class="ml-1 font-medium text-surface-emphasis"
															>{caseItem.patient?.age} years</span
														>
													</div>
													<div>
														<span class="text-surface-muted">Gender:</span>
														<span class="ml-1 font-medium text-surface-emphasis"
															>{caseItem.patient?.gender}</span
														>
													</div>
													<div>
														<span class="text-surface-muted">Risk Score:</span>
														<span class="ml-1 font-bold text-surface-emphasis"
															>{caseItem.riskScore || 0}/100</span
														>
													</div>
												</div>

												<div class="mb-3">
													<p class="mb-1 text-sm text-surface-muted">Symptoms:</p>
													<div class="flex flex-wrap gap-2">
														{#each parseSymptoms(caseItem.symptoms) as symptom}
															<span class="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-800"
																>{symptom}</span
															>
														{/each}
													</div>
												</div>

												<div class="flex items-center gap-4 text-xs text-surface-muted">
													<span>CHW: {caseItem.user?.name || 'Unknown'}</span>
													<span
														>Location: {caseItem.patient?.village ||
															caseItem.location ||
															'N/A'}</span
													>
													<span>Reported: {formatDate(caseItem.createdAt)}</span>
												</div>
											</div>

											<div class="ml-6 flex flex-col gap-2">
												<button
													onclick={() => viewCase(caseItem)}
													class="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-dark"
												>
													View Details
												</button>
												{#if caseItem.status !== 'CLOSED' && caseItem.status !== 'COMPLETED' && caseItem.status !== 'FORWARDED_TO_CLINICIAN'}
													<button
														onclick={() => forwardToClinician(caseItem.id)}
														class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
													>
														Forward to Clinician
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
			{:else if activeTab === 'cases'}
				<!-- All Cases Tab -->
				<div class="rounded-lg bg-surface shadow-sm ring-1 ring-border">
					<div class="border-b border-border px-6 py-4">
						<h2 class="text-xl font-bold text-surface-emphasis">All Cases</h2>
						<p class="mt-1 text-sm text-surface-muted">Complete list of reported cases</p>
					</div>

					{#if allCases.length === 0}
						<div class="p-8 text-center">
							<p class="text-surface-muted">No cases found</p>
						</div>
					{:else}
						<div class="divide-y divide-border">
							{#each allCases as caseItem}
								<div class="p-6 transition-colors hover:bg-surface-soft">
									<div class="flex items-start justify-between">
										<div class="flex-1">
											<div class="mb-2 flex items-center gap-3">
												<h3 class="text-lg font-bold text-surface-emphasis">
													{caseItem.patient?.name || 'Unknown Patient'}
												</h3>
												{#if caseItem.riskLevel}
													<span
														class="rounded-full border px-3 py-1 text-sm font-medium {getRiskBadgeClass(
															caseItem.riskLevel
														)}"
													>
														{caseItem.riskLevel}
													</span>
												{/if}
												<span
													class="rounded-full px-3 py-1 text-sm font-medium {getStatusBadgeClass(
														caseItem.status
													)}"
												>
													{caseItem.status.replace(/_/g, ' ')}
												</span>
											</div>

											<div class="mb-3 grid grid-cols-4 gap-4 text-sm">
												<div>
													<span class="text-surface-muted">Age:</span>
													<span class="ml-1 font-medium text-surface-emphasis"
														>{caseItem.patient?.age} years</span
													>
												</div>
												<div>
													<span class="text-surface-muted">Gender:</span>
													<span class="ml-1 font-medium text-surface-emphasis"
														>{caseItem.patient?.gender}</span
													>
												</div>
												<div>
													<span class="text-surface-muted">Priority:</span>
													<span class="ml-1 font-bold text-surface-emphasis"
														>{caseItem.priority}/5</span
													>
												</div>
												<div>
													<span class="text-surface-muted">Risk Score:</span>
													<span class="ml-1 font-bold text-surface-emphasis"
														>{caseItem.riskScore || 0}/100</span
													>
												</div>
											</div>

											<div class="mb-3">
												<p class="mb-1 text-sm text-surface-muted">Symptoms:</p>
												<div class="flex flex-wrap gap-2">
													{#each parseSymptoms(caseItem.symptoms) as symptom}
														<span class="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-800"
															>{symptom}</span
														>
													{/each}
												</div>
											</div>
											<div class="flex items-center gap-4 text-xs text-surface-muted">
												<span>CHW: {caseItem.user?.name || 'Unknown'}</span>
												<span
													>Location: {caseItem.patient?.village || caseItem.location || 'N/A'}</span
												>
												<span>Reported: {formatDate(caseItem.createdAt)}</span>
											</div>
										</div>

										<div class="ml-6 flex flex-col gap-2">
											<button
												onclick={() => viewCase(caseItem)}
												class="whitespace-nowrap rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-dark"
											>
												View Details
											</button>
											{#if caseItem.status !== 'CLOSED' && caseItem.status !== 'COMPLETED'}
												<button
													onclick={() => forwardToClinician(caseItem.id)}
													class="whitespace-nowrap rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
												>
													Forward
												</button>
												<button
													onclick={() => markAsClosed(caseItem.id)}
													class="whitespace-nowrap rounded-lg bg-surface-muted px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-surface-emphasis"
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
			{/if}
		</div>
	</div>

	<!-- Case Details Modal -->
	{#if showCaseModal && selectedCase}
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
			<div class="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-lg bg-surface shadow-xl">
				<div
					class="sticky top-0 flex items-center justify-between border-b border-border bg-surface px-6 py-4"
				>
					<h2 class="text-2xl font-bold text-surface-emphasis">Case Details</h2>
					<button
						onclick={() => (showCaseModal = false)}
						class="text-surface-muted hover:text-surface-emphasis"
						aria-label="Close modal"
					>
						<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
					</button>
				</div>

				<div class="space-y-6 p-6">
					<!-- Patient Info -->
					<div>
						<h3 class="mb-3 font-bold text-surface-emphasis">Patient Information</h3>
						<div class="grid grid-cols-2 gap-4 text-sm">
							<div>
								<span class="text-surface-muted">Name:</span>
								<span class="ml-2 font-medium text-surface-emphasis"
									>{selectedCase.patient?.name}</span
								>
							</div>
							<div>
								<span class="text-surface-muted">Age:</span>
								<span class="ml-2 font-medium text-surface-emphasis"
									>{selectedCase.patient?.age} years</span
								>
							</div>
							<div>
								<span class="text-surface-muted">Gender:</span>
								<span class="ml-2 font-medium text-surface-emphasis"
									>{selectedCase.patient?.gender}</span
								>
							</div>
							<div>
								<span class="text-surface-muted">Phone:</span>
								<span class="ml-2 font-medium text-surface-emphasis"
									>{selectedCase.patient?.phone || 'N/A'}</span
								>
							</div>
							<div>
								<span class="text-surface-muted">Village:</span>
								<span class="ml-2 font-medium text-surface-emphasis"
									>{selectedCase.patient?.village || 'N/A'}</span
								>
							</div>
						</div>
					</div>

					<!-- Case Info -->
					<div>
						<h3 class="mb-3 font-bold text-surface-emphasis">Case Information</h3>
						<div class="space-y-3">
							<div class="flex items-center gap-4">
								<span
									class="rounded-lg border px-4 py-2 text-sm font-medium {getRiskBadgeClass(
										selectedCase.riskLevel
									)}"
								>
									{selectedCase.riskLevel} RISK
								</span>
								<span
									class="rounded-lg px-4 py-2 text-sm font-medium {getStatusBadgeClass(
										selectedCase.status
									)}"
								>
									{selectedCase.status.replace(/_/g, ' ')}
								</span>
								<span class="text-sm text-surface-muted"
									>Priority: <span class="font-bold">{selectedCase.priority}/5</span></span
								>
								<span class="text-sm text-surface-muted"
									>Risk Score: <span class="font-bold">{selectedCase.riskScore || 0}/100</span
									></span
								>
							</div>

							<div>
								<p class="mb-2 text-sm text-surface-muted">Symptoms:</p>
								<div class="flex flex-wrap gap-2">
									{#each parseSymptoms(selectedCase.symptoms) as symptom}
										<span class="rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800"
											>{symptom}</span
										>
									{/each}
								</div>
							</div>
							{#if selectedCase.notes}
								<div>
									<p class="mb-1 text-sm text-surface-muted">Notes:</p>
									<div class="rounded-lg border border-border bg-surface-soft p-4">
										<p class="whitespace-pre-wrap text-sm text-surface-emphasis">
											{selectedCase.notes}
										</p>
									</div>
								</div>
							{/if}

							{#if parseMediaUrls(selectedCase.images).length > 0}
								<div>
									<p class="mb-2 text-sm text-surface-muted">Attached Images:</p>
									<div class="grid grid-cols-3 gap-4">
										{#each parseMediaUrls(selectedCase.images) as imageUrl}
											<img
												src={imageUrl}
												alt="Patient"
												class="h-32 w-full cursor-pointer rounded-lg border border-border object-cover transition-transform hover:scale-105"
											/>
										{/each}
									</div>
								</div>
							{/if}

							{#if parseMediaUrls(selectedCase.audioRecordings).length > 0}
								<div>
									<p class="mb-2 text-sm text-surface-muted">Voice Recording:</p>
									{#each parseMediaUrls(selectedCase.audioRecordings) as audioUrl}
										<audio controls src={audioUrl} class="w-full"></audio>
									{/each}
								</div>
							{/if}
						</div>
					</div>

					<!-- Metadata -->
					<div>
						<h3 class="mb-3 font-bold text-surface-emphasis">Metadata</h3>
						<div class="space-y-1 text-sm text-surface-muted">
							<p>
								CHW: <span class="font-medium text-surface-emphasis"
									>{selectedCase.user?.name || 'Unknown'}</span
								>
							</p>
							<p>
								Reported: <span class="font-medium text-surface-emphasis"
									>{formatDate(selectedCase.createdAt)}</span
								>
							</p>
							<p>
								Last Updated: <span class="font-medium text-surface-emphasis"
									>{formatDate(selectedCase.updatedAt)}</span
								>
							</p>
							{#if selectedCase.forwardedBy}
								<p>
									Forwarded By: <span class="font-medium text-surface-emphasis">ASHA Worker</span>
								</p>
								<p>
									Forwarded At: <span class="font-medium text-surface-emphasis"
										>{formatDate(selectedCase.forwardedAt)}</span
									>
								</p>
							{/if}
							{#if selectedCase.closedBy}
								<p>
									Closed By: <span class="font-medium text-surface-emphasis"
										>{selectedCase.closedBy}</span
									>
								</p>
								<p>
									Closed At: <span class="font-medium text-surface-emphasis"
										>{formatDate(selectedCase.closedAt)}</span
									>
								</p>
							{/if}
						</div>
					</div>

					<!-- Actions -->
					{#if selectedCase.status !== 'CLOSED' && selectedCase.status !== 'COMPLETED'}
						<div class="flex gap-4 border-t border-border pt-4">
							<button
								onclick={() => forwardToClinician(selectedCase.id)}
								disabled={actionLoading}
								class="flex-1 rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
							>
								{actionLoading ? 'Processing...' : 'Forward to Clinician'}
							</button>
							<button
								onclick={() => markAsClosed(selectedCase.id)}
								disabled={actionLoading}
								class="flex-1 rounded-lg bg-surface-muted px-6 py-3 font-medium text-white transition-colors hover:bg-surface-emphasis disabled:opacity-50"
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
