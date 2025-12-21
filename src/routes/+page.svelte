<script lang="ts">
	import { onMount } from 'svelte';
	import { _ } from 'svelte-i18n';
	import OfflineDataManager from '$lib/offline-data-manager';

	let dataManager: OfflineDataManager;
	let isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
	let syncStatus = { pendingCount: 0, isOnline: false, syncInProgress: false };
	let totalCases = 0;
	let todayCases = 0;
	let criticalCases = 0;

	$: heroStats = [
		{
			labelKey: 'home.totalCases',
			value: totalCases,
			detailKey: 'home.managedOfflineFirst',
			icon: '📋'
		},
		{
			labelKey: 'home.todaysCases',
			value: todayCases,
			detailKey: 'home.capturedByCHWs',
			icon: '📊'
		},
		{
			labelKey: 'home.criticalCases',
			value: criticalCases,
			detailKey: 'home.requireAttention',
			icon: '🚨'
		}
	];

	onMount(() => {
		dataManager = new OfflineDataManager();
		loadSystemStats();
		const handleOnline = () => {
			isOnline = true;
			updateSyncStatus();
		};
		const handleOffline = () => {
			isOnline = false;
			updateSyncStatus();
		};
		window.addEventListener('online', handleOnline);
		window.addEventListener('offline', handleOffline);
		const statsInterval = setInterval(loadSystemStats, 30000);
		const syncInterval = setInterval(updateSyncStatus, 5000);
		updateSyncStatus();
		return () => {
			clearInterval(statsInterval);
			clearInterval(syncInterval);
			window.removeEventListener('online', handleOnline);
			window.removeEventListener('offline', handleOffline);
		};
	});

	async function loadSystemStats() {
		try {
			if (!dataManager) return;
			const cases = await dataManager.queryRecords('cases');
			totalCases = cases.length;
			const today = new Date().toDateString();
			todayCases = cases.filter((c) => new Date(c.timestamp).toDateString() === today).length;
			criticalCases = cases.filter(
				(c) => c.aiDiagnosis?.riskLevel === 'critical' || c.aiDiagnosis?.riskLevel === 'high'
			).length;
		} catch (error) {
			console.error('Failed to load stats:', error);
		}
	}

	function updateSyncStatus() {
		if (!dataManager) return;
		syncStatus = dataManager.getSyncStatus();
	}
</script>

