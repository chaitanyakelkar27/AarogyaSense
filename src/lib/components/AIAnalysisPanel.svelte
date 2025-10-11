<script lang="ts">
	import { onMount } from 'svelte';
	import EdgeAIDiagnostics from '$lib/edge-ai-diagnostics.js';

	export let caseId: string = '';
	export let onAnalysisComplete: ((result: any) => void) | null = null;

	let aiEngine: EdgeAIDiagnostics | null = null;
	let isAnalyzing = false;
	let analysisResult: any = null;
	let modelStatus = { modelsLoaded: false };
	let analysisProgress = 0;
	let currentStep = '';

	const analysisSteps = [
		'Loading AI models...',
		'Processing voice recordings...',
		'Analyzing captured images...',
		'Evaluating vital signs...',
		'Assessing symptom patterns...',
		'Generating diagnostic insights...',
		'Calculating risk assessment...',
		'Preparing recommendations...'
	];

	onMount(async () => {
		aiEngine = new EdgeAIDiagnostics();
		
		// Monitor model loading
		const checkModels = setInterval(() => {
			if (aiEngine) {
				modelStatus = aiEngine.getModelStatus();
				if (modelStatus.modelsLoaded) {
					clearInterval(checkModels);
				}
			}
		}, 500);
	});

	async function runAnalysis() {
		if (!aiEngine || !caseId) return;

		isAnalyzing = true;
		analysisProgress = 0;
		currentStep = analysisSteps[0];

		try {
			// Get case data from localStorage
			const storedCases = JSON.parse(localStorage.getItem('aarogya_cases') || '[]');
			const caseData = storedCases.find((c: any) => c.id === caseId);

			if (!caseData) {
				throw new Error('Case data not found');
			}

			// Simulate progress through analysis steps
			for (let i = 0; i < analysisSteps.length; i++) {
				currentStep = analysisSteps[i];
				analysisProgress = ((i + 1) / analysisSteps.length) * 100;
				
				// Add realistic delays for each step
				await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
			}

			// Run the actual AI analysis
			analysisResult = await aiEngine.analyzeCase(caseData);

			// Store the analysis back to localStorage
			caseData.aiAnalysis = analysisResult;
			caseData.analysisTimestamp = new Date().toISOString();
			
			const updatedCases = storedCases.map((c: any) => c.id === caseId ? caseData : c);
			localStorage.setItem('aarogya_cases', JSON.stringify(updatedCases));

			// Notify parent component
			if (onAnalysisComplete) {
				onAnalysisComplete(analysisResult);
			}

		} catch (error: unknown) {
			console.error('Analysis failed:', error);
			analysisResult = {
				error: true,
				message: error instanceof Error ? error.message : 'Unknown error'
			};
		} finally {
			isAnalyzing = false;
			analysisProgress = 100;
			currentStep = 'Analysis complete';
		}
	}

	function getRiskColor(riskLevel: string): string {
		const colors: Record<string, string> = {
			low: 'text-green-600 bg-green-50 border-green-200',
			medium: 'text-yellow-600 bg-yellow-50 border-yellow-200',
			high: 'text-orange-600 bg-orange-50 border-orange-200',
			critical: 'text-red-600 bg-red-50 border-red-200'
		};
		return colors[riskLevel] || 'text-gray-600 bg-gray-50 border-gray-200';
	}

	function getRiskIcon(riskLevel: string): string {
		const icons: Record<string, string> = {
			low: '✅',
			medium: '⚠️',
			high: '🔶',
			critical: '🚨'
		};
		return icons[riskLevel] || '❓';
	}

	function getUrgencyColor(urgency: string): string {
		const colors: Record<string, string> = {
			routine: 'text-blue-600 bg-blue-50',
			urgent: 'text-orange-600 bg-orange-50',
			emergency: 'text-red-600 bg-red-50'
		};
		return colors[urgency] || 'text-gray-600 bg-gray-50';
	}
</script>

