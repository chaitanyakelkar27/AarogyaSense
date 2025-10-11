<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import OfflineDataManager from '$lib/offline-data-manager';

	let dataManager: OfflineDataManager;
	
	let isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
	let syncStatus = { pendingCount: 0, isOnline: false, syncInProgress: false };
	let totalCases = 0;
	let todayCases = 0;
	let criticalCases = 0;
	let recentActivity: any[] = [];
	
	const heroStats = [
		{ 
			label: 'Total Cases', 
			value: totalCases,
			detail: 'managed offline-first',
			icon: '📋'
		},
		{ 
			label: 'Today\'s Cases', 
			value: todayCases,
			detail: 'captured by CHWs',
			icon: '📊'
		},
		{ 
			label: 'Critical Cases', 
			value: criticalCases,
			detail: 'require immediate attention',
			icon: '🚨'
		}
	];

	// Interactive state management
	let activeModality = 0;
	let activeFlowStep = 0;
	let languageIndex = 0;
	let isVisible = false;
	let scrollY = 0;

	onMount(() => {
		// Initialize dataManager in browser only
		dataManager = new OfflineDataManager();
		
		// Load system data
		loadSystemStats();
		
		// Set up network monitoring
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

		// Update stats periodically
		const statsInterval = setInterval(loadSystemStats, 30000);
		const syncInterval = setInterval(updateSyncStatus, 5000);
		
		// Auto-cycle through modalities
		const modalityInterval = setInterval(() => {
			activeModality = (activeModality + 1) % modalities.length;
		}, 4000);

		// Auto-cycle through flow steps
		const flowInterval = setInterval(() => {
			activeFlowStep = (activeFlowStep + 1) % flowSteps.length;
		}, 3000);

		// Auto-cycle through languages
		const languageInterval = setInterval(() => {
			languageIndex = (languageIndex + 1) % languageSnippets.length;
		}, 2500);

		// Show notifications with delay
		const notificationInterval = setInterval(() => {
			// Hide current notification
			if (notifications[currentNotification]) {
				notifications[currentNotification].visible = false;
			}
			
			// Show next notification
			currentNotification = (currentNotification + 1) % notifications.length;
			setTimeout(() => {
				if (notifications[currentNotification]) {
					notifications[currentNotification].visible = true;
				}
			}, 500);
			
			// Hide after display time
			setTimeout(() => {
				if (notifications[currentNotification]) {
					notifications[currentNotification].visible = false;
				}
			}, 4000);
		}, 6000);

		// Show first notification after delay
		setTimeout(() => {
			notifications[0].visible = true;
		}, 3000);

		isVisible = true;
		updateSyncStatus();

		return () => {
			clearInterval(modalityInterval);
			clearInterval(flowInterval);
			clearInterval(languageInterval);
			clearInterval(notificationInterval);
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
			todayCases = cases.filter(c => new Date(c.timestamp).toDateString() === today).length;
			
			criticalCases = cases.filter(c => c.aiDiagnosis?.riskLevel === 'critical' || c.aiDiagnosis?.riskLevel === 'high').length;
			
			recentActivity = cases.slice(-5).reverse();
		} catch (error) {
			console.error('Failed to load stats:', error);
		}
	}

	function updateSyncStatus() {
		if (!dataManager) return;
		syncStatus = dataManager.getSyncStatus();
	}

	// Floating notifications
	let notifications = [
		{ id: 1, text: "New district partnership in Madhya Pradesh", type: "success", visible: false },
		{ id: 2, text: "95% accuracy achieved in chest X-ray analysis", type: "info", visible: false },
		{ id: 3, text: "1000+ ASHA workers trained this month", type: "achievement", visible: false }
	];

	let currentNotification = 0;
	let hoveredPillar = -1;

	const modalities = [
		{
			name: 'Voice-first intake',
			description:
				'Guided vernacular scripts with emotion cues and auto-transcribed vitals summaries for ASHA review.',
			icon: 'M5 12h14M5 18h14M5 6h14'
		},
		{
			name: 'Image diagnostics',
			description:
				'On-device lesion, edema, and neonatal image analysis with explainable overlays clinicians can audit.',
			icon: 'M4 7h16l-2 10H6L4 7Zm8 4v4m-4-2h8'
		},
		{
			name: 'Text + sensor fusion',
			description:
				'Edge NLP combines symptom checklists with Bluetooth vitals for risk scoring without cloud exposure.',
			icon: 'M5 5h14v6H5zM5 13h8m-8 4h6'
		}
	];

	const flowSteps = [
		{
			step: '01',
			title: 'CHW capture',
			copy:
				'Field app guides community health workers to capture voice notes, photos, and vitals even without connectivity. Each case is recorded locally with tamper-evident IDs.'
		},
		{
			step: '02',
			title: 'Edge AI triage',
			copy:
				'On-device inference rapidly scores severity, flags red alerts, and recommends interventions in the local language within seconds.'
		},
		{
			step: '03',
			title: 'Verification loop',
			copy:
				'Cases sync once online. Clinicians receive concise evidence packets, respond with voice or structured plans, and loop in supervisors when escalation is required.'
		},
		{
			step: '04',
			title: 'Community follow-up',
			copy:
				'ASHA teams get nudges for medicine delivery, follow-up visits, and patient education, closing the loop with auditable outcomes.'
		}
	];

	const safetyPillars = [
		{
			title: 'Federated learning',
			copy:
				'Secure model updates run overnight on district hubs, sending only gradients so case data never leaves the community.'
		},
		{
			title: 'Zero-trust sync',
			copy:
				'Hardware-bound encryption, offline-first caches, and consent-driven sharing policies build trust with patients and clinicians.'
		},
		{
			title: 'Explainable AI',
			copy:
				'Clinicians see multimodal reasoning, confidence levels, and contributing signals before approving care plans.'
		}
	];

	const languageSnippets = [
		{ locale: 'English', phrase: 'Breathing difficulty with mild chest pain noted since morning.' },
		{ locale: 'हिन्दी', phrase: 'सुबह से हल्का सीने का दर्द और सांस लेने में तकलीफ़ परिज़न बता रहे हैं।' },
		{ locale: 'मराठी', phrase: 'सकाळपासून छातीत हलका त्रास आणि श्वास घेण्यात अडचण जाणवते.' },
		{ locale: 'বাংলা', phrase: 'সকাল থেকেই হালকা বু��ব্যথা ও শ্বাসকষ্ট লক্ষ্য করা যাচ্ছে।' }
	];

	const assuranceHighlights = [
		{
			title: 'Clinician command center',
			copy:
				'Resolve escalations via secure voice, templates, or AI-assisted note drafting, with timeline audit trails for every case.'
		},
		{
			title: 'ASHA mentoring workspace',
			copy:
				'Microlearning nudges, digital SOPs, and supervisor feedback loops keep grassroots workforce supported and upskilled.'
		}
	];
</script>

<!-- Scroll tracking -->
<svelte:window bind:scrollY />

<div class="relative isolate overflow-hidden">
	<!-- Floating Notifications -->
	<div class="fixed top-4 right-4 z-50 space-y-2">
		{#each notifications as notification}
			<div 
				class="transform transition-all duration-500 ease-in-out"
				class:translate-x-0={notification.visible}
				class:translate-x-full={!notification.visible}
				class:opacity-100={notification.visible}
				class:opacity-0={!notification.visible}
			>
				<div 
					class="rounded-lg px-4 py-3 shadow-lg border backdrop-blur-md max-w-sm"
					class:bg-green-50={notification.type === 'success'}
					class:border-green-200={notification.type === 'success'}
					class:text-green-800={notification.type === 'success'}
					class:bg-blue-50={notification.type === 'info'}
					class:border-blue-200={notification.type === 'info'}
					class:text-blue-800={notification.type === 'info'}
					class:bg-purple-50={notification.type === 'achievement'}
					class:border-purple-200={notification.type === 'achievement'}
					class:text-purple-800={notification.type === 'achievement'}
				>
					<div class="flex items-center gap-2">
						<div 
							class="w-2 h-2 rounded-full animate-pulse"
							class:bg-green-500={notification.type === 'success'}
							class:bg-blue-500={notification.type === 'info'}
							class:bg-purple-500={notification.type === 'achievement'}
						></div>
						<p class="text-sm font-medium">{notification.text}</p>
					</div>
				</div>
			</div>
		{/each}
	</div>

	<!-- Scroll Progress Indicator -->
	<div class="fixed top-0 left-0 w-full h-1 bg-surface/20 z-40">
		<div 
			class="h-full bg-gradient-to-r from-brand to-accent transition-all duration-300 ease-out"
			style="width: {scrollY > 0 ? Math.min(100, (scrollY / 2000) * 100) : 0}%"
		></div>
	</div>

	<div class="pointer-events-none absolute inset-x-0 top-[-200px] z-[-1] h-[420px] bg-pulse-rings" aria-hidden="true"></div>

	<section id="overview" class="relative">
		<div class="mx-auto grid max-w-6xl gap-10 px-6 pb-16 pt-20 lg:grid-cols-12 lg:items-center lg:gap-14">
			<div class="lg:col-span-7">
				<span class="badge">Offline-first, privacy-first care</span>
				<h1 class="mt-6 text-4xl font-bold text-surface-emphasis sm:text-5xl">
					AI diagnostics designed for rural and low-resource communities
				</h1>
				<p class="mt-5 max-w-xl text-lg text-muted">
					AarogyaSense brings together on-device AI, multimodal capture, and human verification loops so
					ASHA workers, nurses, and clinicians act in sync—even without reliable connectivity.
				</p>
				<div class="mt-8 flex flex-wrap items-center gap-4">
					<a
						href="/chw"
						class="rounded-full bg-brand px-6 py-3 text-sm font-semibold text-brand-foreground shadow-brand transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:scale-105 group"
					>
						<span class="flex items-center gap-2">
							Start New Case (CHW)
							<svg class="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M5 12h14m-7-7l7 7-7 7"/>
							</svg>
						</span>
					</a>
					<a
						href="/asha"
						class="rounded-full border border-brand/30 px-6 py-3 text-sm font-semibold text-brand shadow-soft transition-all duration-300 hover:border-brand hover:bg-brand/10 hover:-translate-y-0.5 hover:shadow-lg group"
					>
						<span class="flex items-center gap-2">
							ASHA Portal
							<svg class="w-4 h-4 transition-transform duration-300 group-hover:rotate-45" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M7 17l9.2-9.2M17 17V7H7"/>
							</svg>
						</span>
					</a>
					<a
						href="/clinician"
						class="rounded-full border border-brand/30 px-6 py-3 text-sm font-semibold text-brand shadow-soft transition-all duration-300 hover:border-brand hover:bg-brand/10 hover:-translate-y-0.5 hover:shadow-lg group"
					>
						<span class="flex items-center gap-2">
							Clinician Portal
							<svg class="w-4 h-4 transition-transform duration-300 group-hover:rotate-45" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M7 17l9.2-9.2M17 17V7H7"/>
							</svg>
						</span>
					</a>
				</div>
				<div class="mt-10 grid gap-5 sm:grid-cols-3">
					{#each heroStats as stat, i}
						<div class="stat group cursor-pointer transition-all duration-300 hover:scale-105 hover:bg-surface/50 rounded-2xl p-4 -m-4">
							<div class="flex items-center gap-2 mb-2">
								<span class="text-2xl">{stat.icon}</span>
								<div class="flex items-center gap-2">
									<span class="text-3xl font-semibold text-surface-emphasis transition-colors duration-300 group-hover:text-brand">
										{stat.value}
									</span>
									{#if i === 0 && syncStatus.pendingCount > 0}
										<span class="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full font-bold">
											{syncStatus.pendingCount} pending sync
										</span>
									{/if}
								</div>
							</div>
							<span class="text-xs font-semibold uppercase tracking-[0.25em] text-muted group-hover:text-brand/80 transition-colors duration-300">{stat.label}</span>
							<p class="text-xs text-muted group-hover:text-surface-emphasis transition-colors duration-300">{stat.detail}</p>
							<div class="h-0.5 w-0 bg-brand transition-all duration-500 group-hover:w-full mt-2"></div>
						</div>
					{/each}
				</div>
				
				<!-- System Status -->
				<div class="mt-8 flex items-center gap-4 p-4 bg-surface/50 rounded-2xl border border-border/60">
					<div class="flex items-center gap-2">
						<div class="w-3 h-3 rounded-full {isOnline ? 'bg-green-500' : 'bg-red-500'} animate-pulse"></div>
						<span class="text-sm font-medium text-muted">
							{isOnline ? '🌐 Online' : '📵 Offline Mode'}
						</span>
					</div>
					<div class="h-6 w-px bg-border"></div>
					<span class="text-sm text-muted">
						💾 {totalCases} cases stored locally
					</span>
					{#if syncStatus.syncInProgress}
						<div class="h-6 w-px bg-border"></div>
						<span class="text-sm text-brand animate-pulse">
							🔄 Syncing data...
						</span>
					{/if}
				</div>
			</div>
			<div class="lg:col-span-5">
				<div class="glass relative overflow-hidden p-6">
					<div class="absolute right-8 top-8 h-32 w-32 rounded-full bg-brand/20 blur-3xl"></div>
					<div class="absolute left-6 top-12 h-16 w-16 rounded-full bg-accent/20 blur-2xl"></div>
					<h2 class="text-lg font-semibold text-surface-emphasis">Field kit diagnostics</h2>
					<p class="mt-3 text-sm text-muted">
						Capture vitals via Bluetooth, record contextual voice notes, attach imagery, and let cobuilt AI
						assist in triage—all stored locally until you decide to sync.
					</p>
					<ul class="mt-6 space-y-4">
						{#each modalities as modality, i}
							<li class="flex items-start gap-4 rounded-2xl border transition-all duration-500 p-4 {i === activeModality ? 'border-brand bg-brand bg-opacity-5 scale-105 shadow-lg' : 'border-border/70 bg-surface-soft/70'}">
								<button
									class="flex items-start gap-4 w-full text-left bg-transparent border-none p-0 cursor-pointer"
									onclick={() => activeModality = i}
									aria-label={`View ${modality.name} modality details`}
								>
									<div 
										class="flex h-11 w-11 items-center justify-center rounded-2xl transition-all duration-300"
										class:bg-brand={i === activeModality}
										class:text-white={i === activeModality}
										class:bg-brand-muted={i !== activeModality}
										class:text-brand={i !== activeModality}
									>
										<svg class="h-5 w-5 transition-transform duration-300" class:rotate-12={i === activeModality} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
											<path d={modality.icon} />
										</svg>
									</div>
									<div class="flex-1">
										<p class="text-sm font-semibold transition-colors duration-300"
											class:text-brand={i === activeModality}
											class:text-surface-emphasis={i !== activeModality}
										>{modality.name}</p>
										<p class="mt-1 text-sm text-muted">{modality.description}</p>
										{#if i === activeModality}
											<div class="mt-2 flex items-center gap-2 text-xs text-brand">
												<div class="w-2 h-2 bg-brand rounded-full animate-pulse"></div>
												Active diagnostic mode
											</div>
										{/if}
									</div>
								</button>
							</li>
						{/each}
					</ul>
					<div class="mt-6 flex items-center justify-between rounded-2xl bg-brand/10 px-5 py-4 text-sm text-brand">
						<span>Offline data vault • AES-256 encrypted</span>
						<svg class="h-5 w-5" viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
							<path d="M5 12l4 4 10-10" />
						</svg>
					</div>
				</div>
			</div>
		</div>
	</section>

	<section id="capabilities" class="bg-surface/70 py-20">
		<div class="mx-auto grid max-w-6xl gap-12 px-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
			<div class="space-y-6">
				<h2 class="text-3xl font-semibold text-surface-emphasis">Edge intelligence that earns trust</h2>
				<p class="text-lg text-muted">
					Run inference on affordable Android devices, sync over 2G, and keep community data
					sovereign with federated analytics. Alerts, triage, and follow-up tasks stay available even when
					connectivity drops for days.
				</p>
				<div class="grid gap-5 sm:grid-cols-2">
					<div class="glass p-5">
						<h3 class="text-base font-semibold text-surface-emphasis">Edge inference packs</h3>
						<p class="mt-2 text-sm text-muted">
							Deploy differential model packs by geography—maternal care, chronic disease, or vector-borne
							surveillance—without shipping entire app updates.
						</p>
					</div>
					<div class="glass p-5">
						<h3 class="text-base font-semibold text-surface-emphasis">Collaborative triage</h3>
						<p class="mt-2 text-sm text-muted">
							AI suggests urgency, human supervisors approve, and automated IVR or SMS nudges loop in
							patients in their preferred language.
						</p>
					</div>
				</div>
				<div class="rounded-3xl border border-border/60 bg-surface-soft/70 p-6">
					<div class="flex flex-wrap gap-4 text-sm text-muted">
						<span class="rounded-full bg-brand/15 px-4 py-2 text-brand">Works fully offline</span>
						<span class="rounded-full bg-surface px-4 py-2">Bluetooth vitals</span>
						<span class="rounded-full bg-surface px-4 py-2">Pregnancy tracking</span>
						<span class="rounded-full bg-surface px-4 py-2">Communicable diseases</span>
						<span class="rounded-full bg-surface px-4 py-2">Mental health screening</span>
					</div>
				</div>
			</div>
			<div class="glass relative overflow-hidden p-6">
				<div class="absolute -right-16 top-10 h-56 w-56 rounded-full bg-accent/20 blur-3xl"></div>
				<h3 class="text-lg font-semibold text-surface-emphasis">Multilingual conversations</h3>
				<p class="mt-3 text-sm text-muted">
					Localize symptom capture, AI feedback, and consent forms instantly. Swap voice prompts, UI language,
					and printouts to match community comfort levels.
				</p>
				<div class="mt-6 relative h-32 overflow-hidden rounded-2xl border border-border/70 bg-surface">
					{#each languageSnippets as snippet, i}
						<div 
							class="absolute inset-0 p-4 transition-all duration-700 ease-in-out"
							class:opacity-100={i === languageIndex}
							class:translate-y-0={i === languageIndex}
							class:opacity-0={i !== languageIndex}
							class:translate-y-4={i !== languageIndex}
						>
							<p class="text-xs font-semibold uppercase tracking-[0.3em] text-muted flex items-center gap-2">
								<span class="w-2 h-2 bg-brand rounded-full animate-pulse"></span>
								{snippet.locale}
							</p>
							<p class="mt-2 text-sm text-surface-emphasis leading-relaxed">{snippet.phrase}</p>
						</div>
					{/each}
					<div class="absolute bottom-4 right-4 flex gap-1">
						{#each languageSnippets as snippet, i}
							<button
								class="w-1.5 h-1.5 rounded-full transition-all duration-300"
								class:bg-brand={i === languageIndex}
								class:bg-border={i !== languageIndex}
								onclick={() => languageIndex = i}
								aria-label={`Switch to ${snippet.locale} language example`}
							></button>
						{/each}
					</div>
				</div>
				<div class="mt-6 flex items-center gap-3 rounded-2xl border border-brand/30 bg-brand/10 p-4 text-sm text-brand">
					<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">
						<path d="M12 3v18m9-9H3" />
					</svg>
					<span>Instantly add new dialect packs via Builder console.</span>
				</div>
			</div>
		</div>
	</section>

	<section id="community-loop" class="py-20">
		<div class="mx-auto max-w-6xl space-y-12 px-6">
			<div class="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
				<div>
					<span class="badge">Process orchestration</span>
					<h2 class="mt-6 text-3xl font-semibold">Human-in-the-loop verification</h2>
					<p class="mt-4 text-lg text-muted">
						Every case flows from field worker capture to clinician validation with auditable checkpoints. Assign
						supervisors, track medication deliveries, and surface summaries in regional languages.
					</p>
				</div>
				<div class="grid gap-6 md:grid-cols-2">
					{#each assuranceHighlights as highlight}
						<div class="glass p-6">
							<h3 class="text-lg font-semibold text-surface-emphasis">{highlight.title}</h3>
							<p class="mt-3 text-sm text-muted">{highlight.copy}</p>
						</div>
					{/each}
				</div>
			</div>
			<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
				{#each flowSteps as item, i}
					<div 
						class="rounded-3xl border transition-all duration-500 cursor-pointer group"
						class:border-brand={i === activeFlowStep}
						class:bg-brand-muted={i === activeFlowStep}
						class:shadow-lg={i === activeFlowStep}
						class:scale-105={i === activeFlowStep}
						class:border-border={i !== activeFlowStep}
						class:bg-surface={i !== activeFlowStep}
						onclick={() => activeFlowStep = i}
						onkeydown={(e) => e.key === 'Enter' && (activeFlowStep = i)}
						role="button"
						tabindex="0"
					>
						<div class="p-6 relative overflow-hidden">
							{#if i === activeFlowStep}
								<div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand to-accent"></div>
							{/if}
							<div class="flex items-center justify-between">
								<span 
									class="text-2xl font-semibold transition-all duration-300"
									class:text-brand={i === activeFlowStep}
									class:scale-110={i === activeFlowStep}
								>{item.step}</span>
								<span 
									class="rounded-full px-3 py-1 text-xs transition-all duration-300"
									class:bg-brand={i === activeFlowStep}
									class:text-white={i === activeFlowStep}
									class:bg-brand-muted={i !== activeFlowStep}
									class:text-brand={i !== activeFlowStep}
								>
									{#if i === activeFlowStep}
										<span class="flex items-center gap-1">
											<div class="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
											Active
										</span>
									{:else}
										Sync smart
									{/if}
								</span>
							</div>
							<h3 class="mt-4 text-lg font-semibold text-surface-emphasis group-hover:text-brand transition-colors duration-300">{item.title}</h3>
							<p class="mt-3 text-sm text-muted group-hover:text-surface-emphasis transition-colors duration-300">{item.copy}</p>
							{#if i < flowSteps.length - 1}
								<div class="absolute -right-3 top-1/2 transform -translate-y-1/2 w-6 h-6 bg-brand/20 rounded-full flex items-center justify-center lg:block hidden">
									<svg class="w-3 h-3 text-brand" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
										<path d="M9 18l6-6-6-6"/>
									</svg>
								</div>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<section id="privacy-security" class="bg-surface-soft/50 py-20">
		<div class="mx-auto max-w-6xl space-y-10 px-6">
			<div class="grid gap-10 lg:grid-cols-[1fr_0.9fr] lg:items-center">
				<div class="space-y-4">
					<span class="badge">Trusted analytics</span>
					<h2 class="text-3xl font-semibold text-surface-emphasis">Privacy-preserving intelligence</h2>
					<p class="text-lg text-muted">
						Secure aggregation keeps personal health information within the village. Federated learning means
						models adapt to emerging syndromes while respecting community consent.
					</p>
				</div>
				<div class="glass grid gap-6 p-6 sm:grid-cols-3">
					<div class="rounded-2xl bg-brand/10 p-4 text-center text-brand cursor-pointer group transition-all duration-300 hover:scale-105 hover:bg-brand/20">
						<p class="text-3xl font-semibold group-hover:scale-110 transition-transform duration-300">98%</p>
						<p class="mt-1 text-xs font-semibold uppercase tracking-[0.25em]">Edge accuracy</p>
						<div class="w-0 h-0.5 bg-brand mx-auto mt-2 group-hover:w-full transition-all duration-500"></div>
					</div>
					<div class="rounded-2xl bg-surface p-4 text-center text-surface-emphasis cursor-pointer group transition-all duration-300 hover:scale-105 hover:bg-surface-soft">
						<p class="text-3xl font-semibold group-hover:scale-110 transition-transform duration-300">12 MB</p>
						<p class="mt-1 text-xs font-semibold uppercase tracking-[0.25em]">Model packs</p>
						<div class="w-0 h-0.5 bg-surface-emphasis mx-auto mt-2 group-hover:w-full transition-all duration-500"></div>
					</div>
					<div class="rounded-2xl bg-accent/20 p-4 text-center text-accent cursor-pointer group transition-all duration-300 hover:scale-105 hover:bg-accent/30">
						<p class="text-3xl font-semibold group-hover:scale-110 transition-transform duration-300">24 hrs</p>
						<p class="mt-1 text-xs font-semibold uppercase tracking-[0.25em]">Sync SLA</p>
						<div class="w-0 h-0.5 bg-accent mx-auto mt-2 group-hover:w-full transition-all duration-500"></div>
					</div>
				</div>
			</div>
			<div class="grid gap-6 md:grid-cols-3">
				{#each safetyPillars as pillar, i}
					<div 
						class="rounded-3xl border border-border/70 bg-surface p-6 group cursor-pointer transition-all duration-500 hover:border-brand/50 hover:bg-brand/5 hover:shadow-lg hover:-translate-y-2 relative"
						style="animation-delay: {i * 200}ms"
						class:animate-pulse={isVisible}
						onmouseenter={() => hoveredPillar = i}
						onmouseleave={() => hoveredPillar = -1}
						role="article"
					>
						<div class="flex items-start gap-3">
							<div class="w-8 h-8 rounded-full bg-brand/10 group-hover:bg-brand flex items-center justify-center transition-all duration-300 relative">
								<svg class="w-4 h-4 text-brand group-hover:text-white transition-colors duration-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									{#if i === 0}
										<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
									{:else if i === 1}
										<path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
									{:else}
										<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
									{/if}
								</svg>
								{#if hoveredPillar === i}
									<div class="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-ping"></div>
									<div class="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full"></div>
								{/if}
							</div>
							<div class="flex-1">
								<h3 class="text-lg font-semibold text-surface-emphasis group-hover:text-brand transition-colors duration-300">{pillar.title}</h3>
								<p class="mt-3 text-sm text-muted group-hover:text-surface-emphasis transition-colors duration-300">{pillar.copy}</p>
							</div>
						</div>
						<div class="mt-4 flex items-center gap-2 text-xs text-brand opacity-0 group-hover:opacity-100 transition-opacity duration-300">
							<div class="w-1.5 h-1.5 bg-brand rounded-full animate-pulse"></div>
							Security verified
						</div>
						
						<!-- Enhanced tooltip for detailed info -->
						{#if hoveredPillar === i}
							<div class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap z-10 animate-fade-in">
								{#if i === 0}
									Updates models without exposing patient data
								{:else if i === 1}
									End-to-end encryption with hardware security
								{:else}
									AI decisions with full transparency and audit trails
								{/if}
								<div class="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	</section>

	<section class="py-20">
		<div class="mx-auto grid max-w-6xl gap-10 px-6 lg:grid-cols-[1fr_0.8fr] lg:items-center">
			<div class="glass overflow-hidden p-6">
				<h2 class="text-2xl font-semibold text-surface-emphasis">Program command console</h2>
				<p class="mt-3 text-sm text-muted">
					District-level health officers get aggregated signals, outbreak watchlists, and workforce performance
					analytics. Export anonymized cohorts for policy planning in one click.
				</p>
				<div class="mt-6 grid gap-4 sm:grid-cols-2">
					<div class="rounded-2xl border border-border/70 bg-surface p-4">
						<p class="text-xs font-semibold uppercase tracking-[0.3em] text-muted">Cohort outlook</p>
						<p class="mt-2 text-sm text-surface-emphasis">Track maternal care readiness, chronic risk, and adverse event alerts by district.</p>
					</div>
					<div class="rounded-2xl border border-border/70 bg-surface p-4">
						<p class="text-xs font-semibold uppercase tracking-[0.3em] text-muted">Digital twins</p>
						<p class="mt-2 text-sm text-surface-emphasis">Create evolving household health journeys to monitor adherence and impact.</p>
					</div>
				</div>
				<div class="mt-6 rounded-2xl border border-brand/30 bg-brand/10 p-4 text-sm text-brand">
					Edge telemetrics encrypted with post-quantum safe curves.
				</div>
			</div>
			<div class="space-y-6">
				<h2 class="text-3xl font-semibold text-surface-emphasis">Why communities trust AarogyaSense</h2>
				<ul class="space-y-4">
					<li class="flex items-start gap-3">
						<div class="mt-1 h-2 w-2 rounded-full bg-brand"></div>
						<p class="text-sm text-muted">Co-designed with ASHA unions and rural clinicians for real-world workflows.</p>
					</li>
					<li class="flex items-start gap-3">
						<div class="mt-1 h-2 w-2 rounded-full bg-brand"></div>
						<p class="text-sm text-muted">Transparent governance, opt-in consent layers, and offline functionality by default.</p>
					</li>
					<li class="flex items-start gap-3">
						<div class="mt-1 h-2 w-2 rounded-full bg-brand"></div>
						<p class="text-sm text-muted">Dedicated onboarding, multilingual training, and 24/7 clinician backup hotlines.</p>
					</li>
				</ul>
				<div class="flex flex-wrap gap-4 text-sm text-muted">
					<span class="rounded-full bg-surface px-4 py-2">NQAS compliant</span>
					<span class="rounded-full bg-surface px-4 py-2">HIPAA aligned</span>
					<span class="rounded-full bg-surface px-4 py-2">ISO/IEC 27001 ready</span>
				</div>
			</div>
		</div>
	</section>

	<section class="pb-20">
		<div class="mx-auto max-w-5xl rounded-3xl border border-border/60 bg-surface/80 px-8 py-12 text-center shadow-soft">
			<span class="badge">Partner with us</span>
			<h2 class="mt-5 text-3xl font-semibold text-surface-emphasis">Bring equitable diagnostics to every village</h2>
			<p class="mt-4 text-base text-muted">
				Pilot AarogyaSense with your district, health startup, or NGO. We support phased rollouts,
				customized clinical pathways, and rigorous data privacy reviews.
			</p>
			<div class="mt-6 flex flex-col items-center justify-center gap-4 sm:flex-row">
				<a
					href="mailto:care@aarogyasense.org"
					class="w-full rounded-full bg-brand px-6 py-3 text-sm font-semibold text-brand-foreground shadow-brand transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:scale-105 sm:w-auto group relative overflow-hidden"
				>
					<div class="absolute inset-0 bg-gradient-to-r from-brand to-accent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
					<span class="relative flex items-center gap-2">
						Schedule a discovery call
						<svg class="w-4 h-4 transition-transform duration-300 group-hover:rotate-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
						</svg>
					</span>
				</a>
				<a
					href="/clinician"
					class="w-full rounded-full border border-brand/20 px-6 py-3 text-sm font-semibold text-brand shadow-soft transition-all duration-300 hover:border-brand hover:bg-brand/10 hover:-translate-y-1 hover:shadow-lg sm:w-auto group"
				>
					<span class="flex items-center gap-2">
						Preview clinician portal
						<svg class="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M3 3h18v18H3zM9 9h6m-6 4h4"/>
						</svg>
					</span>
				</a>
			</div>
			<p class="mt-6 text-xs text-muted">Powered by on-device AI, secure sync infrastructure, and compassionate community partnerships.</p>
		</div>
	</section>
</div>
