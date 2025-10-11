/**
 * Patient Follow-up System
 * Automated follow-up scheduling, treatment adherence tracking,
 * outcome monitoring, and family engagement features
 */

interface Patient {
	id: string;
	name: string;
	age: number;
	gender: 'male' | 'female' | 'other';
	phoneNumber: string;
	alternateContact?: string;
	address: string;
	emergencyContact: {
		name: string;
		relationship: string;
		phoneNumber: string;
	};
	chronicConditions: string[];
	allergies: string[];
	preferredLanguage: string;
	consentForFollowUp: boolean;
}

interface Treatment {
	id: string;
	patientId: string;
	diagnosis: string;
	medications: Medication[];
	instructions: string[];
	startDate: Date;
	duration: number; // days
	followUpSchedule: FollowUpSchedule[];
	prescribedBy: string;
	status: 'active' | 'completed' | 'discontinued' | 'modified';
}

interface Medication {
	name: string;
	dosage: string;
	frequency: string;
	duration: number; // days
	instructions: string;
	sideEffects: string[];
}

interface FollowUpSchedule {
	id: string;
	type: 'phone_call' | 'sms' | 'visit' | 'video_call';
	scheduledDate: Date;
	purpose: string;
	priority: 'low' | 'medium' | 'high' | 'urgent';
	assignedTo: string;
	status: 'scheduled' | 'completed' | 'missed' | 'rescheduled';
	completedDate?: Date;
	notes?: string;
}

interface AdherenceRecord {
	id: string;
	patientId: string;
	treatmentId: string;
	medicationName: string;
	scheduledDate: Date;
	actualDate?: Date;
	taken: boolean;
	skippedReason?: string;
	sideEffectsReported: string[];
	reportedBy: 'patient' | 'family' | 'chw' | 'system';
	timestamp: Date;
}

interface OutcomeMetric {
	id: string;
	patientId: string;
	treatmentId: string;
	metricType: 'symptom_severity' | 'vital_signs' | 'lab_results' | 'functional_status' | 'quality_of_life';
	value: number | string;
	unit?: string;
	measurementDate: Date;
	recordedBy: string;
	baseline?: number | string;
	targetValue?: number | string;
	notes?: string;
}

interface FamilyEngagement {
	patientId: string;
	familyMembers: FamilyMember[];
	engagementLevel: 'high' | 'medium' | 'low';
	communicationPreference: 'phone' | 'sms' | 'whatsapp' | 'in_person';
	lastContact: Date;
	concerns: string[];
	supportProvided: string[];
}

interface FamilyMember {
	name: string;
	relationship: string;
	phoneNumber: string;
	isPrimaryContact: boolean;
	canReceiveUpdates: boolean;
	preferredLanguage: string;
}

interface FollowUpReminder {
	id: string;
	patientId: string;
	type: 'medication' | 'appointment' | 'symptom_check' | 'lab_test';
	message: string;
	scheduledTime: Date;
	delivered: boolean;
	deliveryMethod: 'sms' | 'phone' | 'whatsapp' | 'in_person';
	responseReceived: boolean;
	response?: string;
}

interface TreatmentOutcome {
	patientId: string;
	treatmentId: string;
	overallStatus: 'improved' | 'stable' | 'worsened' | 'resolved' | 'ongoing';
	adherenceRate: number; // percentage
	sideEffectsExperienced: string[];
	qualityOfLifeScore: number; // 1-10 scale
	satisfactionScore: number; // 1-10 scale
	needsReferral: boolean;
	referralReason?: string;
	completionDate: Date;
	followUpRecommendations: string[];
}

class PatientFollowUpSystem {
	private patients: Map<string, Patient> = new Map();
	private treatments: Map<string, Treatment> = new Map();
	private adherenceRecords: AdherenceRecord[] = [];
	private outcomeMetrics: OutcomeMetric[] = [];
	private familyEngagements: Map<string, FamilyEngagement> = new Map();
	private followUpReminders: FollowUpReminder[] = [];
	private treatmentOutcomes: Map<string, TreatmentOutcome> = new Map();

	// Reminder intervals
	private reminderIntervals: Map<string, number> = new Map();

	constructor() {
		this.initializeSystem();
	}

	private async initializeSystem(): Promise<void> {
		await this.loadDataFromStorage();
		this.startAutomatedReminders();
		this.startOutcomeMonitoring();
	}

	// Patient Management

