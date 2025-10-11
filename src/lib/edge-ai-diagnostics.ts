/**
 * Edge AI Diagnostics Engine
 * Privacy-first, on-device medical analysis system
 * Supports voice, image, and text analysis with multilingual capabilities
 */

interface CaseData {
	id: string;
	patientName: string;
	age: string;
	gender: string;
	symptoms: string[];
	voiceNotes: Array<{
		id: number;
		url: string;
		duration: number;
		timestamp: string;
		transcription?: string;
		sentiment?: string;
		language?: string;
	}>;
	photos: Array<{
		id: number;
		url: string;
		timestamp: string;
		analysis?: ImageAnalysis;
	}>;
	vitals: {
		bloodPressure: string;
		heartRate: string;
		temperature: string;
		oxygenSaturation: string;
	};
	location?: {
		latitude: number;
		longitude: number;
		address: string;
	};
	timestamp: string;
	syncStatus: string;
}

interface ImageAnalysis {
	skinConditions?: {
		rash: number;
		lesions: number;
		discoloration: number;
		confidence: number;
	};
	eyeAnalysis?: {
		jaundice: number;
		redness: number;
		clarity: number;
		confidence: number;
	};
	generalFindings: string[];
	riskLevel: 'low' | 'medium' | 'high';
	recommendedActions: string[];
}

interface VoiceAnalysis {
	transcription: string;
	language: string;
	sentimentScore: number; // -1 to 1
	speechPatterns: {
		breathingDifficulty: number;
		fatigue: number;
		confusion: number;
		pain: number;
	};
	keySymptoms: string[];
	confidence: number;
}

interface DiagnosticResult {
	riskScore: number; // 0-100
	riskLevel: 'low' | 'medium' | 'high' | 'critical';
	primaryConcerns: string[];
	recommendations: {
		immediateActions: string[];
		followUpActions: string[];
		referralNeeded: boolean;
		urgency: 'routine' | 'urgent' | 'emergency';
	};
	confidence: number;
	aiExplanation: {
		english: string;
		hindi: string;
		marathi: string;
		bengali: string;
	};
	flagsForReview: string[];
}

class EdgeAIDiagnostics {
	private models: {
		voiceAnalyzer?: any;
		imageAnalyzer?: any;
		textClassifier?: any;
		symptomPredictor?: any;
	} = {};

	private riskFactors = {
		age: {
			low: { min: 18, max: 35, multiplier: 1.0 },
			medium: { min: 36, max: 60, multiplier: 1.2 },
			high: { min: 61, max: 100, multiplier: 1.5 }
		},
		vitals: {
			heartRate: {
				normal: { min: 60, max: 100 },
				concerning: { min: 45, max: 120 },
				critical: { min: 0, max: 45, max2: 120 }
			},
			bloodPressure: {
				systolic: { normal: 140, high: 160, critical: 180 },
				diastolic: { normal: 90, high: 100, critical: 120 }
			},
			temperature: {
				normal: { min: 97.0, max: 99.5 },
				fever: { min: 100.4, max: 104.0 },
				critical: 104.0
			},
			oxygenSaturation: {
				normal: 95,
				concerning: 90,
				critical: 85
			}
		}
	};

	private symptomRiskMapping: Record<string, { base: number; multipliers: Record<string, number> }> = {
		fever: { base: 20, multipliers: { high_fever: 1.5, persistent: 1.3 } },
		cough: { base: 15, multipliers: { dry: 1.1, bloody: 2.0, persistent: 1.4 } },
		breathing: { base: 40, multipliers: { severe: 1.8, wheezing: 1.3 } },
		chest_pain: { base: 35, multipliers: { crushing: 2.0, radiating: 1.6 } },
		headache: { base: 10, multipliers: { severe: 1.5, sudden: 1.8 } },
		nausea: { base: 8, multipliers: { vomiting: 1.4, persistent: 1.2 } }
	};

	constructor() {
		this.initializeModels();
	}

	private async initializeModels() {
		// In a real implementation, these would load actual ML models
		// For demo purposes, we'll simulate the model loading
		console.log('Loading AI models for edge inference...');
		
		// Simulate model loading delay
		await new Promise(resolve => setTimeout(resolve, 1000));
		
		this.models = {
			voiceAnalyzer: { loaded: true, version: '1.2.0' },
			imageAnalyzer: { loaded: true, version: '1.1.0' },
			textClassifier: { loaded: true, version: '1.0.5' },
			symptomPredictor: { loaded: true, version: '2.0.1' }
		};
		
		console.log('AI models loaded successfully');
	}

