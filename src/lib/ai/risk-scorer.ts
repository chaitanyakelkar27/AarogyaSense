/**
 * Risk Scoring System for Healthcare Cases
 * Combines multiple factors to assess patient risk level
 */

export interface RiskFactors {
	symptoms: string[];
	vitalSigns?: {
		temperature?: number;
		bloodPressure?: string;
		heartRate?: number;
		oxygenSaturation?: number;
		respiratoryRate?: number;
	};
	age?: number;
	existingConditions?: string[];
	aiConfidence?: number;
	aiPrediction?: string;
}

export interface RiskAssessment {
	score: number; // 0-100
	level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
	urgency: number; // 1-10
	priority: number; // 1-5 (1=LOW, 2=MEDIUM, 3-4=HIGH, 5=CRITICAL)
	factors: string[];
	recommendations: string[];
}

// Symptom severity mapping
const symptomSeverity: Record<string, number> = {
	// Critical symptoms (80-100)
	'chest pain': 90,
	'severe bleeding': 95,
	'unconscious': 100,
	'difficulty breathing': 85,
	'seizure': 90,
	'severe headache': 75,
	'stroke symptoms': 95,

	// High severity (60-79)
	'high fever': 70,
	'persistent vomiting': 65,
	'severe abdominal pain': 70,
	'confusion': 75,
	'severe weakness': 65,
	'blood in stool': 70,
	'blood in urine': 70,

	// Medium severity (40-59)
	'fever': 50,
	'cough': 40,
	'headache': 45,
	'nausea': 45,
	'diarrhea': 50,
	'rash': 40,
	'joint pain': 45,
	'fatigue': 40,

	// Low severity (20-39)
	'mild fever': 30,
	'sore throat': 35,
	'runny nose': 25,
	'mild cough': 30,
	'body ache': 35
};

// Vital signs risk assessment
const vitalSignsRisk = {
	temperature: {
		critical: (temp: number) => temp >= 40 || temp <= 35,
		high: (temp: number) => temp >= 39 || temp <= 36,
		medium: (temp: number) => temp >= 38.5 || temp <= 36.5,
		normal: (temp: number) => temp >= 36.5 && temp <= 37.5
	},
	heartRate: {
		critical: (hr: number) => hr >= 130 || hr <= 40,
		high: (hr: number) => hr >= 110 || hr <= 50,
		medium: (hr: number) => hr >= 100 || hr <= 60,
		normal: (hr: number) => hr >= 60 && hr <= 100
	},
	oxygenSaturation: {
		critical: (spo2: number) => spo2 <= 90,
		high: (spo2: number) => spo2 <= 93,
		medium: (spo2: number) => spo2 <= 95,
		normal: (spo2: number) => spo2 >= 95
	},
	respiratoryRate: {
		critical: (rr: number) => rr >= 30 || rr <= 8,
		high: (rr: number) => rr >= 25 || rr <= 10,
		medium: (rr: number) => rr >= 22 || rr <= 12,
		normal: (rr: number) => rr >= 12 && rr <= 20
	}
};

/**
 * Calculate risk score from multiple factors
 */
