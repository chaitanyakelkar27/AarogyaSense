<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { _ } from 'svelte-i18n';
	import OfflineDataManager from '$lib/offline-data-manager';
	import { activeSOSAlert, dismissSOSAlert } from '$lib/stores/pusher-store';
	import { authStore } from '$lib/stores/auth-store';
	import { get } from 'svelte/store';

	let dataManager: OfflineDataManager;
	let isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
	let syncStatus = { pendingCount: 0, isOnline: false, syncInProgress: false };
	let totalCases = 0;
	let todayCases = 0;
	let criticalCases = 0;

	// SOS Modal
	let showSOSModal = false;
	let sosLocation = '';
	let sosMessage = '';
	let sosSending = false;
	let sosSent = false;
	let fetchingLocation = false;
	let locationError = '';

	// SOS Alert received
	let showSOSAlert = false;
	let currentSOSAlert: any = null;
	let sosAudio: HTMLAudioElement | null = null;

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

		// Subscribe to SOS alerts (Pusher is initialized in layout)
		const unsubscribe = activeSOSAlert.subscribe((alert) => {
			if (alert) {
				currentSOSAlert = alert;
				showSOSAlert = true;
				playSOSSound();
			}
		});

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
			unsubscribe();
		};
	});

	onDestroy(() => {
		if (sosAudio) {
			sosAudio.pause();
			sosAudio = null;
		}
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

	// SOS Functions
	function openSOSModal() {
		showSOSModal = true;
		fetchLocation();
	}

	async function fetchLocation() {
		if (!navigator.geolocation) {
			locationError = 'Geolocation not supported';
			return;
		}

		fetchingLocation = true;
		locationError = '';

		navigator.geolocation.getCurrentPosition(
			async (position) => {
				const { latitude, longitude } = position.coords;

				// Try to get address from coordinates using reverse geocoding
				try {
					const response = await fetch(
						`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=16`
					);
					const data = await response.json();

					if (data.display_name) {
						// Extract village/locality info
						const parts = [];
						if (data.address?.village) parts.push(data.address.village);
						else if (data.address?.suburb) parts.push(data.address.suburb);
						else if (data.address?.city) parts.push(data.address.city);
						if (data.address?.state_district) parts.push(data.address.state_district);
						if (data.address?.state) parts.push(data.address.state);

						sosLocation =
							parts.length > 0
								? parts.join(', ')
								: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
					} else {
						sosLocation = `GPS: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
					}
				} catch {
					sosLocation = `GPS: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
				}

				fetchingLocation = false;
			},
			(error) => {
				console.error('Geolocation error:', error);
				locationError = 'Could not get location. Please enter manually.';
				fetchingLocation = false;
			},
			{ enableHighAccuracy: true, timeout: 10000 }
		);
	}

	async function sendSOS() {
		sosSending = true;
		try {
			const auth = get(authStore);
			const response = await fetch('/api/sos', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					senderName: auth.user?.name || 'Anonymous',
					senderRole: auth.user?.role || 'User',
					location: sosLocation || 'Unknown location',
					phone: (auth.user as any)?.phone || '',
					message: sosMessage || 'Emergency! Need immediate assistance.'
				})
			});

			if (response.ok) {
				// Play confirmation buzzer
				playSOSSound();
				sosSent = true;
				setTimeout(() => {
					showSOSModal = false;
					sosSent = false;
					sosLocation = '';
					sosMessage = '';
				}, 3000);
			} else {
				alert('Failed to send SOS. Please try again.');
			}
		} catch (error) {
			console.error('SOS error:', error);
			alert('Failed to send SOS. Check your connection.');
		} finally {
			sosSending = false;
		}
	}

	function playSOSSound() {
		try {
			// Create a beeping sound using Web Audio API
			const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
			const oscillator = audioContext.createOscillator();
			const gainNode = audioContext.createGain();

			oscillator.connect(gainNode);
			gainNode.connect(audioContext.destination);

			oscillator.frequency.value = 800;
			oscillator.type = 'square';
			gainNode.gain.value = 0.3;

			oscillator.start();

			// Beep pattern: on-off-on-off-on
			let beepCount = 0;
			const beepInterval = setInterval(() => {
				beepCount++;
				if (beepCount % 2 === 0) {
					gainNode.gain.value = 0.3;
				} else {
					gainNode.gain.value = 0;
				}
				if (beepCount >= 6) {
					clearInterval(beepInterval);
					oscillator.stop();
				}
			}, 200);
		} catch (e) {
			console.error('Could not play SOS sound:', e);
		}
	}

	function acknowledgeSOSAlert() {
		showSOSAlert = false;
		dismissSOSAlert();
	}