	async analyzeCase(caseData: CaseData): Promise<DiagnosticResult> {
		console.log(`Starting AI analysis for case ${caseData.id}`);
		
		// Analyze different data types in parallel
		const [voiceAnalysis, imageAnalysis, vitalAnalysis, symptomAnalysis] = await Promise.all([
			this.analyzeVoiceNotes(caseData.voiceNotes),
			this.analyzeImages(caseData.photos),
			this.analyzeVitals(caseData.vitals, parseInt(caseData.age)),
			this.analyzeSymptoms(caseData.symptoms, caseData.age, caseData.gender)
		]);

		// Combine all analyses for final diagnostic result
		const result = this.synthesizeDiagnosis({
			caseData,
			voiceAnalysis,
			imageAnalysis,
			vitalAnalysis,
			symptomAnalysis
		});

		console.log(`AI analysis completed for case ${caseData.id} - Risk Level: ${result.riskLevel}`);
		return result;
	}

	private async analyzeVoiceNotes(voiceNotes: CaseData['voiceNotes']): Promise<VoiceAnalysis[]> {
		if (!voiceNotes || voiceNotes.length === 0) return [];

		const analyses: VoiceAnalysis[] = [];

		for (const note of voiceNotes) {
			// Simulate voice analysis
			const transcription = this.simulateTranscription(note.duration);
			const analysis: VoiceAnalysis = {
				transcription,
				language: this.detectLanguage(transcription),
				sentimentScore: this.analyzeSentiment(transcription),
				speechPatterns: this.analyzeSpeechPatterns(note.duration),
				keySymptoms: this.extractSymptomsFromText(transcription),
				confidence: 0.85 + Math.random() * 0.1
			};

			analyses.push(analysis);
		}

		return analyses;
	}

	private simulateTranscription(duration: number): string {
		const samples = [
			"Patient complains of fever and body ache for 3 days. Difficulty sleeping due to cough.",
			"मुझे सिरदर्द और बुखार है। तीन दिन से खांसी भी आ रही है।",
			"छातीत दुखत आहे आणि श्वास घेण्यात त्रास होत आहे।",
			"Patient reports chest pain and breathing difficulty. Started yesterday evening.",
			"Nausea and vomiting since morning. Patient looks weak and dehydrated."
		];
		
		// Longer recordings tend to have more detailed descriptions
		const complexity = Math.min(duration / 30, 1);
		return samples[Math.floor(Math.random() * samples.length)];
	}

	private detectLanguage(text: string): string {
		// Simple language detection based on character patterns
		if (/[\u0900-\u097F]/.test(text)) return 'hindi';
		if (/[\u0980-\u09FF]/.test(text)) return 'bengali';
		return 'english'; // Default
	}

	private analyzeSentiment(text: string): number {
		// Simulate sentiment analysis (-1 = very negative, 1 = very positive)
		const negativeWords = ['pain', 'hurt', 'sick', 'bad', 'terrible', 'awful'];
		const positiveWords = ['better', 'good', 'fine', 'okay', 'improving'];
		
		let score = 0;
		const words = text.toLowerCase().split(' ');
		
		words.forEach(word => {
			if (negativeWords.includes(word)) score -= 0.2;
			if (positiveWords.includes(word)) score += 0.2;
		});
		
		return Math.max(-1, Math.min(1, score));
	}

	private analyzeSpeechPatterns(duration: number): VoiceAnalysis['speechPatterns'] {
		// Simulate analysis of speech patterns that might indicate health issues
		return {
			breathingDifficulty: Math.random() * 0.8,
			fatigue: Math.random() * 0.6,
			confusion: Math.random() * 0.3,
			pain: Math.random() * 0.7
		};
	}

	private extractSymptomsFromText(text: string): string[] {
		const symptomKeywords = {
			fever: ['fever', 'बुखार', 'ताप', 'জ্বর'],
			cough: ['cough', 'खांसी', 'खोकला'],
			pain: ['pain', 'दर्द', 'दुखणे'],
			breathing: ['breathing', 'breath', 'सांस', 'श्वास'],
			headache: ['headache', 'सिरदर्द', 'डोकेदुखी'],
			nausea: ['nausea', 'vomiting', 'मतली', 'उल्टी']
		};

		const found: string[] = [];
		const lowerText = text.toLowerCase();

		Object.entries(symptomKeywords).forEach(([symptom, keywords]) => {
			if (keywords.some(keyword => lowerText.includes(keyword.toLowerCase()))) {
				found.push(symptom);
			}
		});

		return found;
	}

