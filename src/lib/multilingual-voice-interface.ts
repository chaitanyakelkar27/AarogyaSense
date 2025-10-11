/**
 * Multilingual Voice Interface
 * Voice recognition and text-to-speech in Hindi, Marathi, Bengali, and English
 * with dialect support and offline processing capabilities
 */

// Type definitions for Speech API
declare global {
	interface Window {
		SpeechRecognition: any;
		webkitSpeechRecognition: any;
	}
}

interface SpeechRecognitionEvent extends Event {
	results: SpeechRecognitionResultList;
	resultIndex: number;
}

interface SpeechRecognitionResult {
	isFinal: boolean;
	0: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
	transcript: string;
	confidence: number;
}

interface SpeechRecognitionResultList {
	length: number;
	[index: number]: SpeechRecognitionResult;
}

interface VoiceLanguageConfig {
	code: string;
	name: string;
	nativeName: string;
	speechRecognitionCode: string;
	voiceName: string;
	dialects: string[];
	offlineSupported: boolean;
}

interface VoiceCommand {
	phrase: string;
	intent: string;
	confidence: number;
	language: string;
}

interface SpeechSynthesisOptions {
	language: string;
	dialect?: string;
	rate: number;
	pitch: number;
	volume: number;
	voice?: string;
}

interface MedicalPhrases {
	symptoms: Record<string, string[]>;
	commands: Record<string, string[]>;
	responses: Record<string, string>;
}

class MultilingualVoiceInterface {
	private recognition: any = null;
	private synthesis: SpeechSynthesis;
	private currentLanguage = 'en';
	private isListening = false;
	private voicesLoaded = false;
	private availableVoices: SpeechSynthesisVoice[] = [];

	// Language configurations
	private languages: Record<string, VoiceLanguageConfig> = {
		'en': {
			code: 'en',
			name: 'English',
			nativeName: 'English',
			speechRecognitionCode: 'en-IN',
			voiceName: 'en-IN',
			dialects: ['en-IN', 'en-US', 'en-GB'],
			offlineSupported: true
		},
		'hi': {
			code: 'hi',
			name: 'Hindi',
			nativeName: 'हिन्दी',
			speechRecognitionCode: 'hi-IN',
			voiceName: 'hi-IN',
			dialects: ['hi-IN'],
			offlineSupported: true
		},
		'mr': {
			code: 'mr',
			name: 'Marathi',
			nativeName: 'मराठी',
			speechRecognitionCode: 'mr-IN',
			voiceName: 'mr-IN',
			dialects: ['mr-IN'],
			offlineSupported: false
		},
		'bn': {
			code: 'bn',
			name: 'Bengali',
			nativeName: 'বাংলা',
			speechRecognitionCode: 'bn-IN',
			voiceName: 'bn-IN',
			dialects: ['bn-IN', 'bn-BD'],
			offlineSupported: false
		}
	};

