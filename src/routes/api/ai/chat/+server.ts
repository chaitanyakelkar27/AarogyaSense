import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import OpenAI from 'openai';
import { OPENAI_API_KEY } from '$env/static/private';

const SYSTEM_PROMPT = `You are an AI Health Assistant helping Community Health Workers (CHWs) in rural India assess patients. Your role is to:

1. Ask relevant medical questions based on patient symptoms
2. Gather critical information efficiently (limit follow-up questions to 5-6 max)
3. Assess the severity and urgency of the condition
4. Provide a risk score (0-100) and priority level

IMPORTANT GUIDELINES:
- Be empathetic and professional
- Ask clear, simple questions that CHWs can understand
- Focus on RED FLAG symptoms: chest pain, breathing difficulty, unconsciousness, severe bleeding, seizures
- Consider vital signs: fever >103°F, very high/low blood pressure, irregular heartbeat
- Keep questions focused and relevant
- After gathering sufficient information (5-6 questions max), provide your assessment

When you have enough information to make an assessment, respond with a JSON object in this format:
{
  "assessment_complete": true,
  "risk_score": 75,
  "priority": 4,
  "risk_level": "HIGH",
  "symptoms": ["chest pain", "shortness of breath"],
  "recommendations": "Immediate medical attention required. Patient shows signs of potential cardiac event.",
  "needs_escalation": true,
  "escalate_to": "CLINICIAN"
}

Risk Scoring Guide:
- 0-30: LOW (Priority 1-2) - Minor issues, basic care
- 31-50: MEDIUM (Priority 3) - Needs attention, escalate to ASHA
- 51-75: HIGH (Priority 4) - Urgent care needed, escalate to CLINICIAN
- 76-100: CRITICAL (Priority 5) - Emergency, immediate clinician attention

If you need more information, just ask your next question as plain text.`;

interface Message {
	role: 'system' | 'user' | 'assistant';
	content: string;
}

export const POST: RequestHandler = async ({ request }) => {
	try {
		if (!OPENAI_API_KEY) {
			return json(
				{ 
					error: 'OpenAI API key not configured. Please add OPENAI_API_KEY to your .env file.',
					setup_required: true
				},
				{ status: 500 }
			);
		}

		// Initialize OpenAI with the API key
		const openai = new OpenAI({
			apiKey: OPENAI_API_KEY
		});

		const { messages, patientInfo } = await request.json();

		if (!messages || !Array.isArray(messages)) {
			return json({ error: 'Invalid request: messages array required' }, { status: 400 });
		}

		// Build conversation context
		const conversationMessages: Message[] = [
			{
				role: 'system',
				content: SYSTEM_PROMPT
			}
		];

		// Add patient context if available
		if (patientInfo) {
			conversationMessages.push({
				role: 'system',
				content: `Patient Information: Name: ${patientInfo.name}, Age: ${patientInfo.age}, Gender: ${patientInfo.gender}, Location: ${patientInfo.village || 'Not provided'}`
			});
		}

		// Add conversation history
		conversationMessages.push(...messages);

		// Call OpenAI API
		const completion = await openai.chat.completions.create({
			model: 'gpt-4o-mini',
			messages: conversationMessages,
			temperature: 0.7,
			max_tokens: 500,
			response_format: { type: 'text' } // Allow both text and JSON
		});

		const aiResponse = completion.choices[0].message.content || '';

		// Check if AI provided an assessment (JSON response)
		let assessmentComplete = false;
		let assessment = null;

		try {
			// Try to extract JSON from response
			const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
			if (jsonMatch) {
				const parsedAssessment = JSON.parse(jsonMatch[0]);
				if (parsedAssessment.assessment_complete) {
					assessmentComplete = true;
					assessment = parsedAssessment;
				}
			}
		} catch (e) {
			// Not JSON, continue with text response
		}

		return json({
			success: true,
			message: aiResponse,
			assessment_complete: assessmentComplete,
			assessment: assessment,
			tokens_used: completion.usage?.total_tokens || 0
		});

	} catch (error: any) {
		console.error('OpenAI API Error:', error);
		
		if (error.code === 'insufficient_quota') {
			return json(
				{ 
					error: 'OpenAI API quota exceeded. Please check your billing or upgrade your plan.',
					quota_error: true
				},
				{ status: 429 }
			);
		}

		if (error.code === 'invalid_api_key') {
			return json(
				{ 
					error: 'Invalid OpenAI API key. Please check your OPENAI_API_KEY in .env file.',
					auth_error: true
				},
				{ status: 401 }
			);
		}

		return json(
			{ 
				error: error.message || 'Failed to process AI request',
				details: error.toString()
			},
			{ status: 500 }
		);
	}
};
