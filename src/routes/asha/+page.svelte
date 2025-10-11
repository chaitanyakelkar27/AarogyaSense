<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { writable, get } from 'svelte/store';
	import { authStore } from '$lib/stores/auth-store';
	import { apiClient } from '$lib/api-client';
	import OfflineDataManager from '$lib/offline-data-manager';
	import PrivacySecurityFramework from '$lib/privacy-security-framework';
	
	// Initialize backend systems (will be instantiated in onMount)
	let dataManager: OfflineDataManager;
	let securityFramework: PrivacySecurityFramework;
	
	// Loading states
	let isLoading = true;
	let isRefreshing = false;
	let errorMessage = '';

	// Dashboard state management
	const dashboardData = writable({
		cases: [],
		chwPerformance: {},
		communityMetrics: {},
		pendingApprovals: [],
		alerts: []
	});

	// UI state
	let activeTab = 'overview';
	let selectedTimeRange = '7d';
	let selectedCHW = 'all';
	let selectedCase: any = null;
	let showCaseDetails = false;
	let filterStatus = 'all';
	let searchQuery = '';

	// Data stores
	let allCases: any[] = [];
	let chwList: any[] = [];
	let filteredCases: any[] = [];
	let dashboardStats = {
		totalCases: 0,
		pendingReview: 0,
		highRiskCases: 0,
		activeCHWs: 0,
		completionRate: 0,
		averageResponseTime: 0
	};

	// Performance tracking
	let performanceMetrics: any = {
		caseVolume: [],
		accuracyScores: [],
		responseTimesTrend: [],
		communityOutreach: []
	};

	let unauthorized = false;

	onMount(() => {
		// Simple one-time auth check using get()
		const state = get(authStore);
		if (!state.isAuthenticated) {
			goto('/auth', { replaceState: true });
			return;
		}
		
		// Check if user has permission to access ASHA portal
		const allowedRoles = ['ASHA', 'ASHA_SUPERVISOR', 'CLINICIAN', 'DOCTOR', 'ADMIN'];
		if (!allowedRoles.includes(state.user?.role || '')) {
			unauthorized = true;
			return;
		}

		// Initialize backend systems in browser only
		dataManager = new OfflineDataManager();
		securityFramework = new PrivacySecurityFramework();
		
		loadDashboardData();
		initializeFilters();
		const interval = setInterval(loadDashboardData, 30000); // Refresh every 30 seconds

		return () => {
			clearInterval(interval);
		};
	});

	async function loadDashboardData() {
		try {
			isRefreshing = true;
			errorMessage = '';

			// Load CHW users from API
			const chwResponse = await apiClient.chw.list({ active: true });
			chwList = chwResponse.chws.map((chw: any) => ({
				id: chw.id,
				name: chw.name,
				location: chw.location || 'Unknown',
				active: chw.isActive,
				email: chw.email,
				phone: chw.phone,
				stats: chw.stats
			}));

			// Load cases from API
			const casesResponse = await apiClient.cases.list({});
			const apiCases = casesResponse.cases || [];

			// Also load offline cases from IndexedDB
			const offlineCases = await dataManager.queryRecords('cases', {});

			// Merge and deduplicate cases
			const casesMap = new Map();
			
			// Add API cases
			apiCases.forEach((c: any) => {
				casesMap.set(c.id, {
					...c,
					assignedCHW: chwList.find(chw => chw.id === c.userId) || { name: 'Unknown' },
					reviewStatus: c.status.toLowerCase(),
					lastUpdated: new Date(c.updatedAt).getTime(),
					timestamp: c.createdAt,
					patient: c.patient || { name: 'Unknown' },
					synced: true
				});
			});

			// Add offline cases (not yet synced)
			offlineCases.forEach((c: any) => {
				if (!casesMap.has(c.id)) {
					casesMap.set(c.id, {
						...c,
						assignedCHW: chwList.find(chw => chw.id === c.userId) || { name: 'Unknown' },
						reviewStatus: 'pending',
						lastUpdated: new Date(c.timestamp).getTime(),
						synced: false
					});
				}
			});

		allCases = Array.from(casesMap.values());
		calculateDashboardStats();
		filterCases();
		await generatePerformanceMetrics();		} catch (error: any) {
			console.error('Failed to load dashboard data:', error);
			errorMessage = error.message || 'Failed to load data';
			
			// Fallback to offline data only
			try {
				const offlineCases = await dataManager.queryRecords('cases', {});
				allCases = offlineCases;
				calculateDashboardStats();
				filterCases();
			} catch (offlineError) {
				console.error('Failed to load offline data:', offlineError);
			}
		} finally {
			isLoading = false;
			isRefreshing = false;
		}
	}

	function generateTreatmentPlan(aiAnalysis: any) {
		if (!aiAnalysis) return null;
		
		const plans: Record<string, string[]> = {
			low: ['Continue monitoring', 'Follow-up in 7 days', 'Home care guidance'],
			medium: ['Medication prescribed', 'Follow-up in 3 days', 'Symptom monitoring'],
			high: ['Immediate medication', 'Daily check-ups', 'Referral preparation'],
			critical: ['Emergency protocol', 'Immediate referral', 'Continuous monitoring']
		};

		return {
			status: aiAnalysis.riskLevel === 'low' || aiAnalysis.riskLevel === 'medium' ? 'approved' : 'pending_approval',
			actions: plans[aiAnalysis.riskLevel] || [],
			approvedBy: aiAnalysis.riskLevel === 'low' ? 'auto_approved' : null,
			approvalDate: aiAnalysis.riskLevel === 'low' ? new Date().toISOString() : null
		};
	}

	function calculateDashboardStats() {
		dashboardStats = {
			totalCases: allCases.length,
			pendingReview: allCases.filter((c: any) => c.reviewStatus.includes('pending')).length,
			highRiskCases: allCases.filter((c: any) => c.aiAnalysis?.riskLevel === 'high' || c.aiAnalysis?.riskLevel === 'critical').length,
			activeCHWs: chwList.filter((chw: any) => chw.active).length,
			completionRate: Math.round((allCases.filter((c: any) => c.reviewStatus === 'auto_approved' || c.treatmentPlan?.status === 'approved').length / allCases.length) * 100) || 0,
			averageResponseTime: Math.round(Math.random() * 120 + 30) // Simulated in minutes
		};
	}

	function filterCases() {
		filteredCases = allCases.filter((case_item: any) => {
			const matchesSearch = !searchQuery || 
				case_item.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
				case_item.assignedCHW.name.toLowerCase().includes(searchQuery.toLowerCase());
			
			const matchesStatus = filterStatus === 'all' || case_item.reviewStatus === filterStatus;
			
			const matchesCHW = selectedCHW === 'all' || case_item.assignedCHW.id === selectedCHW;
			
			const matchesTimeRange = isWithinTimeRange(case_item.timestamp, selectedTimeRange);
			
			return matchesSearch && matchesStatus && matchesCHW && matchesTimeRange;
		}).sort((a: any, b: any) => {
			// Sort by priority: critical first, then by timestamp
			const priorityOrder: Record<string, number> = { 'pending_urgent': 0, 'pending_review': 1, 'pending_analysis': 2, 'auto_approved': 3 };
			const aPriority = priorityOrder[a.reviewStatus] || 4;
			const bPriority = priorityOrder[b.reviewStatus] || 4;
			
			if (aPriority !== bPriority) return aPriority - bPriority;
			return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
		});
	}

	function isWithinTimeRange(timestamp: string, range: string): boolean {
		const now = new Date().getTime();
		const caseTime = new Date(timestamp).getTime();
		const ranges: Record<string, number> = {
			'1d': 24 * 60 * 60 * 1000,
			'7d': 7 * 24 * 60 * 60 * 1000,
			'30d': 30 * 24 * 60 * 60 * 1000,
			'all': Infinity
		};
		return now - caseTime <= ranges[range];
	}

	async function generatePerformanceMetrics() {
		try {
			// Fetch real analytics data from backend
			const analytics = await apiClient.analytics.chwPerformance({ days: 7 });

			// Transform API data to match UI format
			performanceMetrics = {
				caseVolume: analytics.volumeTrend.map((item: any) => ({
					date: item.date,
					cases: item.count,
					completed: 0 // We don't have per-day completion data yet
				})),
				accuracyScores: analytics.byCHW.map((stat: any) => ({
					name: stat.name,
					accuracy: stat.approvalRate,
					cases: stat.totalCases
				})),
				responseTimesTrend: analytics.volumeTrend.map((item: any) => ({
					date: item.date,
					avgTime: analytics.summary.avgResponseTime // Use overall avg for now
				})),
				communityOutreach: [
					{ metric: 'Total Cases', value: analytics.summary.totalCases },
					{ metric: 'Approved Cases', value: analytics.summary.approvedCases },
					{ metric: 'Pending Review', value: analytics.summary.pendingCases },
					{ metric: 'Critical Cases', value: analytics.summary.criticalCases }
				]
			};
		} catch (error) {
			console.error('Failed to fetch performance metrics:', error);
			
			// Fallback to basic metrics if API fails
			performanceMetrics = {
				caseVolume: [],
				accuracyScores: chwList.map((chw: any) => ({
					name: chw.name,
					accuracy: 0,
					cases: chw.totalCases || 0
				})),
				responseTimesTrend: [],
				communityOutreach: [
					{ metric: 'Total Cases', value: dashboardStats.totalCases },
					{ metric: 'Approved Cases', value: 0 },
					{ metric: 'Pending Review', value: dashboardStats.pendingReview },
					{ metric: 'Critical Cases', value: dashboardStats.highRiskCases }
				]
			};
		}
	}

	function initializeFilters() {
		// Filters will be triggered by reactive statements at component level
	}
	
	// Reactive filter updates
	$: if (searchQuery || filterStatus || selectedCHW || selectedTimeRange) {
		filterCases();
	}

	async function approveCase(caseId: string, decision: string, comments = '') {
		try {
			isLoading = true;
			
			// Call backend API for case review
			if (decision === 'approve') {
				await apiClient.review.approve(caseId, comments);
			} else {
				await apiClient.review.reject(caseId, comments);
			}

			// Update local state optimistically
			allCases = allCases.map((case_item: any) => {
				if (case_item.id === caseId) {
					return {
						...case_item,
						reviewStatus: decision === 'approve' ? 'approved' : 'needs_revision',
						treatmentPlan: {
							...case_item.treatmentPlan,
							status: decision === 'approve' ? 'approved' : 'revision_needed',
							approvedBy: $authStore.user?.id || 'asha_supervisor',
							approvalDate: new Date().toISOString(),
							comments: comments
						}
					};
				}
				return case_item;
			});

			// Also save to IndexedDB for offline access
			const updatedCase = allCases.find(c => c.id === caseId);
			if (updatedCase) {
				await dataManager.saveRecord('cases', updatedCase);
			}

			calculateDashboardStats();
			filterCases();
			showCaseDetails = false;
			
			alert(`Case ${decision === 'approve' ? 'approved' : 'rejected'} successfully!`);
		} catch (error: unknown) {
			console.error('Failed to review case:', error);
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			
			// Fallback to offline-only save if API fails
			try {
				allCases = allCases.map((case_item: any) => {
					if (case_item.id === caseId) {
						return {
							...case_item,
							reviewStatus: decision === 'approve' ? 'approved' : 'needs_revision',
							treatmentPlan: {
								...case_item.treatmentPlan,
								status: decision === 'approve' ? 'approved' : 'revision_needed',
								approvedBy: $authStore.user?.id || 'asha_supervisor',
								approvalDate: new Date().toISOString(),
								comments: comments
							}
						};
					}
					return case_item;
				});
				const updatedCase = allCases.find(c => c.id === caseId);
				if (updatedCase) {
					await dataManager.saveRecord('cases', updatedCase);
				}
				calculateDashboardStats();
				filterCases();
				showCaseDetails = false;
				alert('Saved offline. Will sync when connection is restored. Error: ' + errorMessage);
			} catch (offlineError) {
				alert('Error reviewing case: ' + errorMessage);
			}
		} finally {
			isLoading = false;
		}
	}

	async function escalateToClinic(caseId: string, reason: string) {
		try {
			isLoading = true;
			
			// Call backend API for case escalation
			await apiClient.review.escalate(caseId, 5, reason); // Priority 5 for escalated cases

			// Update local state optimistically
			allCases = allCases.map((case_item: any) => {
				if (case_item.id === caseId) {
					return {
						...case_item,
						reviewStatus: 'escalated_to_clinic',
						priority: 5,
						escalation: {
							reason: reason,
							date: new Date().toISOString(),
							escalatedBy: $authStore.user?.id || 'asha_supervisor'
						}
					};
				}
				return case_item;
			});

			// Also save to IndexedDB for offline access
			const updatedCase = allCases.find((c: any) => c.id === caseId);
			if (updatedCase) {
				await dataManager.saveRecord('cases', updatedCase);
			}

			calculateDashboardStats();
			filterCases();
			showCaseDetails = false;
			alert('Case escalated to clinic successfully!');
		} catch (error: unknown) {
			console.error('Failed to escalate case:', error);
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			
			// Fallback to offline-only save if API fails
			try {
				allCases = allCases.map((case_item: any) => {
					if (case_item.id === caseId) {
						return {
							...case_item,
							reviewStatus: 'escalated_to_clinic',
							priority: 5,
							escalation: {
								reason: reason,
								date: new Date().toISOString(),
								escalatedBy: $authStore.user?.id || 'asha_supervisor'
							}
						};
					}
					return case_item;
				});
				const updatedCase = allCases.find((c: any) => c.id === caseId);
				if (updatedCase) {
					await dataManager.saveRecord('cases', updatedCase);
				}
				calculateDashboardStats();
				filterCases();
				showCaseDetails = false;
				alert('Saved offline. Will sync when connection is restored. Error: ' + errorMessage);
			} catch (offlineError) {
				alert('Error escalating case: ' + errorMessage);
			}
		} finally {
			isLoading = false;
		}
	}

	function viewCaseDetails(case_item: any) {
		selectedCase = case_item;
		showCaseDetails = true;
	}

	function getStatusColor(status: string): string {
		const colors: Record<string, string> = {
			'pending_urgent': 'bg-red-100 text-red-800 border-red-200',
			'pending_review': 'bg-orange-100 text-orange-800 border-orange-200',
			'pending_analysis': 'bg-blue-100 text-blue-800 border-blue-200',
			'auto_approved': 'bg-green-100 text-green-800 border-green-200',
			'approved': 'bg-green-100 text-green-800 border-green-200',
			'needs_revision': 'bg-yellow-100 text-yellow-800 border-yellow-200',
			'escalated_to_clinic': 'bg-purple-100 text-purple-800 border-purple-200'
		};
		return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
	}

	function getRiskBadgeColor(riskLevel: string): string {
		const colors: Record<string, string> = {
			'low': 'bg-green-500',
			'medium': 'bg-yellow-500',
			'high': 'bg-orange-500',
			'critical': 'bg-red-500'
		};
		return colors[riskLevel] || 'bg-gray-500';
	}

	function exportData() {
		const exportData = {
			timestamp: new Date().toISOString(),
			statistics: dashboardStats,
			cases: filteredCases,
			performance: performanceMetrics
		};
		
		const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `asha-dashboard-report-${new Date().toISOString().split('T')[0]}.json`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}
