<script lang="ts">
	import '../app.css';
	import { authStore } from '$lib/stores/auth-store';
	import { goto } from '$app/navigation';

	let { children } = $props();

	// Role-based access control
	const roleAccess = {
		CLINICIAN: ['/', '/chw', '/asha', '/clinician'],
		DOCTOR: ['/', '/chw', '/asha', '/clinician'],
		ADMIN: ['/', '/chw', '/asha', '/clinician'],
		ASHA: ['/', '/chw', '/asha'],
		ASHA_SUPERVISOR: ['/', '/chw', '/asha'],
		CHW: ['/', '/chw']
	};

	const allNavItems = [
		{ label: 'Home', href: '/', roles: ['CHW', 'ASHA', 'ASHA_SUPERVISOR', 'CLINICIAN', 'DOCTOR', 'ADMIN'] },
		{ label: 'CHW App', href: '/chw', roles: ['CHW', 'ASHA', 'ASHA_SUPERVISOR', 'CLINICIAN', 'DOCTOR', 'ADMIN'] },
		{ label: '🤖 AI Assistant', href: '/chw/ai', roles: ['CHW', 'ASHA', 'ASHA_SUPERVISOR', 'CLINICIAN', 'DOCTOR', 'ADMIN'] },
		{ label: 'ASHA Portal', href: '/asha', roles: ['ASHA', 'ASHA_SUPERVISOR', 'CLINICIAN', 'DOCTOR', 'ADMIN'] },
		{ label: 'Clinician Portal', href: '/clinician', roles: ['CLINICIAN', 'DOCTOR', 'ADMIN'] }
	];

	// Filter nav items based on user role
	let navItems = $derived(() => {
		const userRole = $authStore.user?.role;
		if (!userRole) return [{ label: 'Home', href: '/', roles: [] }];
		
		return allNavItems.filter(item => item.roles.includes(userRole));
	});

	let menuOpen = $state(false);

	function toggleMenu() {
		menuOpen = !menuOpen;
	}

	function closeMenu() {
		menuOpen = false;
	}

	function handleLogout() {
		authStore.logout();
		goto('/auth');
		closeMenu();
	}

	// Check if user has access to a specific path
	export function hasAccess(path: string, role: string | undefined): boolean {
		if (!role) return false;
		const allowedPaths = roleAccess[role as keyof typeof roleAccess] || ['/'];
		return allowedPaths.some(p => path.startsWith(p));
	}
</script>

