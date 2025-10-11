<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { authStore } from '$lib/stores/auth-store';
	import OfflineDataManager from '$lib/offline-data-manager';
	import PrivacySecurityFramework from '$lib/privacy-security-framework';
	
let dataManager: OfflineDataManager;
let securityFramework: PrivacySecurityFramework;

let escalatedCases = [];
let clinicalStats = {
totalEscalations: 0,
pendingReviews: 0,
approvedToday: 0
};

onMount(() => {
// Auth check
const unsubscribe = authStore.subscribe(state => {
if (!state.isAuthenticated && !state.isLoading) {
goto('/auth');
} else if (state.user?.role !== 'CLINICIAN' && state.user?.role !== 'ADMIN') {
goto('/');
}
});

// Initialize backend systems in browser only
dataManager = new OfflineDataManager();
securityFramework = new PrivacySecurityFramework();

loadClinicalData();

return unsubscribe;
});

async function loadClinicalData() {
try {
const allCases = await dataManager.queryRecords('cases', {});
escalatedCases = allCases.filter(c => 
c.aiAnalysis?.riskLevel === 'critical' || 
c.aiAnalysis?.riskLevel === 'high'
);
clinicalStats.totalEscalations = escalatedCases.length;
clinicalStats.pendingReviews = escalatedCases.filter(c => !c.clinicianReview).length;
} catch (error) {
console.error('Failed to load clinical data:', error);
}
}
</script>

<div class="min-h-screen bg-gray-50 p-6">
<div class="max-w-7xl mx-auto">
<div class="flex items-center justify-between mb-6">
<div class="flex items-center space-x-4">
<a href="/" class="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center hover:bg-purple-700 transition-colors" title="Back to Home" aria-label="Back to Home">
<svg class="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
<polyline points="9 22 9 12 15 12 15 22"/>
</svg>
</a>
<h1 class="text-3xl font-bold text-gray-900">Clinician Portal</h1>
</div>
</div>
<div class="bg-white rounded-lg shadow p-6">
<h2 class="text-xl font-semibold mb-4">Clinical Statistics</h2>
<p>Total Escalations: {clinicalStats.totalEscalations}</p>
<p>Pending Reviews: {clinicalStats.pendingReviews}</p>
<p>Approved Today: {clinicalStats.approvedToday}</p>
</div>
</div>
</div>