export function calculateRiskScore(factors: RiskFactors): RiskAssessment {
	let score = 0;
	const riskFactors: string[] = [];
	const recommendations: string[] = [];

	// 1. Symptom-based risk (40% weight)
	let symptomScore = 0;
	factors.symptoms.forEach(symptom => {
		const severity = symptomSeverity[symptom.toLowerCase()] || 30;
		symptomScore = Math.max(symptomScore, severity);

		if (severity >= 70) {
			riskFactors.push(`Critical symptom: ${symptom}`);
		}
	});
	score += symptomScore * 0.4;

	// 2. Vital signs risk (30% weight)
	if (factors.vitalSigns) {
		let vitalScore = 0;

		if (factors.vitalSigns.temperature) {
			const temp = factors.vitalSigns.temperature;
			if (vitalSignsRisk.temperature.critical(temp)) {
				vitalScore = Math.max(vitalScore, 90);
				riskFactors.push('Critical temperature');
				recommendations.push('Immediate medical attention required');
			} else if (vitalSignsRisk.temperature.high(temp)) {
				vitalScore = Math.max(vitalScore, 70);
				riskFactors.push('Abnormal temperature');
			}
		}

		if (factors.vitalSigns.heartRate) {
			const hr = factors.vitalSigns.heartRate;
			if (vitalSignsRisk.heartRate.critical(hr)) {
				vitalScore = Math.max(vitalScore, 90);
				riskFactors.push('Critical heart rate');
				recommendations.push('Emergency cardiac evaluation');
			} else if (vitalSignsRisk.heartRate.high(hr)) {
				vitalScore = Math.max(vitalScore, 70);
				riskFactors.push('Abnormal heart rate');
			}
		}

		if (factors.vitalSigns.oxygenSaturation) {
			const spo2 = factors.vitalSigns.oxygenSaturation;
			if (vitalSignsRisk.oxygenSaturation.critical(spo2)) {
				vitalScore = Math.max(vitalScore, 95);
				riskFactors.push('Critical oxygen saturation');
				recommendations.push('Oxygen support needed immediately');
			} else if (vitalSignsRisk.oxygenSaturation.high(spo2)) {
				vitalScore = Math.max(vitalScore, 75);
				riskFactors.push('Low oxygen saturation');
			}
		}

		if (factors.vitalSigns.respiratoryRate) {
			const rr = factors.vitalSigns.respiratoryRate;
			if (vitalSignsRisk.respiratoryRate.critical(rr)) {
				vitalScore = Math.max(vitalScore, 90);
				riskFactors.push('Critical respiratory rate');
				recommendations.push('Respiratory support may be needed');
			} else if (vitalSignsRisk.respiratoryRate.high(rr)) {
				vitalScore = Math.max(vitalScore, 70);
				riskFactors.push('Abnormal respiratory rate');
			}
		}

		score += vitalScore * 0.3;
	}

	// 3. Age factor (10% weight)
	if (factors.age) {
		if (factors.age < 5 || factors.age > 65) {
			score += 20;
			riskFactors.push('Vulnerable age group');
			recommendations.push('Extra monitoring recommended');
		} else if (factors.age < 1) {
			score += 30;
			riskFactors.push('Infant - high risk');
			recommendations.push('Pediatric specialist consultation');
		}
	}

	// 4. Existing conditions (10% weight)
	if (factors.existingConditions && factors.existingConditions.length > 0) {
		score += Math.min(factors.existingConditions.length * 5, 15);
		riskFactors.push('Pre-existing medical conditions');
		recommendations.push('Review medical history');
	}

	// 5. AI confidence (10% weight)
	if (factors.aiConfidence && factors.aiPrediction) {
		if (factors.aiConfidence > 0.8) {
			const aiRisk = factors.aiPrediction.toLowerCase().includes('critical') ? 30 :
				factors.aiPrediction.toLowerCase().includes('high') ? 20 : 10;
			score += aiRisk;
			riskFactors.push(`AI prediction: ${factors.aiPrediction} (${(factors.aiConfidence * 100).toFixed(1)}% confidence)`);
		}
	}

	// Cap score at 100
	score = Math.min(Math.round(score), 100);

	// Determine risk level
	let level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
	let urgency: number;
	let priority: number;

	if (score >= 80) {
		level = 'CRITICAL';
		urgency = 10;
		priority = 5;
		recommendations.unshift('URGENT: Immediate hospital transfer required');
	} else if (score >= 60) {
		level = 'HIGH';
		urgency = 7;
		priority = 4;
		recommendations.unshift('High priority: Medical consultation within 24 hours');
	} else if (score >= 40) {
		level = 'MEDIUM';
		urgency = 5;
		priority = 2;
		recommendations.unshift('Monitor closely and follow up in 2-3 days');
	} else {
		level = 'LOW';
		urgency = 3;
		priority = 1;
		recommendations.unshift('Standard care and follow-up as needed');
	}

	// Add general recommendations
	if (score >= 60) {
		recommendations.push('Document all symptoms and vital signs');
		recommendations.push('Prepare for possible hospitalization');
	}

	return {
		score,
		level,
		urgency,
		priority,
		factors: riskFactors,
		recommendations
	};
}

/**
 * Quick risk assessment from symptoms only
 */
export function quickRiskCheck(symptoms: string[]): { score: number; level: string } {
	const assessment = calculateRiskScore({ symptoms });
	return {
		score: assessment.score,
		level: assessment.level
	};
}
