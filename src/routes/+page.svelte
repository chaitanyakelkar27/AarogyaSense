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

<div class="relative isolate overflow-hidden">
	<section id="overview" class="relative py-20">
		<div class="mx-auto max-w-3xl px-6">
			<span class="badge">{$_('home.offlineFirst')}</span>
			<h1 class="mt-6 text-4xl font-bold text-surface-emphasis sm:text-5xl">
				{$_('home.title')}: {$_('home.subtitle')}
			</h1>
			<p class="mt-5 max-w-xl text-lg text-muted">
				{$_('home.description')}
			</p>
			<div class="mt-8 flex flex-wrap items-center gap-4">
				<a
					href="/chw"
					class="rounded-full bg-brand px-6 py-3 text-sm font-semibold text-brand-foreground shadow-brand transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:scale-105 group"
				>
					<span class="flex items-center gap-2">
						{$_('home.chwDashboard')}
						<svg
							class="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
						>
							<path d="M5 12h14m-7-7l7 7-7 7" />
						</svg>
					</span>
				</a>
				<a
					href="/asha"
					class="rounded-full border border-brand/30 px-6 py-3 text-sm font-semibold text-brand shadow-soft transition-all duration-300 hover:border-brand hover:bg-brand/10 hover:-translate-y-0.5 hover:shadow-lg group"
				>
					<span class="flex items-center gap-2">
						{$_('home.ashaSupervision')}
						<svg
							class="w-4 h-4 transition-transform duration-300 group-hover:rotate-45"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
						>
							<path d="M7 17l9.2-9.2M17 17V7H7" />
						</svg>
					</span>
				</a>
				<a
					href="/clinician"
					class="rounded-full border border-brand/30 px-6 py-3 text-sm font-semibold text-brand shadow-soft transition-all duration-300 hover:border-brand hover:bg-brand/10 hover:-translate-y-0.5 hover:shadow-lg group"
				>
					<span class="flex items-center gap-2">
						{$_('home.clinicianReview')}
						<svg
							class="w-4 h-4 transition-transform duration-300 group-hover:rotate-45"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
						>
							<path d="M7 17l9.2-9.2M17 17V7H7" />
						</svg>
					</span>
				</a>
			</div>
			<div class="mt-10 grid gap-5 sm:grid-cols-3">
				{#each heroStats as stat, i}
					<div class="stat group transition-all duration-300 rounded-2xl p-4">
						<div class="flex items-center gap-2 mb-2">
							<span class="text-2xl">{stat.icon}</span>
							<div class="flex items-center gap-2">
								<span
									class="text-3xl font-semibold text-surface-emphasis transition-colors duration-300 group-hover:text-brand"
								>
									{stat.value}
								</span>
								{#if i === 0 && syncStatus.pendingCount > 0}
									<span
										class="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full font-bold"
									>
										{syncStatus.pendingCount} pending sync
									</span>
								{/if}
							</div>
						</div>
						<span
							class="text-xs font-semibold uppercase tracking-[0.25em] text-muted group-hover:text-brand/80 transition-colors duration-300"
							>{$_(stat.labelKey)}</span
						>
						<p
							class="text-xs text-muted group-hover:text-surface-emphasis transition-colors duration-300"
						>
							{$_(stat.detailKey)}
						</p>
						<div
							class="h-0.5 w-0 bg-brand transition-all duration-500 group-hover:w-full mt-2"
						></div>
					</div>
				{/each}
			</div>
			<div
				class="mt-8 flex items-center gap-4 p-4 bg-surface/50 rounded-2xl border border-border/60"
			>
				<div class="flex items-center gap-2">
					<div
						class="w-3 h-3 rounded-full {isOnline ? 'bg-green-500' : 'bg-red-500'} animate-pulse"
					></div>
					<span class="text-sm font-medium text-muted">
						{isOnline ? `🌐 ${$_('home.online')}` : `📵 ${$_('home.offline')}`}
					</span>
				</div>
				<div class="h-6 w-px bg-border"></div>
				<span class="text-sm text-muted">
					💾 {totalCases}
					{$_('home.totalCases')}
				</span>
				{#if syncStatus.syncInProgress}
					<div class="h-6 w-px bg-border"></div>
					<span class="text-sm text-brand animate-pulse">
						🔄 {$_('home.syncing')}
					</span>
				{/if}
			</div>
		</div>
	</section>
</div>
