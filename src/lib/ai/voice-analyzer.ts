/**
 * Voice and Audio Analysis for Respiratory Conditions
 * Analyzes breathing sounds, cough patterns, and voice characteristics
 */

export interface AudioAnalysisResult {
	condition: string;
	confidence: number;
	findings: string[];
	severity: 'normal' | 'mild' | 'moderate' | 'severe';
	audioFeatures: {
		breathingRate?: number;
		coughDetected?: boolean;
		wheezeDetected?: boolean;
		voiceStrain?: boolean;
	};
}

/**
 * Analyze audio recording for respiratory distress
 */
export async function analyzeAudio(audioBlob: Blob): Promise<AudioAnalysisResult> {
	try {
		// Decode audio data
		const audioBuffer = await decodeAudioData(audioBlob);
		
		// Extract features
		const features = extractAudioFeatures(audioBuffer);
		
		// Analyze for conditions
		const result = analyzeFeatures(features);
		
		return result;

	} catch (error) {
		console.error('Audio analysis error:', error);
		throw error;
	}
}

/**
 * Decode audio blob to AudioBuffer
 */
async function decodeAudioData(blob: Blob): Promise<AudioBuffer> {
	const arrayBuffer = await blob.arrayBuffer();
	const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
	return audioContext.decodeAudioData(arrayBuffer);
}

/**
 * Extract audio features for analysis
 */
function extractAudioFeatures(audioBuffer: AudioBuffer): AudioFeatures {
	const channelData = audioBuffer.getChannelData(0);
	const sampleRate = audioBuffer.sampleRate;
	
	// Calculate RMS (root mean square) energy
	let sumSquares = 0;
	for (let i = 0; i < channelData.length; i++) {
		sumSquares += channelData[i] * channelData[i];
	}
	const rms = Math.sqrt(sumSquares / channelData.length);
	
	// Detect peaks (for cough detection)
	const peaks = detectPeaks(channelData, sampleRate);
	
	// Calculate zero crossing rate (for wheeze detection)
	const zcr = calculateZeroCrossingRate(channelData);
	
	// Estimate breathing rate
	const breathingRate = estimateBreathingRate(channelData, sampleRate);
	
	return {
		rms,
		peaks,
		zcr,
		breathingRate,
		duration: audioBuffer.duration
	};
}

interface AudioFeatures {
	rms: number;
	peaks: number[];
	zcr: number;
	breathingRate: number;
	duration: number;
}

/**
 * Detect peaks in audio signal
 */
function detectPeaks(data: Float32Array, sampleRate: number): number[] {
	const peaks: number[] = [];
	const threshold = 0.3; // Amplitude threshold
	const minDistance = sampleRate * 0.3; // Minimum 300ms between peaks
	
	let lastPeakIndex = -minDistance;
	
	for (let i = 1; i < data.length - 1; i++) {
		if (
			data[i] > threshold &&
			data[i] > data[i - 1] &&
			data[i] > data[i + 1] &&
			i - lastPeakIndex > minDistance
		) {
			peaks.push(i / sampleRate);
			lastPeakIndex = i;
		}
	}
	
	return peaks;
}

/**
 * Calculate zero crossing rate (frequency indicator)
 */
function calculateZeroCrossingRate(data: Float32Array): number {
	let crossings = 0;
	
	for (let i = 1; i < data.length; i++) {
		if ((data[i] >= 0 && data[i - 1] < 0) || (data[i] < 0 && data[i - 1] >= 0)) {
			crossings++;
		}
	}
	
	return crossings / data.length;
}

/**
 * Estimate breathing rate from audio
 */
function estimateBreathingRate(data: Float32Array, sampleRate: number): number {
	// Use peak detection for breathing cycles
	const peaks = detectPeaks(data, sampleRate);
	
	if (peaks.length < 2) return 0;
	
	// Calculate average interval between peaks
	let totalInterval = 0;
	for (let i = 1; i < peaks.length; i++) {
		totalInterval += peaks[i] - peaks[i - 1];
	}
	const avgInterval = totalInterval / (peaks.length - 1);
	
	// Convert to breaths per minute
	return avgInterval > 0 ? 60 / avgInterval : 0;
}

/**
 * Analyze extracted features for medical conditions
 */