<div class="ai-diagnostics-panel bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
	<!-- Header -->
	<div class="bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-3">
		<div class="flex items-center justify-between">
			<div class="flex items-center space-x-2">
				<div class="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
					🧠
				</div>
				<div>
					<h3 class="text-white font-medium">AI Diagnostics</h3>
					<p class="text-purple-100 text-sm">Edge AI Analysis Engine</p>
				</div>
			</div>
			
			<div class="flex items-center space-x-2">
				{#if modelStatus.modelsLoaded}
					<div class="w-2 h-2 bg-green-400 rounded-full"></div>
					<span class="text-white text-xs">Ready</span>
				{:else}
					<div class="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
					<span class="text-white text-xs">Loading</span>
				{/if}
			</div>
		</div>
	</div>

	<div class="p-4 space-y-4">
		<!-- Model Status -->
		{#if !modelStatus.modelsLoaded}
			<div class="flex items-center justify-center py-8">
				<div class="text-center">
					<div class="animate-spin w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full mx-auto mb-3"></div>
					<p class="text-gray-600 text-sm">Loading AI models...</p>
					<p class="text-gray-400 text-xs">Privacy-first edge inference</p>
				</div>
			</div>
		{:else}
			<!-- Analysis Controls -->
			<div class="flex justify-between items-center">
				<div>
					<h4 class="font-medium text-gray-900">Run AI Analysis</h4>
					<p class="text-sm text-gray-600">Process case data with on-device AI</p>
				</div>
				
				{#if !isAnalyzing && !analysisResult}
					<button
						onclick={runAnalysis}
						disabled={!caseId}
						class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
					>
						Analyze Case
					</button>
				{:else if isAnalyzing}
					<button disabled class="px-4 py-2 bg-gray-400 text-white rounded-lg cursor-not-allowed">
						Analyzing...
					</button>
				{:else if analysisResult && !analysisResult.error}
					<button
						onclick={() => { analysisResult = null; }}
						class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
					>
						Run Again
					</button>
				{/if}
			</div>

			<!-- Analysis Progress -->
			{#if isAnalyzing}
				<div class="bg-gray-50 rounded-lg p-4">
					<div class="flex items-center justify-between mb-2">
						<span class="text-sm font-medium text-gray-700">{currentStep}</span>
						<span class="text-sm text-gray-500">{Math.round(analysisProgress)}%</span>
					</div>
					<div class="w-full bg-gray-200 rounded-full h-2">
						<div 
							class="bg-purple-600 h-2 rounded-full transition-all duration-300"
							style="width: {analysisProgress}%"
						></div>
					</div>
				</div>
			{/if}

			<!-- Analysis Results -->
			{#if analysisResult}
				{#if analysisResult.error}
					<div class="bg-red-50 border border-red-200 rounded-lg p-4">
						<div class="flex items-center space-x-2">
							<span class="text-red-500">❌</span>
							<span class="font-medium text-red-800">Analysis Failed</span>
						</div>
						<p class="text-red-700 text-sm mt-1">{analysisResult.message}</p>
					</div>
				{:else}
					<div class="space-y-4">
						<!-- Risk Assessment -->
						<div class="border rounded-lg overflow-hidden">
							<div class="bg-gray-50 px-4 py-2 border-b">
								<h4 class="font-medium text-gray-900">Risk Assessment</h4>
							</div>
							<div class="p-4">
								<div class="flex items-center justify-between mb-3">
									<div class="flex items-center space-x-3">
										<span class="text-2xl">{getRiskIcon(analysisResult.riskLevel)}</span>
										<div>
											<div class={`inline-block px-3 py-1 rounded-full text-sm font-medium border ${getRiskColor(analysisResult.riskLevel)}`}>
												{analysisResult.riskLevel.toUpperCase()}
											</div>
											<p class="text-sm text-gray-600 mt-1">Risk Score: {analysisResult.riskScore}/100</p>
										</div>
									</div>
									<div class="text-right">
										<div class="text-sm text-gray-600">AI Confidence</div>
										<div class="text-lg font-bold text-gray-900">{Math.round(analysisResult.confidence * 100)}%</div>
									</div>
								</div>

								{#if analysisResult.primaryConcerns && analysisResult.primaryConcerns.length > 0}
									<div class="mt-3">
										<p class="text-sm font-medium text-gray-700 mb-2">Primary Concerns:</p>
										<div class="flex flex-wrap gap-2">
											{#each analysisResult.primaryConcerns as concern}
												<span class="px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs">
													{concern.replace(/_/g, ' ')}
												</span>
											{/each}
										</div>
									</div>
								{/if}
							</div>
						</div>

						<!-- Recommendations -->
						<div class="border rounded-lg overflow-hidden">
							<div class="bg-gray-50 px-4 py-2 border-b">
								<h4 class="font-medium text-gray-900">AI Recommendations</h4>
							</div>
							<div class="p-4 space-y-3">
								<div class="flex items-center justify-between">
									<span class="text-sm font-medium text-gray-700">Urgency Level:</span>
									<span class={`px-2 py-1 rounded-full text-xs font-medium ${getUrgencyColor(analysisResult.recommendations.urgency)}`}>
										{analysisResult.recommendations.urgency.toUpperCase()}
									</span>
								</div>

								{#if analysisResult.recommendations.referralNeeded}
									<div class="flex items-center space-x-2 text-red-700 bg-red-50 p-3 rounded-lg">
										<span>🏥</span>
										<span class="font-medium">Medical referral required</span>
									</div>
								{/if}

								{#if analysisResult.recommendations.immediateActions.length > 0}
									<div>
										<p class="text-sm font-medium text-gray-700 mb-2">Immediate Actions:</p>
										<ul class="space-y-1">
											{#each analysisResult.recommendations.immediateActions as action}
												<li class="flex items-start space-x-2 text-sm">
													<span class="text-blue-500 mt-0.5">•</span>
													<span>{action}</span>
												</li>
											{/each}
										</ul>
									</div>
								{/if}

								{#if analysisResult.recommendations.followUpActions.length > 0}
									<div>
										<p class="text-sm font-medium text-gray-700 mb-2">Follow-up Actions:</p>
										<ul class="space-y-1">
											{#each analysisResult.recommendations.followUpActions as action}
												<li class="flex items-start space-x-2 text-sm">
													<span class="text-green-500 mt-0.5">•</span>
													<span>{action}</span>
												</li>
											{/each}
										</ul>
									</div>
								{/if}
							</div>
						</div>

						<!-- AI Explanation -->
						<div class="border rounded-lg overflow-hidden">
							<div class="bg-gray-50 px-4 py-2 border-b">
								<h4 class="font-medium text-gray-900">AI Explanation</h4>
							</div>
							<div class="p-4">
								<p class="text-sm text-gray-700 leading-relaxed">
									{analysisResult.aiExplanation.english}
								</p>
							</div>
						</div>

						<!-- Review Flags -->
						{#if analysisResult.flagsForReview && analysisResult.flagsForReview.length > 0}
							<div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
								<div class="flex items-center space-x-2 mb-2">
									<span class="text-yellow-500">⚠️</span>
									<span class="font-medium text-yellow-800">Review Required</span>
								</div>
								<ul class="space-y-1">
									{#each analysisResult.flagsForReview as flag}
										<li class="text-yellow-700 text-sm">• {flag}</li>
									{/each}
								</ul>
							</div>
						{/if}
					</div>
				{/if}
			{/if}
		{/if}
	</div>
</div>

<style>
	.ai-diagnostics-panel {
		max-height: 70vh;
		overflow-y: auto;
	}
</style>