	// Medical phrases and intents for each language
	private medicalPhrases: Record<string, MedicalPhrases> = {
		'en': {
			symptoms: {
				'fever': ['fever', 'high temperature', 'hot body', 'temperature'],
				'cough': ['cough', 'coughing', 'throat problem'],
				'headache': ['headache', 'head pain', 'head ache'],
				'breathing': ['breathing problem', 'shortness of breath', 'difficulty breathing', 'breathless'],
				'chest_pain': ['chest pain', 'heart pain', 'chest hurts'],
				'nausea': ['nausea', 'vomiting', 'feeling sick', 'throwing up']
			},
			commands: {
				'start_recording': ['start recording', 'begin recording', 'record now'],
				'stop_recording': ['stop recording', 'end recording', 'stop'],
				'save_case': ['save case', 'save patient', 'submit case'],
				'next_step': ['next step', 'continue', 'proceed'],
				'previous_step': ['previous step', 'go back', 'back']
			},
			responses: {
				'recording_started': 'Recording started. Please speak now.',
				'recording_stopped': 'Recording stopped.',
				'symptom_recorded': 'Symptom recorded successfully.',
				'case_saved': 'Patient case has been saved.',
				'error_occurred': 'Sorry, an error occurred. Please try again.'
			}
		},
		'hi': {
			symptoms: {
				'fever': ['बुखार', 'तेज बुखार', 'गर्म शरीर', 'तापमान'],
				'cough': ['खांसी', 'खांसना', 'गले की समस्या'],
				'headache': ['सिरदर्द', 'सिर में दर्द', 'सिर दुखना'],
				'breathing': ['सांस की समस्या', 'सांस लेने में परेशानी', 'सांस फूलना'],
				'chest_pain': ['छाती में दर्द', 'दिल में दर्द', 'छाती दुखना'],
				'nausea': ['मतली', 'उल्टी', 'जी मिचलाना', 'उबकाई']
			},
			commands: {
				'start_recording': ['रिकॉर्डिंग शुरू करो', 'रिकॉर्डिंग प्रारंभ करो'],
				'stop_recording': ['रिकॉर्डिंग बंद करो', 'रिकॉर्डिंग रोको'],
				'save_case': ['केस सेव करो', 'मरीज़ को सेव करो'],
				'next_step': ['अगला कदम', 'आगे बढ़ो'],
				'previous_step': ['पिछला कदम', 'वापस जाओ']
			},
			responses: {
				'recording_started': 'रिकॉर्डिंग शुरू हो गई है। कृपया अब बोलें।',
				'recording_stopped': 'रिकॉर्डिंग बंद हो गई है।',
				'symptom_recorded': 'लक्षण सफलतापूर्वक रिकॉर्ड हो गया।',
				'case_saved': 'मरीज़ का केस सेव हो गया है।',
				'error_occurred': 'माफ़ करें, कोई त्रुटि हुई है। कृपया दोबारा कोशिश करें।'
			}
		},
		'mr': {
			symptoms: {
				'fever': ['ताप', 'तापमान', 'गरम शरीर'],
				'cough': ['खोकला', 'खासणे', 'गळ्याची समस्या'],
				'headache': ['डोकेदुखी', 'डोक्यात दुखणे'],
				'breathing': ['श्वासाची समस्या', 'श्वास घेण्यात त्रास'],
				'chest_pain': ['छातीत दुखणे', 'हृदयात दुखणे'],
				'nausea': ['मळमळाट', 'उलट्या', 'वाईट वाटणे']
			},
			commands: {
				'start_recording': ['रिकॉर्डिंग सुरू करा', 'रिकॉर्डिंग चालू करा'],
				'stop_recording': ['रिकॉर्डिंग बंद करा', 'रिकॉर्डिंग थांबवा'],
				'save_case': ['केस सेव्ह करा', 'रुग्ण सेव्ह करा'],
				'next_step': ['पुढील स्टेप', 'पुढे जा'],
				'previous_step': ['मागील स्टेप', 'मागे जा']
			},
			responses: {
				'recording_started': 'रिकॉर्डिंग सुरू झाले आहे. कृपया आता बोला.',
				'recording_stopped': 'रिकॉर्डिंग बंद झाले आहे.',
				'symptom_recorded': 'लक्षण यशस्वीरित्या रिकॉर्ड झाले आहे.',
				'case_saved': 'रुग्णाचे केस सेव्ह झाले आहे.',
				'error_occurred': 'माफ करा, काही त्रुटी झाली आहे. कृपया पुन्हा प्रयत्न करा.'
			}
		},
		'bn': {
			symptoms: {
				'fever': ['জ্বর', 'উচ্চ তাপমাত্রা', 'গরম শরীর'],
				'cough': ['কাশি', 'কাশতে থাকা', 'গলার সমস্যা'],
				'headache': ['মাথাব্যথা', 'মাথা ব্যথা', 'মাথায় ব্যথা'],
				'breathing': ['শ্বাসকষ্ট', 'শ্বাস নিতে সমস্যা', 'শ্বাসপ্রশ্বাসের সমস্যা'],
				'chest_pain': ['বুকে ব্যথা', 'হৃদপিণ্ডে ব্যথা'],
				'nausea': ['বমি বমি ভাব', 'বমি', 'অসুস্থ লাগা']
			},
			commands: {
				'start_recording': ['রেকর্ডিং শুরু করুন', 'রেকর্ডিং চালু করুন'],
				'stop_recording': ['রেকর্ডিং বন্ধ করুন', 'রেকর্ডিং থামান'],
				'save_case': ['কেস সেভ করুন', 'রোগী সেভ করুন'],
				'next_step': ['পরবর্তী ধাপ', 'এগিয়ে যান'],
				'previous_step': ['আগের ধাপ', 'পিছিয়ে যান']
			},
			responses: {
				'recording_started': 'রেকর্ডিং শুরু হয়েছে। দয়া করে এখন বলুন।',
				'recording_stopped': 'রেকর্ডিং বন্ধ হয়েছে।',
				'symptom_recorded': 'লক্ষণ সফলভাবে রেকর্ড হয়েছে।',
				'case_saved': 'রোগীর কেস সেভ হয়েছে।',
				'error_occurred': 'দুঃখিত, একটি ত্রুটি ঘটেছে। দয়া করে আবার চেষ্টা করুন।'
			}
		}
	};

