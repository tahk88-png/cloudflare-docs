// AI prompt templates for text improvement

export interface AIImprovementOptions {
	action:
		| "improve-clarity"
		| "shorten"
		| "make-persuasive"
		| "make-friendly"
		| "make-professional"
		| "fix-grammar"
		| "improve-cta"
		| "highlight-offer";
	tone?: string;
	targetAudience?: string;
	locale?: string;
}

export function buildAIPrompt(
	text: string,
	options: AIImprovementOptions,
): string {
	if (!text || !text.trim()) {
		throw new Error("Text to improve cannot be empty");
	}
	const actionPrompts: Record<string, string> = {
		"improve-clarity":
			"Improve clarity and readability while preserving the original meaning.",
		shorten:
			"Make the text more concise while preserving all key information and meaning.",
		"make-persuasive":
			"Make the text more persuasive and compelling, focusing on benefits and value.",
		"make-friendly":
			"Make the text more friendly, approachable, and conversational.",
		"make-professional":
			"Make the text more professional and formal, suitable for business communication.",
		"fix-grammar":
			"Fix grammar, spelling, and punctuation errors. Ensure proper language usage.",
		"improve-cta":
			"Improve the call-to-action to be more effective and compelling.",
		"highlight-offer":
			"Better highlight the offer or value proposition to make it stand out.",
	};

	const prompt = `
You are a professional email copywriter specializing in business communication.

Task: ${actionPrompts[options.action] || "Improve the text"}

${options.tone ? `Tone: ${options.tone}` : ""}
${options.targetAudience ? `Target audience: ${options.targetAudience}` : ""}
${options.locale === "et" ? "Language: Estonian (Eesti keel)" : "Language: English"}

Rules:
- Preserve the original meaning completely
- Avoid spam language and marketing gimmicks
- Avoid false promises or exaggerated claims
- Keep it professional and trustworthy
- Maintain the same language as the original text
- Respect Estonian language conventions if the text is in Estonian
- Focus on clarity and value, not manipulation

Text to improve:
${text}

Return only the improved text, maintaining the same structure and format.
`;

	return prompt;
}

// AI service integration
export async function callAI(
	prompt: string,
	apiKey: string,
	env?: { OPENAI_API_KEY?: string; ANTHROPIC_API_KEY?: string },
): Promise<string> {
	// Try OpenAI first if key is available
	if (env?.OPENAI_API_KEY || apiKey === env?.OPENAI_API_KEY) {
		try {
			return await callOpenAI(prompt, env?.OPENAI_API_KEY || apiKey);
		} catch (error) {
			console.error("OpenAI call failed:", error);
			// Fall through to Anthropic or mock
		}
	}

	// Try Anthropic if key is available
	if (env?.ANTHROPIC_API_KEY || apiKey === env?.ANTHROPIC_API_KEY) {
		try {
			return await callAnthropic(prompt, env?.ANTHROPIC_API_KEY || apiKey);
		} catch (error) {
			console.error("Anthropic call failed:", error);
			// Fall through to mock
		}
	}

	// Fallback: return improved version of input text
	// This is a simple mock - in production, always use a real AI service
	const textToImprove = prompt.split("\n\nText to improve:\n")[1] || prompt;
	return improveTextMock(textToImprove);
}

async function callOpenAI(prompt: string, apiKey: string): Promise<string> {
	const response = await fetch("https://api.openai.com/v1/chat/completions", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${apiKey}`,
		},
		body: JSON.stringify({
			model: "gpt-4o-mini", // Using cheaper model, can be changed to gpt-4
			messages: [
				{
					role: "system",
					content:
						"You are a professional email copywriter. Return only the improved text, maintaining the same structure.",
				},
				{
					role: "user",
					content: prompt,
				},
			],
			temperature: 0.7,
			max_tokens: 2000,
		}),
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`OpenAI API error: ${error}`);
	}

	const data = await response.json();
	return data.choices[0]?.message?.content || "";
}

async function callAnthropic(prompt: string, apiKey: string): Promise<string> {
	const response = await fetch("https://api.anthropic.com/v1/messages", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"x-api-key": apiKey,
			"anthropic-version": "2023-06-01",
		},
		body: JSON.stringify({
			model: "claude-3-5-sonnet-20241022",
			max_tokens: 2000,
			messages: [
				{
					role: "user",
					content: prompt,
				},
			],
		}),
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Anthropic API error: ${error}`);
	}

	const data = await response.json();
	return data.content[0]?.text || "";
}

// Simple mock improvement for development/testing
function improveTextMock(text: string): string {
	// Basic improvements without AI
	return text
		.split("\n\n")
		.map((paragraph) => {
			// Capitalize first letter
			if (paragraph.length > 0) {
				paragraph =
					paragraph.charAt(0).toUpperCase() + paragraph.slice(1);
			}
			// Ensure proper punctuation
			if (paragraph.length > 0 && !paragraph.match(/[.!?]$/)) {
				paragraph += ".";
			}
			return paragraph;
		})
		.join("\n\n");
}
