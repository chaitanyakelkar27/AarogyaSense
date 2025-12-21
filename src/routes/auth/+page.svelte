<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { authStore } from '$lib/stores/auth-store';
	import { goto } from '$app/navigation';
	import { get } from 'svelte/store';

	let mode: 'login' | 'register' = 'login';
	let email = '';
	let password = '';
	let name = '';
	let role = 'CHW';
	let phone = '';
	let language = 'en';
	let error = '';
	let loading = false;

	// Function to redirect based on role - NO DELAY, direct redirect
	function redirectToRolePage(userRole: string | undefined) {
		const roleStr = userRole?.toLowerCase();
		if (roleStr === 'chw') {
			goto('/chw', { replaceState: true });
		} else if (roleStr === 'asha' || roleStr === 'asha_supervisor') {
			goto('/asha', { replaceState: true });
		} else if (roleStr === 'clinician' || roleStr === 'doctor') {
			goto('/clinician', { replaceState: true });
		} else if (roleStr === 'admin') {
			goto('/admin', { replaceState: true });
		} else {
			goto('/', { replaceState: true });
		}
	}

	async function handleSubmit() {
		error = '';
		loading = true;

		try {
			if (mode === 'login') {
				console.log('[AUTH] Starting login...');
				const result = await authStore.login(email, password);
				console.log('[AUTH] Login result:', result.success, result.user?.role);
				if (!result.success) {
					error = result.error || 'Login failed';
					loading = false;
				} else {
					// Success - redirect based on user role
					console.log('[AUTH] Redirecting to role page...');
					redirectToRolePage(result.user?.role);
				}
			} else {
				if (!name || !email || !password) {
					error = 'Please fill in all required fields';
					loading = false;
					return;
				}

				const result = await authStore.register({
					email,
					password,
					name,
					role,
					phone: phone || undefined,
					language
				});

				if (!result.success) {
					error = result.error || 'Registration failed';
					loading = false;
				} else {
					// Success - redirect based on user role
					redirectToRolePage(result.user?.role);
				}
			}
		} catch (err: any) {
			error = err.message || 'An error occurred';
			loading = false;
		}
	}

	function toggleMode() {
		mode = mode === 'login' ? 'register' : 'login';
		error = '';
	}
</script>

<div
	class="flex min-h-screen items-center justify-center bg-background px-4 py-8 relative overflow-hidden"