	async registerPatient(patientData: Omit<Patient, 'id'>): Promise<string> {
		const patientId = this.generateId();
		const patient: Patient = {
			id: patientId,
			...patientData
		};

		this.patients.set(patientId, patient);
		await this.saveToStorage();

		return patientId;
	}

	async updatePatient(patientId: string, updates: Partial<Patient>): Promise<boolean> {
		const patient = this.patients.get(patientId);
		if (!patient) return false;

		Object.assign(patient, updates);
		await this.saveToStorage();
		return true;
	}

	getPatient(patientId: string): Patient | null {
		return this.patients.get(patientId) || null;
	}

	// Treatment Management

	async createTreatment(treatmentData: Omit<Treatment, 'id' | 'status'>): Promise<string> {
		const treatmentId = this.generateId();
		const treatment: Treatment = {
			id: treatmentId,
			...treatmentData,
			status: 'active'
		};

		this.treatments.set(treatmentId, treatment);
		
		// Schedule follow-ups
		await this.scheduleFollowUps(treatment);
		await this.setupMedicationReminders(treatment);
		
		await this.saveToStorage();
		return treatmentId;
	}

	async updateTreatmentStatus(
		treatmentId: string, 
		status: Treatment['status'], 
		notes?: string
	): Promise<boolean> {
		const treatment = this.treatments.get(treatmentId);
		if (!treatment) return false;

		treatment.status = status;
		
		if (status === 'completed' || status === 'discontinued') {
			await this.generateTreatmentOutcome(treatmentId);
			this.clearMedicationReminders(treatmentId);
		}

		await this.saveToStorage();
		return true;
	}

	// Follow-up Scheduling

	private async scheduleFollowUps(treatment: Treatment): Promise<void> {
		for (const followUp of treatment.followUpSchedule) {
			// Schedule reminders for follow-up appointments
			const reminderTime = new Date(followUp.scheduledDate.getTime() - 24 * 60 * 60 * 1000); // 24 hours before
			
			if (reminderTime > new Date()) {
				const reminder: FollowUpReminder = {
					id: this.generateId(),
					patientId: treatment.patientId,
					type: 'appointment',
					message: `Reminder: You have a ${followUp.type} scheduled for ${followUp.purpose} tomorrow.`,
					scheduledTime: reminderTime,
					delivered: false,
					deliveryMethod: 'sms',
					responseReceived: false
				};

				this.followUpReminders.push(reminder);
			}
		}
	}

	async rescheduleFollowUp(
		followUpId: string, 
		newDate: Date, 
		reason: string
	): Promise<boolean> {
		for (const treatment of this.treatments.values()) {
			const followUp = treatment.followUpSchedule.find(f => f.id === followUpId);
			if (followUp) {
				followUp.scheduledDate = newDate;
				followUp.status = 'rescheduled';
				followUp.notes = `Rescheduled: ${reason}`;
				
				await this.saveToStorage();
				return true;
			}
		}
		return false;
	}

	async completeFollowUp(
		followUpId: string, 
		notes: string, 
		outcomes: Partial<OutcomeMetric>[]
	): Promise<boolean> {
		for (const treatment of this.treatments.values()) {
			const followUp = treatment.followUpSchedule.find(f => f.id === followUpId);
			if (followUp) {
				followUp.status = 'completed';
				followUp.completedDate = new Date();
				followUp.notes = notes;

				// Record outcome metrics
				for (const outcome of outcomes) {
					if (outcome.metricType && outcome.value !== undefined) {
						await this.recordOutcomeMetric({
							id: this.generateId(),
							patientId: treatment.patientId,
							treatmentId: treatment.id,
							measurementDate: new Date(),
							recordedBy: 'chw',
							...outcome
						} as OutcomeMetric);
					}
				}

				await this.saveToStorage();
				return true;
			}
		}
		return false;
	}

	// Medication Adherence Tracking

	private async setupMedicationReminders(treatment: Treatment): Promise<void> {
		for (const medication of treatment.medications) {
			await this.scheduleMedicationReminders(treatment.patientId, treatment.id, medication);
		}
	}

	private async scheduleMedicationReminders(
		patientId: string, 
		treatmentId: string, 
		medication: Medication
	): Promise<void> {
		// Parse frequency and create reminder schedule
		const reminderTimes = this.parseFrequency(medication.frequency);
		
		for (let day = 0; day < medication.duration; day++) {
			for (const time of reminderTimes) {
				const reminderDate = new Date();
				reminderDate.setDate(reminderDate.getDate() + day);
				reminderDate.setHours(time.hour, time.minute, 0, 0);

				const reminder: FollowUpReminder = {
					id: this.generateId(),
					patientId,
					type: 'medication',
					message: `Time to take your medication: ${medication.name} (${medication.dosage})`,
					scheduledTime: reminderDate,
					delivered: false,
					deliveryMethod: 'sms',
					responseReceived: false
				};

				this.followUpReminders.push(reminder);
			}
		}
	}