<div class="flex flex-col min-h-[calc(100vh-4rem)] bg-background">
	<!-- Hero Section -->
	<section class="w-full bg-surface border-b border-border/40 py-16 px-4 sm:px-8 relative overflow-hidden">
		<div class="absolute inset-0 bg-brand/5 opacity-50"></div>
		<div class="absolute -top-24 -right-24 w-96 h-96 bg-brand/10 rounded-full blur-3xl"></div>
		<div class="absolute -bottom-24 -left-24 w-96 h-96 bg-accent/5 rounded-full blur-3xl"></div>
		
		<div class="max-w-7xl mx-auto relative z-10">
			<div class="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
				<div class="max-w-2xl">
					<div class="inline-flex items-center rounded-full border border-brand/20 bg-surface/80 backdrop-blur-sm px-4 py-1.5 text-sm font-medium text-brand mb-6 shadow-sm">
						<span class="flex h-2 w-2 rounded-full bg-brand mr-2 animate-pulse"></span>
						{$_('home.offlineFirst')}
					</div>
					<h1 class="text-4xl font-bold tracking-tight text-surface-emphasis sm:text-5xl lg:text-6xl mb-4">
						{$_('home.title')}
					</h1>
					<p class="text-xl text-muted leading-relaxed">
						{$_('home.description')}
					</p>
				</div>
				
				<!-- System Status Card -->
				<div class="flex items-center gap-4 p-5 bg-surface/80 backdrop-blur-md rounded-2xl border border-border/60 shadow-soft hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
					<div class="flex items-center gap-4">
						<div class="relative flex h-4 w-4">
						  <span class="animate-ping absolute inline-flex h-full w-full rounded-full {isOnline ? 'bg-green-400' : 'bg-red-400'} opacity-75"></span>
						  <span class="relative inline-flex rounded-full h-4 w-4 {isOnline ? 'bg-green-500' : 'bg-red-500'}"></span>
						</div>
						<div class="flex flex-col">
							<span class="text-base font-semibold text-surface-emphasis">
								{isOnline ? $_('home.online') : $_('home.offline')}
							</span>
							{#if syncStatus.syncInProgress}
								<span class="text-xs text-brand font-medium animate-pulse">{$_('home.syncing')}...</span>
							{:else if syncStatus.pendingCount > 0}
								<span class="text-xs text-warning font-medium">{syncStatus.pendingCount} pending</span>
							{:else}
								<span class="text-xs text-muted font-medium">System ready</span>
							{/if}
						</div>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Main Dashboard Content -->
	<main class="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-8 py-12 space-y-12">
		<!-- Stats Grid -->
		<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
			{#each heroStats as stat}
				<div class="group bg-surface rounded-2xl border border-border/50 p-6 shadow-sm hover:shadow-brand/20 hover:border-brand/30 transition-all duration-300">
					<div class="flex items-start justify-between mb-4">
						<div class="p-3 bg-surface-soft rounded-xl text-2xl group-hover:scale-110 transition-transform duration-300">
							{stat.icon}
						</div>
						<span class="text-xs font-bold text-muted uppercase tracking-wider bg-surface-soft px-2 py-1 rounded-md">{$_(stat.labelKey)}</span>
					</div>
					<h3 class="text-4xl font-bold text-surface-emphasis mb-2">{stat.value}</h3>
					<p class="text-sm text-muted">
						{$_(stat.detailKey)}
					</p>
				</div>
			{/each}
		</div>

		<!-- Quick Actions -->
		<div class="space-y-6">
			<h2 class="text-2xl font-bold text-surface-emphasis flex items-center gap-2">
				<span class="w-1 h-6 bg-brand rounded-full"></span>
				{$_('home.quickAccess')}
			</h2>
			<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
				<a href="/chw" class="group relative flex flex-col justify-between overflow-hidden rounded-2xl bg-surface border border-border/50 p-8 shadow-sm hover:border-brand/50 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
					<div class="absolute top-0 right-0 -mt-8 -mr-8 h-32 w-32 rounded-full bg-brand/5 transition-all duration-500 group-hover:bg-brand/10 group-hover:scale-150"></div>
					<div class="relative z-10">
						<div class="h-12 w-12 bg-brand/10 rounded-xl flex items-center justify-center text-brand mb-6 group-hover:scale-110 transition-transform duration-300">
							<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
							</svg>
						</div>
						<h3 class="text-xl font-bold text-surface-emphasis group-hover:text-brand transition-colors">{$_('home.chwDashboard')}</h3>
						<p class="mt-3 text-base text-muted leading-relaxed">Access patient registration, screening tools, and case management.</p>
					</div>
					<div class="mt-8 flex items-center text-sm font-bold text-brand uppercase tracking-wide relative z-10">
						Launch Dashboard <span aria-hidden="true" class="ml-2 transition-transform group-hover:translate-x-2">&rarr;</span>
					</div>
				</a>

				<a href="/asha" class="group relative flex flex-col justify-between overflow-hidden rounded-2xl bg-surface border border-border/50 p-8 shadow-sm hover:border-accent/50 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
					<div class="absolute top-0 right-0 -mt-8 -mr-8 h-32 w-32 rounded-full bg-accent/5 transition-all duration-500 group-hover:bg-accent/10 group-hover:scale-150"></div>
					<div class="relative z-10">
						<div class="h-12 w-12 bg-accent/10 rounded-xl flex items-center justify-center text-accent mb-6 group-hover:scale-110 transition-transform duration-300">
							<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
							</svg>
						</div>
						<h3 class="text-xl font-bold text-surface-emphasis group-hover:text-accent transition-colors">{$_('home.ashaSupervision')}</h3>
						<p class="mt-3 text-base text-muted leading-relaxed">Monitor community health trends and manage high-risk follow-ups.</p>
					</div>
					<div class="mt-8 flex items-center text-sm font-bold text-accent uppercase tracking-wide relative z-10">
						Open Portal <span aria-hidden="true" class="ml-2 transition-transform group-hover:translate-x-2">&rarr;</span>
					</div>
				</a>

				<a href="/clinician" class="group relative flex flex-col justify-between overflow-hidden rounded-2xl bg-surface border border-border/50 p-8 shadow-sm hover:border-info/50 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
					<div class="absolute top-0 right-0 -mt-8 -mr-8 h-32 w-32 rounded-full bg-info/5 transition-all duration-500 group-hover:bg-info/10 group-hover:scale-150"></div>
					<div class="relative z-10">
						<div class="h-12 w-12 bg-info/10 rounded-xl flex items-center justify-center text-info mb-6 group-hover:scale-110 transition-transform duration-300">
							<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
							</svg>
						</div>
						<h3 class="text-xl font-bold text-surface-emphasis group-hover:text-info transition-colors">{$_('home.clinicianReview')}</h3>
						<p class="mt-3 text-base text-muted leading-relaxed">Review referred cases, provide diagnosis, and issue prescriptions.</p>
					</div>
					<div class="mt-8 flex items-center text-sm font-bold text-info uppercase tracking-wide relative z-10">
						Access Tools <span aria-hidden="true" class="ml-2 transition-transform group-hover:translate-x-2">&rarr;</span>
					</div>
				</a>
			</div>
		</div>
	</main>
</div>