function analyzeFeatures(features: AudioFeatures): AudioAnalysisResult {
	const findings: string[] = [];
	let condition = 'Normal Breathing';
	let confidence = 0.65;
	let severity: 'normal' | 'mild' | 'moderate' | 'severe' = 'normal';
	
	const audioFeatures: AudioAnalysisResult['audioFeatures'] = {
		breathingRate: Math.round(features.breathingRate),
		coughDetected: false,
		wheezeDetected: false,
		voiceStrain: false
	};
	
	// Analyze breathing rate
	if (features.breathingRate > 25) {
		severity = 'moderate';
		confidence = 0.75;
		condition = 'Tachypnea (Rapid Breathing)';
		findings.push(`Elevated breathing rate: ${Math.round(features.breathingRate)} breaths/min`);
		findings.push('May indicate respiratory distress');
		audioFeatures.breathingRate = Math.round(features.breathingRate);
	} else if (features.breathingRate > 20) {
		severity = 'mild';
		confidence = 0.7;
		condition = 'Slightly Elevated Breathing';
		findings.push(`Breathing rate: ${Math.round(features.breathingRate)} breaths/min`);
		findings.push('Mild tachypnea detected');
		audioFeatures.breathingRate = Math.round(features.breathingRate);
	} else if (features.breathingRate < 10 && features.breathingRate > 0) {
		severity = 'moderate';
		confidence = 0.7;
		condition = 'Bradypnea (Slow Breathing)';
		findings.push(`Low breathing rate: ${Math.round(features.breathingRate)} breaths/min`);
		findings.push('May indicate respiratory depression');
		audioFeatures.breathingRate = Math.round(features.breathingRate);
	}
	
	// Detect cough (multiple sharp peaks)
	if (features.peaks.length > 3 && features.rms > 0.15) {
		audioFeatures.coughDetected = true;
		findings.push(`Cough detected (${features.peaks.length} episodes)`);
		if (features.peaks.length > 10) {
			severity = severity === 'normal' ? 'mild' : severity;
			findings.push('Frequent coughing observed');
		}
	}
	
	// Detect wheeze (high zero crossing rate)
	if (features.zcr > 0.3) {
		audioFeatures.wheezeDetected = true;
		findings.push('High-frequency sounds detected (possible wheeze)');
		severity = severity === 'normal' ? 'mild' : 'moderate';
		confidence = 0.7;
		if (condition === 'Normal Breathing') {
			condition = 'Possible Wheeze/Stridor';
		}
	}
	
	// Detect voice strain (high RMS with low peaks)
	if (features.rms > 0.2 && features.peaks.length < 3) {
		audioFeatures.voiceStrain = true;
		findings.push('Voice strain or hoarseness detected');
		findings.push('May indicate laryngeal inflammation');
	}
	
	// Assess severity based on multiple factors
	if (audioFeatures.breathingRate && audioFeatures.breathingRate > 30) {
		severity = 'severe';
		confidence = 0.8;
		condition = 'Severe Respiratory Distress';
		findings.push('URGENT: Severe tachypnea requires immediate evaluation');
	} else if (audioFeatures.wheezeDetected && audioFeatures.coughDetected && severity !== 'moderate') {
		severity = 'moderate';
		confidence = 0.75;
		condition = 'Respiratory Symptoms (Cough & Wheeze)';
	}
	
	// Add default finding if normal
	if (findings.length === 0) {
		findings.push('No significant respiratory abnormalities detected');
		findings.push('Breathing pattern appears normal');
	}
	
	return {
		condition,
		confidence,
		findings,
		severity,
		audioFeatures
	};
}

/**
 * Record audio from microphone
 */
export async function recordAudio(durationMs: number = 10000): Promise<Blob> {
	const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
	const mediaRecorder = new MediaRecorder(stream);
	const chunks: Blob[] = [];
	
	return new Promise((resolve, reject) => {
		mediaRecorder.ondataavailable = (e) => {
			chunks.push(e.data);
		};
		
		mediaRecorder.onstop = () => {
			const blob = new Blob(chunks, { type: 'audio/webm' });
			stream.getTracks().forEach(track => track.stop());
			resolve(blob);
		};
		
		mediaRecorder.onerror = (error) => {
			stream.getTracks().forEach(track => track.stop());
			reject(error);
		};
		
		mediaRecorder.start();
		setTimeout(() => mediaRecorder.stop(), durationMs);
	});
}