	private parseFrequency(frequency: string): { hour: number; minute: number }[] {
		// Simple frequency parsing - in practice, this would be more sophisticated
		const times: { hour: number; minute: number }[] = [];
		
		if (frequency.includes('once daily') || frequency.includes('1x/day')) {
			times.push({ hour: 9, minute: 0 }); // 9 AM
		} else if (frequency.includes('twice daily') || frequency.includes('2x/day')) {
			times.push({ hour: 9, minute: 0 }, { hour: 21, minute: 0 }); // 9 AM, 9 PM
		} else if (frequency.includes('thrice daily') || frequency.includes('3x/day')) {
			times.push({ hour: 9, minute: 0 }, { hour: 14, minute: 0 }, { hour: 21, minute: 0 }); // 9 AM, 2 PM, 9 PM
		} else {
			times.push({ hour: 9, minute: 0 }); // Default to once daily
		}
		
		return times;
	}

	async recordMedicationAdherence(adherence: Omit<AdherenceRecord, 'id' | 'timestamp'>): Promise<void> {
		const record: AdherenceRecord = {
			id: this.generateId(),
			timestamp: new Date(),
			...adherence
		};

		this.adherenceRecords.push(record);
		
		// Check for side effects and schedule follow-up if needed
		if (record.sideEffectsReported.length > 0) {
			await this.scheduleSideEffectFollowUp(record);
		}

		await this.saveToStorage();
	}

	private async scheduleSideEffectFollowUp(adherence: AdherenceRecord): Promise<void> {
		const patient = this.patients.get(adherence.patientId);
		if (!patient) return;

		const followUpDate = new Date();
		followUpDate.setDate(followUpDate.getDate() + 1); // Next day

		const reminder: FollowUpReminder = {
			id: this.generateId(),
			patientId: adherence.patientId,
			type: 'symptom_check',
			message: `Follow-up needed: You reported side effects (${adherence.sideEffectsReported.join(', ')}). Please contact your healthcare provider.`,
			scheduledTime: followUpDate,
			delivered: false,
			deliveryMethod: 'phone',
			responseReceived: false
		};

		this.followUpReminders.push(reminder);
	}

	getAdherenceRate(patientId: string, treatmentId: string): number {
		const records = this.adherenceRecords.filter(
			r => r.patientId === patientId && r.treatmentId === treatmentId
		);

		if (records.length === 0) return 0;

		const takenCount = records.filter(r => r.taken).length;
		return Math.round((takenCount / records.length) * 100);
	}

	// Outcome Monitoring

	async recordOutcomeMetric(metric: OutcomeMetric): Promise<void> {
		this.outcomeMetrics.push(metric);
		
		// Check if outcome requires immediate attention
		await this.analyzeOutcomeTrend(metric);
		
		await this.saveToStorage();
	}

	private async analyzeOutcomeTrend(metric: OutcomeMetric): Promise<void> {
		const relatedMetrics = this.outcomeMetrics.filter(
			m => m.patientId === metric.patientId && 
			     m.metricType === metric.metricType &&
			     m.measurementDate <= metric.measurementDate
		).sort((a, b) => b.measurementDate.getTime() - a.measurementDate.getTime());

		if (relatedMetrics.length >= 2) {
			const current = relatedMetrics[0];
			const previous = relatedMetrics[1];
			
			// Simple trend analysis for numeric values
			if (typeof current.value === 'number' && typeof previous.value === 'number') {
				const changePercent = ((current.value - previous.value) / previous.value) * 100;
				
				// Alert for significant worsening (>20% increase in symptoms or >10% decrease in vital signs)
				if ((metric.metricType === 'symptom_severity' && changePercent > 20) ||
					(metric.metricType === 'vital_signs' && changePercent < -10)) {
					
					await this.scheduleUrgentFollowUp(metric.patientId, `Concerning trend in ${metric.metricType}`);
				}
			}
		}
	}