	private async analyzeImages(photos: CaseData['photos']): Promise<ImageAnalysis[]> {
		if (!photos || photos.length === 0) return [];

		const analyses: ImageAnalysis[] = [];

		for (const photo of photos) {
			// Simulate image analysis
			const analysis: ImageAnalysis = {
				skinConditions: {
					rash: Math.random() * 0.7,
					lesions: Math.random() * 0.4,
					discoloration: Math.random() * 0.5,
					confidence: 0.75 + Math.random() * 0.2
				},
				eyeAnalysis: {
					jaundice: Math.random() * 0.3,
					redness: Math.random() * 0.6,
					clarity: 0.7 + Math.random() * 0.3,
					confidence: 0.70 + Math.random() * 0.25
				},
				generalFindings: this.generateImageFindings(),
				riskLevel: Math.random() > 0.7 ? 'high' : Math.random() > 0.4 ? 'medium' : 'low',
				recommendedActions: this.generateImageRecommendations()
			};

			analyses.push(analysis);
		}

		return analyses;
	}

	private generateImageFindings(): string[] {
		const findings = [
			'Normal skin tone and texture',
			'No visible rashes or lesions',
			'Eyes appear clear',
			'Slight pallor noted',
			'Possible dehydration signs',
			'Normal facial symmetry'
		];
		
		return findings.slice(0, 2 + Math.floor(Math.random() * 3));
	}

	private generateImageRecommendations(): string[] {
		const recommendations = [
			'Monitor skin condition',
			'Check hydration status',
			'Follow up on eye symptoms',
			'Document changes over time',
			'Consider dermatology consultation'
		];
		
		return recommendations.slice(0, 1 + Math.floor(Math.random() * 2));
	}

	private analyzeVitals(vitals: CaseData['vitals'], age: number): any {
		const analysis: {
			riskScore: number;
			concerningVitals: string[];
			recommendations: string[];
		} = {
			riskScore: 0,
			concerningVitals: [],
			recommendations: []
		};

		// Analyze heart rate
		const hr = parseInt(vitals.heartRate) || 0;
		if (hr > 0) {
			if (hr < 50 || hr > 120) {
				analysis.riskScore += 25;
				analysis.concerningVitals.push('heart_rate');
				analysis.recommendations.push('Monitor cardiac status');
			} else if (hr < 60 || hr > 100) {
				analysis.riskScore += 10;
			}
		}

		// Analyze temperature
		const temp = parseFloat(vitals.temperature) || 0;
		if (temp > 0) {
			if (temp >= 104) {
				analysis.riskScore += 40;
				analysis.concerningVitals.push('high_fever');
				analysis.recommendations.push('Emergency fever management');
			} else if (temp >= 100.4) {
				analysis.riskScore += 20;
				analysis.concerningVitals.push('fever');
			}
		}

		// Analyze blood pressure
		if (vitals.bloodPressure && vitals.bloodPressure.includes('/')) {
			const [systolic, diastolic] = vitals.bloodPressure.split('/').map(v => parseInt(v));
			if (systolic >= 180 || diastolic >= 120) {
				analysis.riskScore += 35;
				analysis.concerningVitals.push('hypertension_crisis');
			} else if (systolic >= 160 || diastolic >= 100) {
				analysis.riskScore += 20;
				analysis.concerningVitals.push('hypertension');
			}
		}

		// Analyze oxygen saturation
		const o2sat = parseInt(vitals.oxygenSaturation) || 0;
		if (o2sat > 0) {
			if (o2sat < 85) {
				analysis.riskScore += 45;
				analysis.concerningVitals.push('critical_hypoxia');
				analysis.recommendations.push('Immediate oxygen support needed');
			} else if (o2sat < 90) {
				analysis.riskScore += 30;
				analysis.concerningVitals.push('hypoxia');
			} else if (o2sat < 95) {
				analysis.riskScore += 15;
			}
		}

		return analysis;
	}

	private analyzeSymptoms(symptoms: string[], age: string, gender: string): any {
		let riskScore = 0;
		const highRiskCombinations = [];

		symptoms.forEach(symptom => {
			const riskData = this.symptomRiskMapping[symptom];
			if (riskData) {
				riskScore += riskData.base;
			}
		});

		// Check for high-risk combinations
		if (symptoms.includes('chest_pain') && symptoms.includes('breathing')) {
			riskScore *= 1.4;
			highRiskCombinations.push('cardiac_respiratory');
		}

		if (symptoms.includes('fever') && symptoms.includes('breathing') && symptoms.includes('cough')) {
			riskScore *= 1.3;
			highRiskCombinations.push('respiratory_infection');
		}

		// Age-based adjustments
		const ageNum = parseInt(age);
		if (ageNum > 65) riskScore *= 1.2;
		if (ageNum < 5) riskScore *= 1.3;

		return {
			riskScore,
			highRiskCombinations,
			totalSymptoms: symptoms.length
		};
	}

