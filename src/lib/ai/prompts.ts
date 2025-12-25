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

// Example usage with OpenAI (replace with your AI provider)
export async function callAI(
	prompt: string,
	apiKey?: string,
): Promise<string> {
	// This is a placeholder - replace with actual AI API call
	// Example with OpenAI:
	/*
	const response = await fetch("https://api.openai.com/v1/chat/completions", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"Authorization": `Bearer ${apiKey}`,
		},
		body: JSON.stringify({
			model: "gpt-4",
			messages: [
				{
					role: "system",
					content: "You are a professional email copywriter.",
				},
				{
					role: "user",
					content: prompt,
				},
			],
			temperature: 0.7,
		}),
	});

	const data = await response.json();
	return data.choices[0].message.content;
	*/

	// Mock response for development
	return `[AI Improved] ${prompt.split("\n\nText to improve:\n")[1] || ""}`;
}