<div class="flex min-h-screen flex-col">
	<header class="sticky top-0 z-40 border-b border-border/60 bg-surface/70 backdrop-blur">
		<div class="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
			<a href="/" class="group flex items-center gap-3" onclick={closeMenu}>
				<div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand text-brand-foreground shadow-brand transition-transform group-hover:rotate-3">
					<svg class="h-7 w-7" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
						<path
							d="M10 23.5C10 16.043 15.9102 10 23.1341 10C30.358 10 36.2683 16.043 36.2683 23.5C36.2683 30.957 30.358 37 23.1341 37C20.6317 37 18.2621 36.2849 16.2042 35.0258L10 37.5L11.9477 31.4135C10.691 29.1828 10 26.4589 10 23.5Z"
							fill="currentColor"
						/>
						<path
							d="M26.75 16.75C30.0637 16.75 32.75 19.4363 32.75 22.75C32.75 26.0637 30.0637 28.75 26.75 28.75"
							stroke="hsl(var(--color-brand-foreground))"
							stroke-width="2.4"
							stroke-linecap="round"
						/>
					</svg>
				</div>
				<div class="flex flex-col">
					<span class="text-sm uppercase tracking-[0.3em] text-muted">AarogyaSense</span>
					<span class="font-display text-lg text-surface-emphasis">AI Community Health</span>
				</div>
			</a>
			<nav class="hidden items-center gap-8 lg:flex">
				{#each navItems() as item}
					<a
						href={item.href}
						class="text-sm font-semibold text-muted transition-colors hover:text-surface-emphasis"
					>
						{item.label}
					</a>
				{/each}
			</nav>
			<div class="hidden items-center gap-4 lg:flex">
				{#if $authStore.isAuthenticated}
					<div class="flex items-center gap-3">
						<span class="text-sm text-muted">
							{$authStore.user?.name} ({$authStore.user?.role})
						</span>
						<button
							type="button"
							onclick={handleLogout}
							class="rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
						>
							Logout
						</button>
					</div>
				{:else}
					<a
						href="/auth"
						class="rounded-full border border-brand/20 bg-brand/10 px-5 py-2 text-sm font-semibold text-brand shadow-soft transition-colors hover:border-brand hover:bg-brand hover:text-brand-foreground"
					>
						Sign In
					</a>
				{/if}
			</div>
			<button
				type="button"
				class="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border/80 bg-surface text-surface-emphasis shadow-soft lg:hidden"
				onclick={toggleMenu}
				aria-label="Toggle navigation"
				aria-expanded={menuOpen}
			>
				<svg class={`h-5 w-5 transition-transform ${menuOpen ? 'rotate-45' : ''}`} viewBox="0 0 24 24">
					<path
						d="M4 7h16M4 12h16M4 17h10"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				</svg>
			</button>
		</div>
		{#if menuOpen}
			<div class="border-t border-border/60 bg-surface lg:hidden">
				<nav class="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-5">
					{#each navItems() as item}
						<a
							href={item.href}
							class="text-base font-semibold text-muted transition-colors hover:text-surface-emphasis"
							onclick={closeMenu}
						>
							{item.label}
						</a>
					{/each}
					
					{#if $authStore.isAuthenticated}
						<div class="rounded-lg bg-gray-50 p-4">
							<p class="text-sm font-medium text-gray-900">{$authStore.user?.name}</p>
							<p class="text-xs text-gray-600">{$authStore.user?.role} • {$authStore.user?.email}</p>
						</div>
						<button
							type="button"
							onclick={handleLogout}
							class="rounded-full bg-red-600 px-5 py-3 text-center text-sm font-semibold text-white"
						>
							Logout
						</button>
					{:else}
						<a
							href="/auth"
							class="rounded-full bg-brand px-5 py-3 text-center text-sm font-semibold text-brand-foreground shadow-brand"
							onclick={closeMenu}
						>
							Sign In
						</a>
					{/if}
				</nav>
			</div>
		{/if}
	</header>
	<main class="flex-1">
		{@render children()}
	</main>
	<footer class="border-t border-border/60 bg-surface/80">
		<div class="mx-auto grid max-w-6xl gap-8 px-6 py-12 md:grid-cols-2 lg:grid-cols-4">
			<div class="space-y-4">
				<span class="badge">Privacy-first AI</span>
				<p class="text-base text-muted">
					AarogyaSense empowers community health workers with secure, offline diagnostics and
					trusted clinical escalation paths.
				</p>
			</div>
			<div>
				<h3 class="mb-3 text-sm font-semibold uppercase tracking-[0.3em] text-muted">Platform</h3>
				<ul class="space-y-2 text-sm text-muted">
					<li><a href="#capabilities">AI Diagnostics</a></li>
					<li><a href="#community-loop">Verification Loop</a></li>
					<li><a href="#privacy-security">Edge Security</a></li>
				</ul>
			</div>
			<div>
				<h3 class="mb-3 text-sm font-semibold uppercase tracking-[0.3em] text-muted">Community</h3>
				<ul class="space-y-2 text-sm text-muted">
					<li><a href="/clinician">Clinician Portal</a></li>
					<li><a href="#community-loop">ASHA Network</a></li>
					<li><a href="#contact">Partner With Us</a></li>
				</ul>
			</div>
			<div id="contact" class="space-y-4">
				<h3 class="text-sm font-semibold uppercase tracking-[0.3em] text-muted">Contact</h3>
				<p class="text-sm text-muted">
					Email <a href="mailto:care@aarogyasense.org" class="underline decoration-brand/40 underline-offset-4">care@aarogyasense.org</a>
					for pilots and partnerships.
				</p>
				<div class="flex flex-wrap gap-3 text-sm text-muted">
					<span>English</span>
					<span>हिन्दी</span>
					<span>मराठी</span>
					<span>ಕನ್ನಡ</span>
				</div>
			</div>
		</div>
		<div class="border-t border-border/60 bg-surface/60">
			<div class="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-6 text-xs text-muted md:flex-row md:items-center md:justify-between">
				<span>© {new Date().getFullYear()} AarogyaSense. All rights reserved.</span>
				<span>Built for rural and low-resource care ecosystems.</span>
			</div>
		</div>
	</footer>
</div>