	private async scheduleUrgentFollowUp(patientId: string, reason: string): Promise<void> {
		const followUpDate = new Date();
		followUpDate.setHours(followUpDate.getHours() + 2); // 2 hours from now

		const reminder: FollowUpReminder = {
			id: this.generateId(),
			patientId,
			type: 'symptom_check',
			message: `Urgent follow-up required: ${reason}. Please contact immediately.`,
			scheduledTime: followUpDate,
			delivered: false,
			deliveryMethod: 'phone',
			responseReceived: false
		};

		this.followUpReminders.push(reminder);
	}

	getOutcomeTrend(
		patientId: string, 
		metricType: OutcomeMetric['metricType'], 
		days: number = 30
	): OutcomeMetric[] {
		const cutoffDate = new Date();
		cutoffDate.setDate(cutoffDate.getDate() - days);

		return this.outcomeMetrics
			.filter(m => 
				m.patientId === patientId && 
				m.metricType === metricType &&
				m.measurementDate >= cutoffDate
			)
			.sort((a, b) => a.measurementDate.getTime() - b.measurementDate.getTime());
	}

	// Family Engagement

	async setupFamilyEngagement(engagement: FamilyEngagement): Promise<void> {
		this.familyEngagements.set(engagement.patientId, engagement);
		await this.saveToStorage();
	}

	async recordFamilyContact(
		patientId: string, 
		contactType: string, 
		notes: string,
		concerns: string[] = []
	): Promise<void> {
		const engagement = this.familyEngagements.get(patientId);
		if (!engagement) return;

		engagement.lastContact = new Date();
		engagement.concerns = [...engagement.concerns, ...concerns];
		
		// Schedule follow-up based on concerns
		if (concerns.length > 0) {
			await this.scheduleFamilyConcernFollowUp(patientId, concerns);
		}

		await this.saveToStorage();
	}

	private async scheduleFamilyConcernFollowUp(patientId: string, concerns: string[]): Promise<void> {
		const followUpDate = new Date();
		followUpDate.setDate(followUpDate.getDate() + 1);

		const reminder: FollowUpReminder = {
			id: this.generateId(),
			patientId,
			type: 'symptom_check',
			message: `Family concerns reported: ${concerns.join(', ')}. Follow-up scheduled.`,
			scheduledTime: followUpDate,
			delivered: false,
			deliveryMethod: 'phone',
			responseReceived: false
		};

		this.followUpReminders.push(reminder);
	}

	getFamilyEngagement(patientId: string): FamilyEngagement | null {
		return this.familyEngagements.get(patientId) || null;
	}

	// Automated Reminders

	private startAutomatedReminders(): void {
		// Check for pending reminders every minute
		setInterval(() => {
			this.processScheduledReminders();
		}, 60000);
	}

	private async processScheduledReminders(): Promise<void> {
		const now = new Date();
		const dueReminders = this.followUpReminders.filter(
			r => !r.delivered && r.scheduledTime <= now
		);

		for (const reminder of dueReminders) {
			await this.deliverReminder(reminder);
		}
	}

	private async deliverReminder(reminder: FollowUpReminder): Promise<void> {
		// Simulate reminder delivery
		console.log(`Delivering ${reminder.deliveryMethod} reminder to patient ${reminder.patientId}: ${reminder.message}`);
		
		reminder.delivered = true;
		
		// Simulate delivery confirmation
		setTimeout(() => {
			// In practice, this would be based on actual delivery confirmation
			reminder.responseReceived = Math.random() > 0.3; // 70% response rate
			if (reminder.responseReceived) {
				reminder.response = 'Acknowledged';
			}
		}, 1000);

		await this.saveToStorage();
	}

	// Treatment Outcome Generation

	private async generateTreatmentOutcome(treatmentId: string): Promise<void> {
		const treatment = this.treatments.get(treatmentId);
		if (!treatment) return;

		const adherenceRate = this.getAdherenceRate(treatment.patientId, treatmentId);
		const sideEffects = [...new Set(
			this.adherenceRecords
				.filter(r => r.treatmentId === treatmentId)
				.flatMap(r => r.sideEffectsReported)
		)];

		// Calculate quality of life based on outcome metrics
		const qualityMetrics = this.outcomeMetrics.filter(
			m => m.treatmentId === treatmentId && m.metricType === 'quality_of_life'
		);
		const latestQualityScore = qualityMetrics.length > 0 
			? Number(qualityMetrics[qualityMetrics.length - 1].value) 
			: 5;

		const outcome: TreatmentOutcome = {
			patientId: treatment.patientId,
			treatmentId,
			overallStatus: this.determineOverallStatus(treatmentId),
			adherenceRate,
			sideEffectsExperienced: sideEffects,
			qualityOfLifeScore: latestQualityScore,
			satisfactionScore: this.calculateSatisfactionScore(treatmentId),
			needsReferral: this.assessReferralNeed(treatmentId),
			completionDate: new Date(),
			followUpRecommendations: this.generateFollowUpRecommendations(treatmentId)
		};

		this.treatmentOutcomes.set(treatmentId, outcome);
		await this.saveToStorage();
	}