	private synthesizeDiagnosis(data: any): DiagnosticResult {
		const { caseData, voiceAnalysis, imageAnalysis, vitalAnalysis, symptomAnalysis } = data;
		
		// Calculate composite risk score
		let totalRiskScore = 0;
		let confidenceFactors = [];

		// Vital signs contribution (40% weight)
		totalRiskScore += (vitalAnalysis?.riskScore || 0) * 0.4;
		if (vitalAnalysis?.riskScore > 0) confidenceFactors.push(0.9);

		// Symptoms contribution (35% weight)  
		totalRiskScore += (symptomAnalysis?.riskScore || 0) * 0.35;
		if (symptomAnalysis?.totalSymptoms > 0) confidenceFactors.push(0.8);

		// Voice analysis contribution (15% weight)
		if (voiceAnalysis && voiceAnalysis.length > 0) {
			const avgVoiceRisk = voiceAnalysis.reduce((sum: number, analysis: any) => {
				const patternSum = (Object.values(analysis.speechPatterns) as number[]).reduce((a: number, b: number) => a + b, 0);
				return sum + (analysis.sentimentScore < -0.3 ? 20 : 0) + (patternSum * 10);
			}, 0) / voiceAnalysis.length;
			totalRiskScore += avgVoiceRisk * 0.15;
			confidenceFactors.push(0.75);
		}

		// Image analysis contribution (10% weight)
		if (imageAnalysis && imageAnalysis.length > 0) {
			const avgImageRisk = imageAnalysis.reduce((sum: number, analysis: any) => {
				return sum + (analysis.riskLevel === 'high' ? 30 : analysis.riskLevel === 'medium' ? 15 : 5);
			}, 0) / imageAnalysis.length;
			totalRiskScore += avgImageRisk * 0.1;
			confidenceFactors.push(0.7);
		}

		// Determine risk level
		let riskLevel: DiagnosticResult['riskLevel'];
		if (totalRiskScore >= 70) riskLevel = 'critical';
		else if (totalRiskScore >= 45) riskLevel = 'high';
		else if (totalRiskScore >= 20) riskLevel = 'medium';
		else riskLevel = 'low';

		// Calculate overall confidence
		const confidence = confidenceFactors.length > 0 ? 
			confidenceFactors.reduce((a, b) => a + b, 0) / confidenceFactors.length : 0.5;

		// Generate recommendations
		const recommendations = this.generateRecommendations(riskLevel, vitalAnalysis, symptomAnalysis);

		// Generate multilingual explanations
		const explanations = this.generateExplanations(riskLevel, totalRiskScore, caseData);

		return {
			riskScore: Math.round(totalRiskScore),
			riskLevel,
			primaryConcerns: this.identifyPrimaryConcerns(vitalAnalysis, symptomAnalysis),
			recommendations,
			confidence: Math.round(confidence * 100) / 100,
			aiExplanation: explanations,
			flagsForReview: this.generateReviewFlags(riskLevel, confidence, vitalAnalysis)
		};
	}

	private generateRecommendations(riskLevel: string, vitalAnalysis: any, symptomAnalysis: any) {
		const recommendations: {
			immediateActions: string[];
			followUpActions: string[];
			referralNeeded: boolean;
			urgency: 'routine' | 'urgent' | 'emergency';
		} = {
			immediateActions: [],
			followUpActions: [],
			referralNeeded: false,
			urgency: 'routine' as 'routine' | 'urgent' | 'emergency'
		};

		switch (riskLevel) {
			case 'critical':
				recommendations.immediateActions.push(
					'Arrange immediate medical evacuation',
					'Monitor vital signs continuously',
					'Prepare for emergency intervention'
				);
				recommendations.referralNeeded = true;
				recommendations.urgency = 'emergency';
				break;

			case 'high':
				recommendations.immediateActions.push(
					'Contact supervising clinician',
					'Monitor patient closely',
					'Document all changes'
				);
				recommendations.followUpActions.push(
					'Schedule follow-up within 24 hours',
					'Arrange transportation to health facility'
				);
				recommendations.referralNeeded = true;
				recommendations.urgency = 'urgent';
				break;

			case 'medium':
				recommendations.immediateActions.push(
					'Provide basic symptomatic care',
					'Monitor for deterioration'
				);
				recommendations.followUpActions.push(
					'Schedule follow-up within 48-72 hours',
					'Patient education on warning signs'
				);
				recommendations.urgency = 'urgent';
				break;

			default:
				recommendations.immediateActions.push(
					'Provide supportive care',
					'Patient reassurance and education'
				);
				recommendations.followUpActions.push(
					'Routine follow-up as needed',
					'Continue monitoring symptoms'
				);
		}

		return recommendations;
	}