</script>

<svelte:head>
	<title>ASHA Supervision Portal - Aarogya Healthcare</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
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
					You don't have permission to access the ASHA Portal. This area is restricted to ASHA workers, supervisors, clinicians, and administrators.
				</p>
				<div class="space-y-3">
					<p class="text-sm text-gray-500">Your role: <strong>{$authStore.user?.role}</strong></p>
					<a href="/" class="block w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
						Return to Home
					</a>
					{#if $authStore.user?.role === 'CHW'}
						<a href="/chw" class="block w-full bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors">
							Go to CHW Portal
						</a>
					{/if}
				</div>
			</div>
		</div>
	{:else}
	<!-- Header -->
	<header class="bg-white shadow-sm border-b">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<div class="flex justify-between items-center py-4">
				<div class="flex items-center space-x-4">
					<a href="/" class="flex items-center space-x-2 hover:opacity-80 transition-opacity" title="Back to Home">
						<div class="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
							<span class="text-white font-bold">A</span>
						</div>
						<div>
							<h1 class="text-xl font-semibold text-gray-900">ASHA Portal</h1>
							<p class="text-sm text-gray-600">Community Health Supervision</p>
						</div>
					</a>
				</div>
				
				<div class="flex items-center space-x-4">
					<div class="flex items-center space-x-2 text-sm text-gray-600">
						<span class="w-2 h-2 bg-green-500 rounded-full"></span>
						<span>Online</span>
					</div>
					<button 
						onclick={exportData}
						class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
					>
						Export Report
					</button>
					<div class="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
						👩‍⚕️
					</div>
				</div>
			</div>
		</div>
	</header>

	<!-- Navigation Tabs -->
	<nav class="bg-white border-b">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<div class="flex space-x-8">
				{#each ['overview', 'cases', 'performance', 'community'] as tab}
					<button
						onclick={() => activeTab = tab}
						class={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
							activeTab === tab 
								? 'border-blue-500 text-blue-600' 
								: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
						}`}
					>
						{tab.charAt(0).toUpperCase() + tab.slice(1)}
					</button>
				{/each}
			</div>
		</div>
	</nav>

	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
		{#if activeTab === 'overview'}
			<!-- Overview Dashboard -->
			<div class="space-y-6">
				<!-- Stats Cards -->
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
					<div class="bg-white rounded-lg shadow p-6">
						<div class="flex items-center">
							<div class="flex-shrink-0">
								<div class="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center">
									📊
								</div>
							</div>
							<div class="ml-4">
								<p class="text-sm font-medium text-gray-600">Total Cases</p>
								<p class="text-2xl font-semibold text-gray-900">{dashboardStats.totalCases}</p>
							</div>
						</div>
					</div>

					<div class="bg-white rounded-lg shadow p-6">
						<div class="flex items-center">
							<div class="flex-shrink-0">
								<div class="w-8 h-8 bg-orange-100 rounded-md flex items-center justify-center">
									⏳
								</div>
							</div>
							<div class="ml-4">
								<p class="text-sm font-medium text-gray-600">Pending Review</p>
								<p class="text-2xl font-semibold text-gray-900">{dashboardStats.pendingReview}</p>
							</div>
						</div>
					</div>

					<div class="bg-white rounded-lg shadow p-6">
						<div class="flex items-center">
							<div class="flex-shrink-0">
								<div class="w-8 h-8 bg-red-100 rounded-md flex items-center justify-center">
									🚨
								</div>
							</div>
							<div class="ml-4">
								<p class="text-sm font-medium text-gray-600">High Risk</p>
								<p class="text-2xl font-semibold text-gray-900">{dashboardStats.highRiskCases}</p>
							</div>
						</div>
					</div>

					<div class="bg-white rounded-lg shadow p-6">
						<div class="flex items-center">
							<div class="flex-shrink-0">
								<div class="w-8 h-8 bg-green-100 rounded-md flex items-center justify-center">
									✅
								</div>
							</div>
							<div class="ml-4">
								<p class="text-sm font-medium text-gray-600">Completion Rate</p>
								<p class="text-2xl font-semibold text-gray-900">{dashboardStats.completionRate}%</p>
							</div>
						</div>
					</div>
				</div>

				<!-- Recent Critical Cases -->
				<div class="bg-white rounded-lg shadow">
					<div class="px-6 py-4 border-b border-gray-200">
						<h3 class="text-lg font-medium text-gray-900">Critical Cases Requiring Attention</h3>
					</div>
					<div class="divide-y divide-gray-200">
						{#each filteredCases.filter(c => c.reviewStatus === 'pending_urgent').slice(0, 5) as case_item}
							<div 
								class="px-6 py-4 hover:bg-gray-50 cursor-pointer" 
								role="button"
								tabindex="0"
								onclick={() => viewCaseDetails(case_item)}
								onkeydown={(e) => {
									if (e.key === 'Enter' || e.key === ' ') {
										e.preventDefault();
										viewCaseDetails(case_item);
									}
								}}
								aria-label={`View details for ${case_item.patientName}'s case`}
							>
								<div class="flex items-center justify-between">
									<div class="flex items-center space-x-4">
										<div class={`w-3 h-3 rounded-full ${getRiskBadgeColor(case_item.aiAnalysis?.riskLevel)}`}></div>
										<div>
											<p class="text-sm font-medium text-gray-900">{case_item.patientName}</p>
											<p class="text-sm text-gray-600">
												CHW: {case_item.assignedCHW.name} • {case_item.assignedCHW.location}
											</p>
										</div>
									</div>
									<div class="text-right">
										<p class="text-sm text-gray-900">Risk: {case_item.aiAnalysis?.riskLevel || 'Unknown'}</p>
										<p class="text-xs text-gray-500">{new Date(case_item.timestamp).toLocaleDateString()}</p>
									</div>
								</div>
							</div>
						{/each}
						{#if filteredCases.filter(c => c.reviewStatus === 'pending_urgent').length === 0}
							<div class="px-6 py-8 text-center text-gray-500">
								<p>No critical cases requiring immediate attention</p>
							</div>
						{/if}
					</div>
				</div>

				<!-- CHW Performance Overview -->
				<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
					<div class="bg-white rounded-lg shadow">
						<div class="px-6 py-4 border-b border-gray-200">
							<h3 class="text-lg font-medium text-gray-900">Active CHWs Performance</h3>
						</div>
						<div class="p-6">
							<div class="space-y-4">
								{#each performanceMetrics.accuracyScores.slice(0, 4) as chw}
									<div class="flex items-center justify-between">
										<div>
											<p class="text-sm font-medium text-gray-900">{chw.name}</p>
											<p class="text-xs text-gray-600">{chw.cases} cases</p>
										</div>
										<div class="flex items-center space-x-2">
											<div class="w-20 bg-gray-200 rounded-full h-2">
												<div 
													class="bg-blue-600 h-2 rounded-full transition-all"
													style="width: {chw.accuracy}%"
												></div>
											</div>
											<span class="text-sm text-gray-900 w-12">{chw.accuracy}%</span>
										</div>
									</div>
								{/each}
							</div>
						</div>
					</div>

					<div class="bg-white rounded-lg shadow">
						<div class="px-6 py-4 border-b border-gray-200">
							<h3 class="text-lg font-medium text-gray-900">Community Outreach Metrics</h3>
						</div>
						<div class="p-6">
							<div class="grid grid-cols-2 gap-4">
								{#each performanceMetrics.communityOutreach as metric}
									<div class="text-center">
										<p class="text-2xl font-semibold text-blue-600">{metric.value}</p>
										<p class="text-xs text-gray-600">{metric.metric}</p>
									</div>
								{/each}
							</div>
						</div>
					</div>
				</div>
			</div>

		{:else if activeTab === 'cases'}
			<!-- Cases Management -->
			<div class="space-y-6">
				<!-- Filters -->
				<div class="bg-white rounded-lg shadow p-6">
					<div class="grid grid-cols-1 md:grid-cols-4 gap-4">
						<div>
							<label for="asha-search" class="block text-sm font-medium text-gray-700 mb-1">Search</label>
							<input
								id="asha-search"
								type="text"
								bind:value={searchQuery}
								placeholder="Patient or CHW name..."
								class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
							>
						</div>

						<div>
							<label for="filter-status" class="block text-sm font-medium text-gray-700 mb-1">Status</label>
							<select 
								id="filter-status"
								bind:value={filterStatus}
								class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
							>
								<option value="all">All Status</option>
								<option value="pending_urgent">Urgent Review</option>
								<option value="pending_review">Pending Review</option>
								<option value="pending_analysis">Pending Analysis</option>
								<option value="auto_approved">Auto Approved</option>
								<option value="approved">Approved</option>
								<option value="needs_revision">Needs Revision</option>
							</select>
						</div>

						<div>
							<label for="selected-chw" class="block text-sm font-medium text-gray-700 mb-1">CHW</label>
							<select 
								id="selected-chw"
								bind:value={selectedCHW}
								class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
							>
								<option value="all">All CHWs</option>
								{#each chwList as chw}
									<option value={chw.id}>{chw.name}</option>
								{/each}
							</select>
						</div>

						<div>
							<label for="time-range" class="block text-sm font-medium text-gray-700 mb-1">Time Range</label>
							<select 
								id="time-range"
								bind:value={selectedTimeRange}
								class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
							>
								<option value="1d">Last 24 hours</option>
								<option value="7d">Last 7 days</option>
								<option value="30d">Last 30 days</option>
								<option value="all">All time</option>
							</select>
						</div>
					</div>
				</div>

				<!-- Cases List -->
				<div class="bg-white rounded-lg shadow overflow-hidden">
					<div class="px-6 py-4 border-b border-gray-200">
						<h3 class="text-lg font-medium text-gray-900">Cases ({filteredCases.length})</h3>
					</div>
					<div class="overflow-x-auto">
						<table class="min-w-full divide-y divide-gray-200">
							<thead class="bg-gray-50">
								<tr>
									<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient</th>
									<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CHW</th>
									<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Risk Level</th>
									<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
									<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
									<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
								</tr>
							</thead>
							<tbody class="bg-white divide-y divide-gray-200">
								{#each filteredCases.slice(0, 50) as case_item}
									<tr class="hover:bg-gray-50">
										<td class="px-6 py-4 whitespace-nowrap">
											<div>
												<p class="text-sm font-medium text-gray-900">{case_item.patientName}</p>
												<p class="text-sm text-gray-500">{case_item.age} years, {case_item.gender}</p>
											</div>
										</td>
										<td class="px-6 py-4 whitespace-nowrap">
											<div>
												<p class="text-sm text-gray-900">{case_item.assignedCHW.name}</p>
												<p class="text-sm text-gray-500">{case_item.assignedCHW.location}</p>
											</div>
										</td>
										<td class="px-6 py-4 whitespace-nowrap">
											{#if case_item.aiAnalysis}
												<span class={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
													case_item.aiAnalysis.riskLevel === 'critical' ? 'bg-red-100 text-red-800' :
													case_item.aiAnalysis.riskLevel === 'high' ? 'bg-orange-100 text-orange-800' :
													case_item.aiAnalysis.riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' :
													'bg-green-100 text-green-800'
												}`}>
													{case_item.aiAnalysis.riskLevel}
												</span>
											{:else}
												<span class="text-sm text-gray-500">Pending</span>
											{/if}
										</td>
										<td class="px-6 py-4 whitespace-nowrap">
											<span class={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(case_item.reviewStatus)}`}>
												{case_item.reviewStatus.replace(/_/g, ' ')}
											</span>
										</td>
										<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
											{new Date(case_item.timestamp).toLocaleDateString()}
										</td>
										<td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
											<button 
												onclick={() => viewCaseDetails(case_item)}
												class="text-blue-600 hover:text-blue-900"
											>
												View Details
											</button>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</div>
			</div>

		{:else if activeTab === 'performance'}
			<!-- Performance Analytics -->
			<div class="space-y-6">
				<div class="bg-white rounded-lg shadow p-6">
					<h3 class="text-lg font-medium text-gray-900 mb-4">CHW Performance Analytics</h3>
					<p class="text-gray-600">Detailed performance metrics and trends would be displayed here with interactive charts.</p>
				</div>
			</div>

		{:else if activeTab === 'community'}
			<!-- Community Health Metrics -->
			<div class="space-y-6">
				<div class="bg-white rounded-lg shadow p-6">
					<h3 class="text-lg font-medium text-gray-900 mb-4">Community Health Overview</h3>
					<p class="text-gray-600">Community health indicators, outbreak monitoring, and population health trends.</p>
				</div>
			</div>
		{/if}
	</div>

<!-- Case Details Modal -->
{#if showCaseDetails && selectedCase}
	<div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
		<div class="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
			<div class="mt-3">
				<div class="flex items-center justify-between mb-4">
					<h3 class="text-lg font-medium text-gray-900">Case Details</h3>
					<button 
						onclick={() => showCaseDetails = false}
						class="text-gray-400 hover:text-gray-600"
					>
						✕
					</button>
				</div>

				<div class="space-y-4">
					<!-- Patient Information -->
					<div class="bg-gray-50 rounded-lg p-4">
						<h4 class="font-medium text-gray-900 mb-2">Patient Information</h4>
						<div class="grid grid-cols-2 gap-4 text-sm">
							<div><strong>Name:</strong> {selectedCase.patientName}</div>
							<div><strong>Age:</strong> {selectedCase.age} years</div>
							<div><strong>Gender:</strong> {selectedCase.gender}</div>
							<div><strong>Case ID:</strong> {selectedCase.id}</div>
						</div>
					</div>

					<!-- CHW Information -->
					<div class="bg-gray-50 rounded-lg p-4">
						<h4 class="font-medium text-gray-900 mb-2">Assigned CHW</h4>
						<div class="text-sm">
							<div><strong>Name:</strong> {selectedCase.assignedCHW.name}</div>
							<div><strong>Location:</strong> {selectedCase.assignedCHW.location}</div>
						</div>
					</div>

					<!-- AI Analysis -->
					{#if selectedCase.aiAnalysis}
						<div class="bg-gray-50 rounded-lg p-4">
							<h4 class="font-medium text-gray-900 mb-2">AI Analysis Results</h4>
							<div class="space-y-2 text-sm">
								<div class="flex justify-between">
									<span>Risk Level:</span>
									<span class={`px-2 py-1 rounded text-xs ${
										selectedCase.aiAnalysis.riskLevel === 'critical' ? 'bg-red-100 text-red-800' :
										selectedCase.aiAnalysis.riskLevel === 'high' ? 'bg-orange-100 text-orange-800' :
										selectedCase.aiAnalysis.riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' :
										'bg-green-100 text-green-800'
									}`}>
										{selectedCase.aiAnalysis.riskLevel}
									</span>
								</div>
								<div class="flex justify-between">
									<span>Risk Score:</span>
									<span>{selectedCase.aiAnalysis.riskScore}/100</span>
								</div>
								<div class="flex justify-between">
									<span>AI Confidence:</span>
									<span>{Math.round(selectedCase.aiAnalysis.confidence * 100)}%</span>
								</div>
							</div>
						</div>
					{/if}

					<!-- Symptoms -->
					{#if selectedCase.symptoms && selectedCase.symptoms.length > 0}
						<div class="bg-gray-50 rounded-lg p-4">
							<h4 class="font-medium text-gray-900 mb-2">Reported Symptoms</h4>
							<div class="flex flex-wrap gap-2">
								{#each selectedCase.symptoms as symptom}
									<span class="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
										{symptom}
									</span>
								{/each}
							</div>
						</div>
					{/if}

					<!-- Action Buttons -->
					{#if selectedCase.reviewStatus === 'pending_review' || selectedCase.reviewStatus === 'pending_urgent'}
						<div class="flex justify-end space-x-3 pt-4 border-t">
							<button 
								onclick={() => escalateToClinic(selectedCase.id, 'Requires specialist consultation')}
								class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
							>
								Escalate to Clinic
							</button>
							<button 
								onclick={() => approveCase(selectedCase.id, 'approve')}
								class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
							>
								Approve Treatment
							</button>
						</div>
					{/if}
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	/* Custom scrollbar for better UX */
	:global(body) {
		scrollbar-width: thin;
		scrollbar-color: #cbd5e0 #f7fafc;
	}
	
	:global(body::-webkit-scrollbar) {
		width: 6px;
	}
	
	:global(body::-webkit-scrollbar-track) {
		background: #f7fafc;
	}
	
	:global(body::-webkit-scrollbar-thumb) {
		background: #cbd5e0;
		border-radius: 3px;
	}
</style>
{/if}
</div>