	private determineOverallStatus(treatmentId: string): TreatmentOutcome['overallStatus'] {
		// Simple logic - in practice, this would be more sophisticated
		const adherenceRate = this.getAdherenceRate('', treatmentId);
		
		if (adherenceRate >= 80) return 'improved';
		if (adherenceRate >= 60) return 'stable';
		return 'worsened';
	}

	private calculateSatisfactionScore(treatmentId: string): number {
		// Placeholder calculation - would be based on patient feedback
		return Math.floor(Math.random() * 3) + 7; // 7-9 range
	}

	private assessReferralNeed(treatmentId: string): boolean {
		// Check for concerning symptoms or poor adherence
		const adherenceRate = this.getAdherenceRate('', treatmentId);
		const sideEffects = this.adherenceRecords
			.filter(r => r.treatmentId === treatmentId)
			.flatMap(r => r.sideEffectsReported);

		return adherenceRate < 50 || sideEffects.length > 3;
	}

	private generateFollowUpRecommendations(treatmentId: string): string[] {
		const recommendations: string[] = [];
		const adherenceRate = this.getAdherenceRate('', treatmentId);

		if (adherenceRate < 80) {
			recommendations.push('Improve medication adherence through counseling');
		}
		
		recommendations.push('Monitor symptoms weekly for next month');
		recommendations.push('Schedule routine check-up in 3 months');

		return recommendations;
	}

	private clearMedicationReminders(treatmentId: string): void {
		// Remove pending medication reminders for completed treatment
		this.followUpReminders = this.followUpReminders.filter(
			r => !(r.type === 'medication' && this.treatments.get(treatmentId)?.id === treatmentId)
		);
	}

	// Outcome Monitoring System

	private startOutcomeMonitoring(): void {
		// Daily outcome analysis
		setInterval(() => {
			this.analyzeAllPatientOutcomes();
		}, 24 * 60 * 60 * 1000); // Daily
	}

	private async analyzeAllPatientOutcomes(): Promise<void> {
		for (const patient of this.patients.values()) {
			const activeProblems = await this.identifyActiveProblems(patient.id);
			if (activeProblems.length > 0) {
				await this.scheduleOutcomeReview(patient.id, activeProblems);
			}
		}
	}

	private async identifyActiveProblems(patientId: string): Promise<string[]> {
		const problems: string[] = [];
		
		// Check adherence rates
		const treatments = Array.from(this.treatments.values()).filter(t => t.patientId === patientId);
		for (const treatment of treatments) {
			const adherenceRate = this.getAdherenceRate(patientId, treatment.id);
			if (adherenceRate < 70) {
				problems.push(`Poor adherence to ${treatment.diagnosis} treatment (${adherenceRate}%)`);
			}
		}

		// Check for worsening symptoms
		const recentMetrics = this.outcomeMetrics.filter(
			m => m.patientId === patientId && 
			     Date.now() - m.measurementDate.getTime() < 7 * 24 * 60 * 60 * 1000 // Last 7 days
		);
		
		const worseningSymptoms = recentMetrics.filter(
			m => m.metricType === 'symptom_severity' && 
			     typeof m.value === 'number' && 
			     m.value > 7 // High severity
		);

		if (worseningSymptoms.length > 0) {
			problems.push('Worsening symptom severity detected');
		}

		return problems;
	}

	private async scheduleOutcomeReview(patientId: string, problems: string[]): Promise<void> {
		const reviewDate = new Date();
		reviewDate.setDate(reviewDate.getDate() + 1);

		const reminder: FollowUpReminder = {
			id: this.generateId(),
			patientId,
			type: 'symptom_check',
			message: `Outcome review needed: ${problems.join(', ')}`,
			scheduledTime: reviewDate,
			delivered: false,
			deliveryMethod: 'phone',
			responseReceived: false
		};

		this.followUpReminders.push(reminder);
	}

	// Analytics and Reporting