	private identifyPrimaryConcerns(vitalAnalysis: any, symptomAnalysis: any): string[] {
		const concerns = [];

		if (vitalAnalysis?.concerningVitals) {
			concerns.push(...vitalAnalysis.concerningVitals);
		}

		if (symptomAnalysis?.highRiskCombinations) {
			concerns.push(...symptomAnalysis.highRiskCombinations);
		}

		return concerns.slice(0, 3); // Top 3 concerns
	}

	private generateExplanations(riskLevel: string, riskScore: number, caseData: any) {
		const baseExplanation = {
			risk: riskLevel,
			score: riskScore,
			patient: caseData.patientName,
			symptoms: caseData.symptoms.length
		};

		return {
			english: `Based on AI analysis of ${baseExplanation.symptoms} symptoms and vital signs, patient ${baseExplanation.patient} shows ${baseExplanation.risk} risk (score: ${baseExplanation.score}/100). Key factors include symptom combination and vital sign patterns.`,
			
			hindi: `एआई विश्लेषण के आधार पर ${baseExplanation.symptoms} लक्षणों और महत्वपूर्ण संकेतों के साथ, रोगी ${baseExplanation.patient} में ${baseExplanation.risk} जोखिम दिखाई देता है (स्कोर: ${baseExplanation.score}/100)।`,
			
			marathi: `${baseExplanation.symptoms} लक्षणे आणि महत्वाच्या चिन्हांच्या एआय विश्लेषणाच्या आधारे, रुग्ण ${baseExplanation.patient} मध्ये ${baseExplanation.risk} धोका दिसून येतो (गुण: ${baseExplanation.score}/100)।`,
			
			bengali: `${baseExplanation.symptoms}টি উপসর্গ এবং গুরুত্বপূর্ণ চিহ্নের AI বিশ্লেষণের ভিত্তিতে, রোগী ${baseExplanation.patient} এর মধ্যে ${baseExplanation.risk} ঝুঁকি দেখা যাচ্ছে (স্কোর: ${baseExplanation.score}/100)।`
		};
	}

	private generateReviewFlags(riskLevel: string, confidence: number, vitalAnalysis: any): string[] {
		const flags = [];

		if (confidence < 0.7) {
			flags.push('Low AI confidence - requires human review');
		}

		if (riskLevel === 'critical') {
			flags.push('Critical case - immediate clinician review required');
		}

		if (vitalAnalysis?.concerningVitals?.includes('critical_hypoxia')) {
			flags.push('Critical oxygen levels detected');
		}

		if (vitalAnalysis?.concerningVitals?.includes('hypertension_crisis')) {
			flags.push('Hypertensive crisis suspected');
		}

		return flags;
	}

	// Public method to get model status
	getModelStatus() {
		return {
			modelsLoaded: Object.keys(this.models).length > 0,
			models: this.models,
			capabilities: {
				voiceAnalysis: !!this.models.voiceAnalyzer,
				imageAnalysis: !!this.models.imageAnalyzer,
				textAnalysis: !!this.models.textClassifier,
				diagnosticPrediction: !!this.models.symptomPredictor
			}
		};
	}

	// Method to run diagnostics on stored cases
	async processPendingCases() {
		const storedCases = JSON.parse(localStorage.getItem('aarogya_cases') || '[]');
		const pendingCases = storedCases.filter((case_item: any) => !case_item.aiAnalysis);

		for (const caseData of pendingCases) {
			try {
				const analysis = await this.analyzeCase(caseData);
				caseData.aiAnalysis = analysis;
				caseData.analysisTimestamp = new Date().toISOString();
			} catch (error: unknown) {
				console.error(`Failed to analyze case ${caseData.id}:`, error);
				caseData.aiAnalysisError = error instanceof Error ? error.message : 'Unknown error';
			}
		}

		localStorage.setItem('aarogya_cases', JSON.stringify(storedCases));
		return pendingCases.length;
	}
}

export default EdgeAIDiagnostics;