	// Event callbacks
	private onVoiceCommandCallback: ((command: VoiceCommand) => void) | null = null;
	private onSpeechStartCallback: (() => void) | null = null;
	private onSpeechEndCallback: (() => void) | null = null;
	private onErrorCallback: ((error: string) => void) | null = null;

	constructor() {
		this.synthesis = window.speechSynthesis;
		this.initializeSpeechRecognition();
		this.loadVoices();
		
		// Load voices when they become available
		if (this.synthesis.onvoiceschanged !== undefined) {
			this.synthesis.onvoiceschanged = () => this.loadVoices();
		}
	}

	private initializeSpeechRecognition(): void {
		if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
			console.error('Speech recognition not supported');
			return;
		}

		const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
		this.recognition = new SpeechRecognition();

		if (this.recognition) {
			this.recognition.continuous = true;
			this.recognition.interimResults = true;
			this.recognition.maxAlternatives = 3;
			
			this.recognition.onstart = () => {
				this.isListening = true;
				if (this.onSpeechStartCallback) {
					this.onSpeechStartCallback();
				}
			};

			this.recognition.onend = () => {
				this.isListening = false;
				if (this.onSpeechEndCallback) {
					this.onSpeechEndCallback();
				}
			};

			this.recognition.onresult = (event: SpeechRecognitionEvent) => {
				this.processSpeechResult(event);
			};

			this.recognition.onerror = (event: any) => {
				const error = `Speech recognition error: ${event.error}`;
				console.error(error);
				if (this.onErrorCallback) {
					this.onErrorCallback(error);
				}
			};
		}
	}

	private loadVoices(): void {
		this.availableVoices = this.synthesis.getVoices();
		this.voicesLoaded = this.availableVoices.length > 0;
	}

	private processSpeechResult(event: SpeechRecognitionEvent): void {
		let finalTranscript = '';
		
		for (let i = event.resultIndex; i < event.results.length; i++) {
			const result = event.results[i];
			if (result.isFinal) {
				finalTranscript += result[0].transcript;
			}
		}

		if (finalTranscript) {
			const command = this.interpretSpeech(finalTranscript.trim());
			if (command && this.onVoiceCommandCallback) {
				this.onVoiceCommandCallback(command);
			}
		}
	}

	private interpretSpeech(transcript: string): VoiceCommand | null {
		const lowerTranscript = transcript.toLowerCase();
		const languageConfig = this.medicalPhrases[this.currentLanguage];
		
		if (!languageConfig) return null;

		// Check for symptoms
		for (const [symptom, phrases] of Object.entries(languageConfig.symptoms)) {
			const phraseList = phrases as string[];
			for (const phrase of phraseList) {
				if (lowerTranscript.includes(phrase.toLowerCase())) {
					return {
						phrase: transcript,
						intent: `symptom:${symptom}`,
						confidence: this.calculateConfidence(phrase, lowerTranscript),
						language: this.currentLanguage
					};
				}
			}
		}

		// Check for commands
		for (const [command, phrases] of Object.entries(languageConfig.commands)) {
			const phraseList = phrases as string[];
			for (const phrase of phraseList) {
				if (lowerTranscript.includes(phrase.toLowerCase())) {
					return {
						phrase: transcript,
						intent: `command:${command}`,
						confidence: this.calculateConfidence(phrase, lowerTranscript),
						language: this.currentLanguage
					};
				}
			}
		}

		// If no specific intent found, return as general speech
		return {
			phrase: transcript,
			intent: 'general_speech',
			confidence: 0.8,
			language: this.currentLanguage
		};
	}

	private calculateConfidence(phrase: string, transcript: string): number {
		// Simple confidence calculation based on phrase match
		const wordsInPhrase = phrase.split(' ');
		const wordsInTranscript = transcript.split(' ');
		const matches = wordsInPhrase.filter(word => 
			wordsInTranscript.some(t => t.includes(word.toLowerCase()))
		).length;
		
		return Math.min(0.9, (matches / wordsInPhrase.length) * 0.9 + 0.1);
	}

	// Public API Methods

	setLanguage(languageCode: string): boolean {
		if (this.languages[languageCode]) {
			this.currentLanguage = languageCode;
			
			if (this.recognition) {
				this.recognition.lang = this.languages[languageCode].speechRecognitionCode;
			}
			
			return true;
		}
		return false;
	}

	getCurrentLanguage(): string {
		return this.currentLanguage;
	}

	getAvailableLanguages(): VoiceLanguageConfig[] {
		return Object.values(this.languages);
	}

	startListening(): boolean {
		if (!this.recognition || this.isListening) return false;

		try {
			this.recognition.start();
			return true;
		} catch (error) {
			console.error('Failed to start speech recognition:', error);
			return false;
		}
	}

	stopListening(): void {
		if (this.recognition && this.isListening) {
			this.recognition.stop();
		}
	}

	speak(text: string, options: Partial<SpeechSynthesisOptions> = {}): Promise<void> {
		return new Promise((resolve, reject) => {
			if (!this.synthesis) {
				reject(new Error('Speech synthesis not supported'));
				return;
			}

			const utterance = new SpeechSynthesisUtterance(text);
			
			// Set language and voice
			const langConfig = this.languages[options.language || this.currentLanguage];
			if (langConfig) {
				utterance.lang = langConfig.voiceName;
				
				// Try to find a suitable voice
				const voice = this.findVoiceForLanguage(langConfig.voiceName);
				if (voice) {
					utterance.voice = voice;
				}
			}

			// Set speech parameters
			utterance.rate = options.rate || 1.0;
			utterance.pitch = options.pitch || 1.0;
			utterance.volume = options.volume || 1.0;

			utterance.onend = () => resolve();
			utterance.onerror = (event) => reject(new Error(`Speech synthesis error: ${event.error}`));

			this.synthesis.speak(utterance);
		});
	}

	async speakResponse(responseKey: string, language?: string): Promise<void> {
		const lang = language || this.currentLanguage;
		const responses = this.medicalPhrases[lang]?.responses;
		
		if (responses && responses[responseKey]) {
			await this.speak(responses[responseKey], { language: lang });
		} else {
			console.warn(`Response key '${responseKey}' not found for language '${lang}'`);
		}
	}

	private findVoiceForLanguage(languageCode: string): SpeechSynthesisVoice | null {
		return this.availableVoices.find(voice => 
			voice.lang.startsWith(languageCode) || 
			voice.lang.startsWith(languageCode.split('-')[0])
		) || null;
	}

	// Voice command processing for medical workflow

	async processPatientSymptoms(transcript: string): Promise<string[]> {
		const symptoms: string[] = [];
		const languageConfig = this.medicalPhrases[this.currentLanguage];
		
		if (languageConfig) {
			const lowerTranscript = transcript.toLowerCase();
			
			for (const [symptom, phrases] of Object.entries(languageConfig.symptoms)) {
				const phraseList = phrases as string[];
				for (const phrase of phraseList) {
					if (lowerTranscript.includes(phrase.toLowerCase())) {
						symptoms.push(symptom);
						break; // Avoid duplicate symptoms
					}
				}
			}
		}
		
		return [...new Set(symptoms)]; // Remove duplicates
	}

	async translateText(text: string, targetLanguage: string): Promise<string> {
		// Basic translation map for common medical phrases
		// In a real implementation, this would use a proper translation API
		const translations: Record<string, Record<string, string>> = {
			'en_to_hi': {
				'fever': 'बुखार',
				'cough': 'खांसी',
				'headache': 'सिरदर्द',
				'breathing problem': 'सांस की समस्या',
				'chest pain': 'छाती में दर्द',
				'nausea': 'मतली'
			},
			'hi_to_en': {
				'बुखार': 'fever',
				'खांसी': 'cough',
				'सिरदर्द': 'headache',
				'सांस की समस्या': 'breathing problem',
				'छाती में दर्द': 'chest pain',
				'मतली': 'nausea'
			}
		};

		const translationKey = `${this.currentLanguage}_to_${targetLanguage}`;
		const translationMap = translations[translationKey];
		
		if (translationMap) {
			let translatedText = text;
			for (const [source, target] of Object.entries(translationMap)) {
				translatedText = translatedText.replace(new RegExp(source, 'gi'), target as string);
			}
			return translatedText;
		}
		
		return text; // Return original if no translation available
	}

	// Offline support methods

	isOfflineSupported(languageCode?: string): boolean {
		const lang = languageCode || this.currentLanguage;
		return this.languages[lang]?.offlineSupported || false;
	}

	downloadLanguageModel(languageCode: string): Promise<boolean> {
		// Simulate offline model download
		// In a real implementation, this would download language models
		return new Promise((resolve) => {
			setTimeout(() => {
				console.log(`Downloaded offline model for ${languageCode}`);
				resolve(true);
			}, 2000);
		});
	}

	// Event handlers

	onVoiceCommand(callback: (command: VoiceCommand) => void): void {
		this.onVoiceCommandCallback = callback;
	}

	onSpeechStart(callback: () => void): void {
		this.onSpeechStartCallback = callback;
	}

	onSpeechEnd(callback: () => void): void {
		this.onSpeechEndCallback = callback;
	}

	onError(callback: (error: string) => void): void {
		this.onErrorCallback = callback;
	}

	// Status methods

	isListeningActive(): boolean {
		return this.isListening;
	}

	isSpeechSynthesisSupported(): boolean {
		return 'speechSynthesis' in window;
	}

	isSpeechRecognitionSupported(): boolean {
		return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
	}

	getVoiceCapabilities(): {
		speechRecognition: boolean;
		speechSynthesis: boolean;
		offlineSupport: boolean;
		availableLanguages: string[];
	} {
		return {
			speechRecognition: this.isSpeechRecognitionSupported(),
			speechSynthesis: this.isSpeechSynthesisSupported(),
			offlineSupport: this.isOfflineSupported(),
			availableLanguages: Object.keys(this.languages)
		};
	}
}

export default MultilingualVoiceInterface;