</script>

<div class="flex flex-col min-h-[calc(100vh-4rem)] bg-background">
	<!-- SOS Alert Modal (Received) -->
	{#if showSOSAlert && currentSOSAlert}
		<div
			class="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-pulse"
		>
			<div
				class="bg-red-600 text-white rounded-2xl p-8 max-w-md mx-4 shadow-2xl border-4 border-white animate-bounce"
			>
				<div class="flex items-center justify-center mb-4">
					<div class="w-16 h-16 bg-white rounded-full flex items-center justify-center">
						<svg
							class="w-10 h-10 text-red-600"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
							/>
						</svg>
					</div>
				</div>
				<h2 class="text-2xl font-bold text-center mb-2">🚨 SOS EMERGENCY ALERT 🚨</h2>
				<div class="bg-white/20 rounded-lg p-4 mb-4">
					<p class="text-lg font-semibold">{currentSOSAlert.senderName}</p>
					<p class="text-sm opacity-90">{currentSOSAlert.senderRole}</p>
					<p class="mt-2"><strong>📍 Location:</strong> {currentSOSAlert.location}</p>
					<p><strong>📞 Phone:</strong> {currentSOSAlert.phone}</p>
					<p class="mt-2 italic">"{currentSOSAlert.message}"</p>
				</div>
				<button
					onclick={acknowledgeSOSAlert}
					class="w-full bg-white text-red-600 py-3 rounded-lg font-bold text-lg hover:bg-gray-100 transition-colors"
				>
					✓ Acknowledge & Respond
				</button>
			</div>
		</div>
	{/if}

	<!-- SOS Send Modal -->
	{#if showSOSModal}
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
			<div class="bg-surface rounded-2xl p-6 max-w-md mx-4 shadow-2xl border border-border">
				{#if sosSent}
					<div class="text-center py-8">
						<div
							class="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"
						>
							<svg
								class="w-12 h-12 text-green-600"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M5 13l4 4L19 7"
								/>
							</svg>
						</div>
						<h2 class="text-2xl font-bold text-green-600 mb-2">SOS Sent!</h2>
						<p class="text-muted">All nearby health workers have been alerted.</p>
					</div>
				{:else}
					<div class="flex items-center justify-between mb-6">
						<h2 class="text-xl font-bold text-surface-emphasis flex items-center gap-2">
							<span class="text-2xl">🆘</span> Send Emergency SOS
						</h2>
						<button
							onclick={() => (showSOSModal = false)}
							class="text-muted hover:text-surface-emphasis"
							aria-label="Close"
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
					<div class="space-y-4">
						<div>
							<div class="flex items-center justify-between mb-1">
								<label for="sos-location" class="block text-sm font-medium text-surface-emphasis"
									>Your Location *</label
								>
								<button
									type="button"
									onclick={fetchLocation}
									disabled={fetchingLocation}
									class="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
								>
									{#if fetchingLocation}
										<svg class="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
											<circle
												class="opacity-25"
												cx="12"
												cy="12"
												r="10"
												stroke="currentColor"
												stroke-width="4"
											></circle>
											<path
												class="opacity-75"
												fill="currentColor"
												d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
											></path>
										</svg>
										Fetching...
									{:else}
										📍 Refresh Location
									{/if}
								</button>
							</div>
							<div class="relative">
								<input
									id="sos-location"
									type="text"
									bind:value={sosLocation}
									placeholder={fetchingLocation
										? 'Getting your location...'
										: 'Village name, landmark, etc.'}
									disabled={fetchingLocation}
									class="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:bg-gray-100"
								/>
								{#if fetchingLocation}
									<div class="absolute right-3 top-1/2 -translate-y-1/2">
										<svg class="animate-spin h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24">
											<circle
												class="opacity-25"
												cx="12"
												cy="12"
												r="10"
												stroke="currentColor"
												stroke-width="4"
											></circle>
											<path
												class="opacity-75"
												fill="currentColor"
												d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
											></path>
										</svg>
									</div>
								{/if}
							</div>
							{#if locationError}
								<p class="text-xs text-red-500 mt-1">{locationError}</p>
							{/if}
						</div>
						<div>
							<label for="sos-message" class="block text-sm font-medium text-surface-emphasis mb-1"
								>Emergency Details</label
							>
							<textarea
								id="sos-message"
								bind:value={sosMessage}
								placeholder="Describe the emergency..."
								rows="3"
								class="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
							></textarea>
						</div>
						<button
							onclick={sendSOS}
							disabled={sosSending || !sosLocation}
							class="w-full bg-red-600 text-white py-4 rounded-lg font-bold text-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
						>
							{#if sosSending}
								<svg class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
									<circle
										class="opacity-25"
										cx="12"
										cy="12"
										r="10"
										stroke="currentColor"
										stroke-width="4"
									></circle>
									<path
										class="opacity-75"
										fill="currentColor"
										d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
									></path>
								</svg>
								Sending...
							{:else}
								🚨 SEND SOS ALERT
							{/if}
						</button>
						<p class="text-xs text-muted text-center">
							This will alert all nearby CHWs and ASHA workers immediately
						</p>
					</div>
				{/if}
			</div>
		</div>
	{/if}

	<!-- Floating SOS Button -->
	<button
		onclick={openSOSModal}
		class="fixed bottom-6 right-6 z-40 w-16 h-16 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center group animate-pulse hover:animate-none"
		aria-label="Emergency SOS"
	>
		<span class="text-2xl font-bold">SOS</span>
		<span class="absolute -top-2 -right-2 w-4 h-4 bg-yellow-400 rounded-full animate-ping"></span>
	</button>

	<!-- Hero Section -->
	<section
		class="w-full bg-surface border-b border-border/40 py-16 px-4 sm:px-8 relative overflow-hidden"
	>
		<div class="absolute inset-0 bg-brand/5 opacity-50"></div>
		<div class="absolute -top-24 -right-24 w-96 h-96 bg-brand/10 rounded-full blur-3xl"></div>
		<div class="absolute -bottom-24 -left-24 w-96 h-96 bg-accent/5 rounded-full blur-3xl"></div>

		<div class="max-w-7xl mx-auto relative z-10">
			<div class="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
				<div class="max-w-2xl">
					<div
						class="inline-flex items-center rounded-full border border-brand/20 bg-surface/80 backdrop-blur-sm px-4 py-1.5 text-sm font-medium text-brand mb-6 shadow-sm"
					>
						<span class="flex h-2 w-2 rounded-full bg-brand mr-2 animate-pulse"></span>
						{$_('home.offlineFirst')}
					</div>
					<h1
						class="text-4xl font-bold tracking-tight text-surface-emphasis sm:text-5xl lg:text-6xl mb-4"
					>
						{$_('home.title')}
					</h1>
					<p class="text-xl text-muted leading-relaxed">
						{$_('home.description')}
					</p>
				</div>

				<!-- System Status Card -->
				<div
					class="flex items-center gap-4 p-5 bg-surface/80 backdrop-blur-md rounded-2xl border border-border/60 shadow-soft hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
				>
					<div class="flex items-center gap-4">
						<div class="relative flex h-4 w-4">
							<span
								class="animate-ping absolute inline-flex h-full w-full rounded-full {isOnline
									? 'bg-green-400'
									: 'bg-red-400'} opacity-75"
							></span>
							<span
								class="relative inline-flex rounded-full h-4 w-4 {isOnline
									? 'bg-green-500'
									: 'bg-red-500'}"
							></span>
						</div>
						<div class="flex flex-col">
							<span class="text-base font-semibold text-surface-emphasis">
								{isOnline ? $_('home.online') : $_('home.offline')}
							</span>
							{#if syncStatus.syncInProgress}
								<span class="text-xs text-brand font-medium animate-pulse"
									>{$_('home.syncing')}...</span
								>
							{:else if syncStatus.pendingCount > 0}
								<span class="text-xs text-warning font-medium"
									>{syncStatus.pendingCount} pending</span
								>
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
				<div
					class="group bg-surface rounded-2xl border border-border/50 p-6 shadow-sm hover:shadow-brand/20 hover:border-brand/30 transition-all duration-300"
				>
					<div class="flex items-start justify-between mb-4">
						<div
							class="p-3 bg-surface-soft rounded-xl text-2xl group-hover:scale-110 transition-transform duration-300"
						>
							{stat.icon}
						</div>
						<span
							class="text-xs font-bold text-muted uppercase tracking-wider bg-surface-soft px-2 py-1 rounded-md"
							>{$_(stat.labelKey)}</span
						>
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
				<a
					href="/chw"
					class="group relative flex flex-col justify-between overflow-hidden rounded-2xl bg-surface border border-border/50 p-8 shadow-sm hover:border-brand/50 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
				>
					<div
						class="absolute top-0 right-0 -mt-8 -mr-8 h-32 w-32 rounded-full bg-brand/5 transition-all duration-500 group-hover:bg-brand/10 group-hover:scale-150"
					></div>
					<div class="relative z-10">
						<div
							class="h-12 w-12 bg-brand/10 rounded-xl flex items-center justify-center text-brand mb-6 group-hover:scale-110 transition-transform duration-300"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="h-6 w-6"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
								/>
							</svg>
						</div>
						<h3
							class="text-xl font-bold text-surface-emphasis group-hover:text-brand transition-colors"
						>
							{$_('home.chwDashboard')}
						</h3>
						<p class="mt-3 text-base text-muted leading-relaxed">
							Access patient registration, screening tools, and case management.
						</p>
					</div>
					<div
						class="mt-8 flex items-center text-sm font-bold text-brand uppercase tracking-wide relative z-10"
					>
						Launch Dashboard <span
							aria-hidden="true"
							class="ml-2 transition-transform group-hover:translate-x-2">&rarr;</span
						>
					</div>
				</a>

				<a
					href="/asha"
					class="group relative flex flex-col justify-between overflow-hidden rounded-2xl bg-surface border border-border/50 p-8 shadow-sm hover:border-accent/50 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
				>
					<div
						class="absolute top-0 right-0 -mt-8 -mr-8 h-32 w-32 rounded-full bg-accent/5 transition-all duration-500 group-hover:bg-accent/10 group-hover:scale-150"
					></div>
					<div class="relative z-10">
						<div
							class="h-12 w-12 bg-accent/10 rounded-xl flex items-center justify-center text-accent mb-6 group-hover:scale-110 transition-transform duration-300"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="h-6 w-6"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
								/>
							</svg>
						</div>
						<h3
							class="text-xl font-bold text-surface-emphasis group-hover:text-accent transition-colors"
						>
							{$_('home.ashaSupervision')}
						</h3>
						<p class="mt-3 text-base text-muted leading-relaxed">
							Monitor community health trends and manage high-risk follow-ups.
						</p>
					</div>
					<div
						class="mt-8 flex items-center text-sm font-bold text-accent uppercase tracking-wide relative z-10"
					>
						Open Portal <span
							aria-hidden="true"
							class="ml-2 transition-transform group-hover:translate-x-2">&rarr;</span
						>
					</div>
				</a>

				<a
					href="/clinician"
					class="group relative flex flex-col justify-between overflow-hidden rounded-2xl bg-surface border border-border/50 p-8 shadow-sm hover:border-info/50 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
				>
					<div
						class="absolute top-0 right-0 -mt-8 -mr-8 h-32 w-32 rounded-full bg-info/5 transition-all duration-500 group-hover:bg-info/10 group-hover:scale-150"
					></div>
					<div class="relative z-10">
						<div
							class="h-12 w-12 bg-info/10 rounded-xl flex items-center justify-center text-info mb-6 group-hover:scale-110 transition-transform duration-300"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="h-6 w-6"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
								/>
							</svg>
						</div>
						<h3
							class="text-xl font-bold text-surface-emphasis group-hover:text-info transition-colors"
						>
							{$_('home.clinicianReview')}
						</h3>
						<p class="mt-3 text-base text-muted leading-relaxed">
							Review referred cases, provide diagnosis, and issue prescriptions.
						</p>
					</div>
					<div
						class="mt-8 flex items-center text-sm font-bold text-info uppercase tracking-wide relative z-10"
					>
						Access Tools <span
							aria-hidden="true"
							class="ml-2 transition-transform group-hover:translate-x-2">&rarr;</span
						>
					</div>
				</a>
			</div>
		</div>
	</main>
</div>
