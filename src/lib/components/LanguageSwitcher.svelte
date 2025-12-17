<script lang="ts">
	import { locale } from 'svelte-i18n';

	const languages = [
		{ code: 'en', name: 'English', flag: '🇬🇧' },
		{ code: 'hi', name: 'हिंदी', flag: '🇮🇳' },
		{ code: 'mr', name: 'मराठी', flag: '🇮🇳' }
	];

	let isOpen = $state(false);

	function switchLanguage(lang: string) {
		locale.set(lang);
		localStorage.setItem('locale', lang);
		isOpen = false;
	}

	function toggleDropdown() {
		isOpen = !isOpen;
	}

	const currentLang = $derived(languages.find((l) => l.code === $locale) || languages[0]);
</script>

<div class="relative">
	<button
		onclick={toggleDropdown}
		class="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-gray-300 transition-colors hover:bg-gray-50"
		aria-label="Select Language"
	>
		<span class="text-lg">{currentLang.flag}</span>
		<span class="hidden sm:inline">{currentLang.name}</span>
		<svg
			class="h-4 w-4 transition-transform {isOpen ? 'rotate-180' : ''}"
			fill="none"
			stroke="currentColor"
			viewBox="0 0 24 24"
		>
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
		</svg>
	</button>

	{#if isOpen}
		<div
			class="absolute right-0 z-50 mt-2 w-48 origin-top-right rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5"
		>
			<div class="py-1">
				{#each languages as lang}
					<button
						onclick={() => switchLanguage(lang.code)}
						class="flex w-full items-center gap-3 px-4 py-2 text-sm transition-colors hover:bg-gray-100 {$locale ===
						lang.code
							? 'bg-gray-50 font-semibold'
							: ''}"
					>
						<span class="text-lg">{lang.flag}</span>
						<span>{lang.name}</span>
						{#if $locale === lang.code}
							<svg class="ml-auto h-4 w-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
								<path
									fill-rule="evenodd"
									d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
									clip-rule="evenodd"
								/>
							</svg>
						{/if}
					</button>
				{/each}
			</div>
		</div>
	{/if}
</div>

<!-- Click outside to close -->
{#if isOpen}
	<button
		onclick={() => (isOpen = false)}
		class="fixed inset-0 z-40"
		aria-label="Close language menu"
	></button>
{/if}