	async generatePatientReport(patientId: string): Promise<{
		patient: Patient | null;
		activetreatments: Treatment[];
		adherenceRates: Record<string, number>;
		recentOutcomes: OutcomeMetric[];
		familyEngagement: FamilyEngagement | null;
		upcomingFollowUps: FollowUpSchedule[];
		riskFactors: string[];
	}> {
		const patient = this.getPatient(patientId);
		const activeTransactions = Array.from(this.treatments.values())
			.filter(t => t.patientId === patientId && t.status === 'active');

		const adherenceRates: Record<string, number> = {};
		for (const treatment of activeTransactions) {
			adherenceRates[treatment.id] = this.getAdherenceRate(patientId, treatment.id);
		}

		const recentOutcomes = this.outcomeMetrics
			.filter(m => m.patientId === patientId)
			.sort((a, b) => b.measurementDate.getTime() - a.measurementDate.getTime())
			.slice(0, 10);

		const upcomingFollowUps = activeTransactions
			.flatMap(t => t.followUpSchedule)
			.filter(f => f.status === 'scheduled' && f.scheduledDate > new Date())
			.sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime());

		const riskFactors = await this.identifyActiveProblems(patientId);

		return {
			patient,
			activetreatments: activeTransactions,
			adherenceRates,
			recentOutcomes,
			familyEngagement: this.getFamilyEngagement(patientId),
			upcomingFollowUps,
			riskFactors
		};
	}

	// Data Persistence

	private async saveToStorage(): Promise<void> {
		try {
			const data = {
				patients: Array.from(this.patients.entries()),
				treatments: Array.from(this.treatments.entries()),
				adherenceRecords: this.adherenceRecords,
				outcomeMetrics: this.outcomeMetrics,
				familyEngagements: Array.from(this.familyEngagements.entries()),
				followUpReminders: this.followUpReminders,
				treatmentOutcomes: Array.from(this.treatmentOutcomes.entries())
			};

			localStorage.setItem('patient_followup_system', JSON.stringify(data));
		} catch (error) {
			console.error('Failed to save follow-up system data:', error);
		}
	}

	private async loadDataFromStorage(): Promise<void> {
		try {
			const saved = localStorage.getItem('patient_followup_system');
			if (saved) {
				const data = JSON.parse(saved);
				
				this.patients = new Map(data.patients || []);
				this.treatments = new Map(data.treatments || []);
				this.adherenceRecords = (data.adherenceRecords || []).map((record: any) => ({
					...record,
					scheduledDate: new Date(record.scheduledDate),
					actualDate: record.actualDate ? new Date(record.actualDate) : undefined,
					timestamp: new Date(record.timestamp)
				}));
				this.outcomeMetrics = (data.outcomeMetrics || []).map((metric: any) => ({
					...metric,
					measurementDate: new Date(metric.measurementDate)
				}));
				this.familyEngagements = new Map(data.familyEngagements || []);
				this.followUpReminders = (data.followUpReminders || []).map((reminder: any) => ({
					...reminder,
					scheduledTime: new Date(reminder.scheduledTime)
				}));
				this.treatmentOutcomes = new Map(data.treatmentOutcomes || []);
			}
		} catch (error) {
			console.error('Failed to load follow-up system data:', error);
		}
	}

	private generateId(): string {
		return Date.now().toString(36) + Math.random().toString(36).substr(2);
	}

	// Public API Methods

	async getSystemStats(): Promise<{
		totalPatients: number;
		activeTransactions: number;
		adherenceRate: number;
		pendingFollowUps: number;
		completedFollowUps: number;
	}> {
		const activeTransactions = Array.from(this.treatments.values()).filter(t => t.status === 'active');
		const allAdherenceRates = activeTransactions.map(t => this.getAdherenceRate(t.patientId, t.id));
		const avgAdherenceRate = allAdherenceRates.length > 0 
			? allAdherenceRates.reduce((sum, rate) => sum + rate, 0) / allAdherenceRates.length 
			: 0;

		const allFollowUps = activeTransactions.flatMap(t => t.followUpSchedule);
		const pendingFollowUps = allFollowUps.filter(f => f.status === 'scheduled').length;
		const completedFollowUps = allFollowUps.filter(f => f.status === 'completed').length;

		return {
			totalPatients: this.patients.size,
			activeTransactions: activeTransactions.length,
			adherenceRate: Math.round(avgAdherenceRate),
			pendingFollowUps,
			completedFollowUps
		};
	}
}

export default PatientFollowUpSystem;