>
	<div class="absolute inset-0 bg-brand/5 opacity-50"></div>
	<div class="absolute -top-24 -right-24 w-96 h-96 bg-brand/10 rounded-full blur-3xl"></div>
	<div class="absolute -bottom-24 -left-24 w-96 h-96 bg-accent/5 rounded-full blur-3xl"></div>

	<div class="w-full max-w-md rounded-2xl bg-surface/80 backdrop-blur-md p-8 shadow-xl border border-border/50 relative z-10">
		<!-- Logo/Header -->
		<div class="mb-8 text-center">
			<div class="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand text-brand-foreground shadow-lg shadow-brand/20 transform hover:scale-105 transition-transform duration-300">
				<svg class="h-8 w-8" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
					<path
						d="M10 23.5C10 16.043 15.9102 10 23.1341 10C30.358 10 36.2683 16.043 36.2683 23.5C36.2683 30.957 30.358 37 23.1341 37C20.6317 37 18.2621 36.2849 16.2042 35.0258L10 37.5L11.9477 31.4135C10.691 29.1828 10 26.4589 10 23.5Z"
						fill="currentColor"
					/>
					<path
						d="M26.75 16.75C30.0637 16.75 32.75 19.4363 32.75 22.75C32.75 26.0637 30.0637 28.75 26.75 28.75"
						stroke="hsl(var(--color-brand-foreground))"
						stroke-width="3"
						stroke-linecap="round"
					/>
				</svg>
			</div>
			<h1 class="text-3xl font-bold text-surface-emphasis mb-2">{$_('home.title')}</h1>
			<p class="text-muted">
				{mode === 'login' ? $_('auth.signInToAccount') : $_('auth.createYourAccount')}
			</p>
		</div>
		<!-- Error Message -->
		{#if error}
			<div class="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-600 border border-red-100">
				{error}
			</div>
		{/if}

		<!-- Form -->
		<form
			onsubmit={(e) => {
				e.preventDefault();
				handleSubmit();
			}}
			class="space-y-4"
		>
			{#if mode === 'register'}
				<!-- Name -->
				<div>
					<label for="name" class="mb-1 block text-sm font-medium text-surface-emphasis">
						{$_('auth.fullName')} *
					</label>
					<input
						type="text"
						id="name"
						bind:value={name}
						required
						class="w-full rounded-lg border border-border bg-surface-soft px-4 py-2 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
						placeholder={$_('auth.fullNamePlaceholder')}
					/>
				</div>

				<!-- Role -->
				<div>
					<label for="role" class="mb-1 block text-sm font-medium text-surface-emphasis"> Role * </label>
					<select
						id="role"
						bind:value={role}
						class="w-full rounded-lg border border-border bg-surface-soft px-4 py-2 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
					>
						<option value="CHW">Community Health Worker (CHW)</option>
						<option value="ASHA">ASHA Supervisor</option>
						<option value="CLINICIAN">Clinician</option>
						<option value="ADMIN">Administrator</option>
					</select>
				</div>

				<!-- Phone -->
				<div>
					<label for="phone" class="mb-1 block text-sm font-medium text-surface-emphasis">
						{$_('chw.phoneNumber')}
					</label>
					<input
						type="tel"
						id="phone"
						bind:value={phone}
						class="w-full rounded-lg border border-border bg-surface-soft px-4 py-2 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
						placeholder={$_('chw.phoneNumberPlaceholder')}
					/>
				</div>

				<!-- Language -->
				<div>
					<label for="language" class="mb-1 block text-sm font-medium text-surface-emphasis">
						Preferred Language
					</label>
					<select
						id="language"
						bind:value={language}
						class="w-full rounded-lg border border-border bg-surface-soft px-4 py-2 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
					>
						<option value="en">English</option>
						<option value="hi">हिंदी (Hindi)</option>
						<option value="ta">தமிழ் (Tamil)</option>
						<option value="te">తెలుగు (Telugu)</option>
					</select>
				</div>
			{/if}

			<!-- Email -->
			<div>
				<label for="email" class="mb-1 block text-sm font-medium text-surface-emphasis">
					{$_('auth.username')} *
				</label>
				<input
					type="email"
					id="email"
					bind:value={email}
					required
					class="w-full rounded-lg border border-border bg-surface-soft px-4 py-2 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
					placeholder={$_('auth.usernamePlaceholder')}
				/>
			</div>

			<!-- Password -->
			<div>
				<label for="password" class="mb-1 block text-sm font-medium text-surface-emphasis">
					{$_('auth.password')} *
				</label>
				<input
					type="password"
					id="password"
					bind:value={password}
					required
					minlength="6"
					class="w-full rounded-lg border border-border bg-surface-soft px-4 py-2 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
					placeholder={$_('auth.passwordPlaceholder')}
				/>
				{#if mode === 'register'}
					<p class="mt-1 text-xs text-surface-muted">Minimum 6 characters</p>
				{/if}
			</div>

			<!-- Submit Button -->
			<button
				type="submit"
				disabled={loading}
				class="w-full rounded-lg bg-brand px-4 py-3 font-semibold text-white transition-colors hover:bg-brand-dark focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
			>
				{#if loading}
					<span class="flex items-center justify-center">
						<svg
							class="mr-2 h-5 w-5 animate-spin"
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
						>
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
						{$_('auth.loggingIn')}
					</span>
				{:else}
					{mode === 'login' ? $_('auth.loginButton') : $_('auth.registerButton')}
				{/if}
			</button>
		</form>

		<!-- Toggle Mode -->
		<div class="mt-6 text-center">
			<button
				type="button"
				onclick={toggleMode}
				class="text-sm text-brand hover:text-brand-dark hover:underline"
			>
				{mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
			</button>
		</div>

		<!-- Quick Login (Dev Mode) -->
		{#if mode === 'login'}
			<div class="mt-6 border-t border-border pt-4">
				<p class="mb-2 text-center text-xs text-surface-muted">{$_('auth.demoCredentials')}:</p>
				<div class="grid grid-cols-3 gap-2">
					<button
						type="button"
						onclick={() => {
							email = 'chw@demo.com';
							password = 'demo123';
						}}
						class="rounded bg-surface-soft px-2 py-1 text-xs hover:bg-surface-hover"
					>
						{$_('auth.chw')}
					</button>
					<button
						type="button"
						onclick={() => {
							email = 'asha@demo.com';
							password = 'demo123';
						}}
						class="rounded bg-surface-soft px-2 py-1 text-xs hover:bg-surface-hover"
					>
						{$_('auth.asha')}
					</button>
					<button
						type="button"
						onclick={() => {
							email = 'doctor@demo.com';
							password = 'demo123';
						}}
						class="rounded bg-surface-soft px-2 py-1 text-xs hover:bg-surface-hover"
					>
						{$_('auth.clinician')}
					</button>
				</div>
			</div>
		{/if}
	</div>
</div>
