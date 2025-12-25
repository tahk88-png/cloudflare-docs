/**
 * AI Prompt Templates
 * 
 * Structured prompts for text improvement that preserve user intent
 * and avoid marketing hype
 */

import type {
	AITextAction,
	Tone,
	LengthPreference,
	TargetAudience,
} from "./types";

const BASE_INSTRUCTIONS = `
You are a professional content editor helping improve business content.
Your goal is to enhance clarity, readability, and effectiveness while preserving the original meaning and intent.

CRITICAL RULES:
- Preserve the original meaning completely
- No exaggeration or false claims
- No spam or sales-guru language
- No emojis unless explicitly requested
- Use clear, readable sentences
- Maintain the user's voice and intent
- Never add marketing hype or buzzwords
- Be honest and trustworthy in tone
`;

function getToneInstructions(tone?: Tone): string {
	switch (tone) {
		case "professional":
			return "Use a formal, business-appropriate tone. Professional but not overly stiff.";
		case "friendly":
			return "Use a warm, approachable tone. Conversational but still professional.";
		case "confident":
			return "Use a confident, assertive tone. Clear and direct without being pushy.";
		case "short-direct":
			return "Use concise, direct language. Get to the point quickly.";
		case "neutral":
		default:
			return "Use a neutral, clear tone. Balanced and informative.";
	}
}

function getLengthInstructions(length?: LengthPreference): string {
	switch (length) {
		case "shorter":
			return "Make the text significantly shorter while preserving all key information.";
		case "longer":
			return "Expand the text with more detail and context while staying relevant.";
		case "same":
		default:
			return "Maintain approximately the same length as the original.";
	}
}

function getAudienceInstructions(audience?: TargetAudience): string {
	switch (audience) {
		case "private-customer":
			return "Write for individual consumers. Use accessible language and focus on personal benefits.";
		case "business-customer":
			return "Write for business decision-makers. Use professional language and focus on business value.";
		case "existing-user":
			return "Write for users who already know your product. You can use more specific terminology.";
		case "new-lead":
			return "Write for people who are new to your product. Use clear explanations and avoid jargon.";
		default:
			return "Write for a general audience. Use clear, accessible language.";
	}
}

function getActionInstructions(action: AITextAction): string {
	switch (action) {
		case "improve-clarity":
			return "Improve clarity and readability. Make sentences clearer and easier to understand. Fix any confusing phrasing.";
		case "shorten":
			return "Make the text shorter and more concise. Remove unnecessary words while keeping all essential information.";
		case "expand":
			return "Expand the text with more detail, examples, or context. Add helpful information that supports the main message.";
		case "make-professional":
			return "Make the tone more professional and business-appropriate. Use formal language where appropriate.";
		case "make-friendly":
			return "Make the tone warmer and more friendly. Use conversational language while staying professional.";
		case "make-persuasive":
			return "Make the text more persuasive by highlighting benefits and value. Be honest and avoid manipulation.";
		case "fix-grammar":
			return "Fix all grammar, spelling, and punctuation errors. Ensure proper sentence structure.";
		case "improve-cta":
			return "Improve the call-to-action to be clearer and more compelling. Make it specific and action-oriented.";
		case "highlight-key-message":
			return "Emphasize the key message or main point. Make it stand out while keeping the text natural.";
		case "simplify-language":
			return "Simplify the language. Replace complex words with simpler alternatives. Make it easier to understand.";
		default:
			return "Improve the text quality while preserving meaning.";
	}
}

export interface AIPromptParams {
	text: string;
	action: AITextAction;
	tone?: Tone;
	length?: LengthPreference;
	targetAudience?: TargetAudience;
	language: string;
}

export function buildAIPrompt(params: AIPromptParams): string {
	const {
		text,
		action,
		tone,
		length,
		targetAudience,
		language,
	} = params;

	const instructions = [
		BASE_INSTRUCTIONS,
		getActionInstructions(action),
		getToneInstructions(tone),
		getLengthInstructions(length),
		getAudienceInstructions(targetAudience),
		`\nLanguage: ${language}`,
		`\nOriginal text:\n${text}`,
		`\n\nPlease provide:\n1. The improved text\n2. A brief summary of what changed (1-2 sentences)`,
	].join("\n\n");

	return instructions;
}

/**
 * Prompt for suggesting media placement
 */
export function buildMediaSuggestionPrompt(
	context: string,
	blockType: string,
): string {
	return `
You are analyzing content to suggest where images or videos would improve clarity and engagement.

Context: ${context}
Block type: ${blockType}

Consider:
- Would a visual aid help explain this concept?
- Is there a product, process, or result that could be shown?
- Would a video demonstration be helpful here?

Provide a brief suggestion (1-2 sentences) if media would be beneficial, or "No media needed" if not.
Be specific about what type of media and why it would help.
`.trim();
}

/**
 * Prompt for generating image captions
 */
export function buildCaptionPrompt(imageContext: string, language: string): string {
	return `
Generate a concise, descriptive caption for an image used in business content.

Context: ${imageContext}
Language: ${language}

Requirements:
- 1-2 sentences maximum
- Descriptive and helpful
- No marketing hype
- Clear and professional
`.trim();
}
