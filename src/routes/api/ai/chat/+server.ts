import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import OpenAI from 'openai';
import { OPENAI_API_KEY } from '$env/static/private';

const SYSTEM_PROMPT = `You are an AI Health Assistant helping Community Health Workers (CHWs) in rural India assess patients. Your role is to:

1. Ask relevant medical questions based on patient symptoms
2. Gather critical information efficiently (limit follow-up questions to 5-6 max)
3. Assess the severity and urgency of the condition ACCURATELY
4. Provide a risk score (0-100) and priority level

IMPORTANT GUIDELINES:
- Be empathetic and professional
- Ask clear, simple questions that CHWs can understand
- Focus on RED FLAG symptoms: chest pain, breathing difficulty, unconsciousness, severe bleeding, seizures
- Consider vital signs: fever >103°F, very high/low blood pressure, irregular heartbeat
- Keep questions focused and relevant
- BE CONSERVATIVE with risk scores - don't over-escalate minor conditions
- After gathering sufficient information (5-6 questions max), provide your assessment

RISK SCORING CALIBRATION (Be accurate and conservative):

**CRITICAL (76-100, Priority 5) - EMERGENCY:**
- Unconsciousness, seizures, or severe altered mental state
- Severe breathing difficulty (cannot speak full sentences)
- Severe chest pain with radiation to arm/jaw
- Severe bleeding (uncontrolled, heavy)
- Signs of stroke (FAST: Face drooping, Arm weakness, Speech difficulty)
- Fever >105°F with confusion
→ Escalate to CLINICIAN immediately

**HIGH (51-75, Priority 4) - URGENT:**
- Chest pain (mild to moderate)
- Moderate breathing difficulty
- High fever (103-105°F) with severe symptoms
- Persistent vomiting/diarrhea with dehydration signs
- Severe abdominal pain
- Signs of sepsis or severe infection
→ Escalate to CLINICIAN

**MEDIUM (31-50, Priority 3) - NEEDS ATTENTION:**
- Moderate fever (101-103°F) lasting 2-3 days
- Mild breathing issues with productive cough
- Moderate pain (manageable but persistent)
- Vomiting/diarrhea without severe dehydration
- Skin infections or rashes spreading
→ Escalate to ASHA

**LOW (0-30, Priority 1-2) - MINOR:**
- Mild fever (<101°F) for 1-2 days
- Common cold symptoms (runny nose, mild cough)
- Minor headache or body ache
- Mild viral fever (low-grade, no complications)
- Minor cuts, bruises, or sprains
- Early-stage cough/cold
→ No escalation, home care advice

EXAMPLES:
- "Mild viral fever, 100°F, 1 day" = 15-25 (LOW)
- "Fever 102°F, 3 days, body ache" = 35-45 (MEDIUM)
- "Fever 104°F, severe headache, vomiting" = 55-65 (HIGH)
- "Chest pain, sweating, difficulty breathing" = 80-95 (CRITICAL)

When you have enough information to make an assessment, respond with a JSON object in this format:
{
  "assessment_complete": true,
  "risk_score": 25,
  "priority": 2,
  "risk_level": "LOW",
  "symptoms": ["mild fever", "body ache"],
  "recommendations": "Rest, fluids, paracetamol. Monitor for 24-48 hours. Seek care if worsens.",
  "needs_escalation": false,
  "escalate_to": ""
}

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

		if (assessmentComplete && assessment) {
			// Return structured assessment
			return json({
				success: true,
				message: aiResponse,
				assessment_complete: true,
				assessment: {
					priority: assessment.priority || 0,
					risk_level: assessment.risk_level || 'LOW',
					risk_score: assessment.risk_score || 0,
					symptoms: assessment.symptoms || [],
					recommendations: assessment.recommendations || '',
					needs_escalation: assessment.needs_escalation || false,
					escalate_to: assessment.escalate_to || '',
					summary: assessment.summary || aiResponse
				},
				tokens_used: completion.usage?.total_tokens || 0
			});
		}

		// Return conversational message
		return json({
			success: true,
			message: aiResponse,
			assessment_complete: false,
			assessment: null,
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
