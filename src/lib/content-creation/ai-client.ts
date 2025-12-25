/**
 * AI Client Integration
 * 
 * Handles communication with AI services (OpenAI, Anthropic, etc.)
 * Adapt this to your preferred AI provider
 */

import { buildAIPrompt } from "./ai-prompts";
import type {
	ImproveTextRequest,
	ImproveTextResponse,
	SuggestMediaPlacementRequest,
	SuggestMediaPlacementResponse,
} from "./types";

export interface AIConfig {
	apiKey: string;
	model?: string;
	baseUrl?: string;
}

/**
 * Call AI service to improve text
 */
export async function improveText(
	request: ImproveTextRequest,
	config: AIConfig,
): Promise<ImproveTextResponse> {
	const prompt = buildAIPrompt({
		text: request.text,
		action: request.action,
		tone: request.tone,
		length: request.length,
		targetAudience: request.targetAudience,
		language: request.language,
	});

	// Example using OpenAI-compatible API
	// Adapt this to your AI provider
	const response = await fetch(config.baseUrl || "https://api.openai.com/v1/chat/completions", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${config.apiKey}`,
		},
		body: JSON.stringify({
			model: config.model || "gpt-4o-mini",
			messages: [
				{
					role: "system",
					content: "You are a professional content editor. Always respond with valid JSON containing 'improvedText' and 'changeSummary' fields.",
				},
				{
					role: "user",
					content: prompt,
				},
			],
			response_format: { type: "json_object" },
			temperature: 0.7,
		}),
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`AI API error: ${error}`);
	}

	const data = await response.json();
	const content = data.choices[0]?.message?.content;

	if (!content) {
		throw new Error("No response from AI");
	}

	try {
		const parsed = JSON.parse(content);
		return {
			improvedText: parsed.improvedText || request.text,
			changeSummary: parsed.changeSummary || "Text was improved.",
		};
	} catch {
		// Fallback: treat entire response as improved text
		return {
			improvedText: content,
			changeSummary: "Text was improved by AI.",
		};
	}
}

/**
 * Suggest media placement
 */
export async function suggestMediaPlacement(
	request: SuggestMediaPlacementRequest,
	config: AIConfig,
): Promise<SuggestMediaPlacementResponse> {
	const prompt = `
Analyze this content block and suggest if an image or video would improve clarity.

Context: ${request.context}

Provide a brief suggestion (1-2 sentences) if media would be beneficial.
`.trim();

	const response = await fetch(config.baseUrl || "https://api.openai.com/v1/chat/completions", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${config.apiKey}`,
		},
		body: JSON.stringify({
			model: config.model || "gpt-4o-mini",
			messages: [
				{
					role: "system",
					content: "You are a content strategist. Provide brief, actionable suggestions.",
				},
				{
					role: "user",
					content: prompt,
				},
			],
			temperature: 0.5,
			max_tokens: 150,
		}),
	});

	if (!response.ok) {
		return {
			suggestion: "Consider adding an image or video if it would help explain the concept.",
		};
	}

	const data = await response.json();
	const suggestion = data.choices[0]?.message?.content || "";

	return {
		suggestion: suggestion.trim() || "No specific media suggestion.",
	};
}

/**
 * Generate image caption
 */
export async function generateCaption(
	imageContext: string,
	language: string,
	config: AIConfig,
): Promise<string> {
	const prompt = `
Generate a concise, descriptive caption (1-2 sentences) for an image in business content.

Context: ${imageContext}
Language: ${language}

Requirements: Descriptive, helpful, no marketing hype, clear and professional.
`.trim();

	const response = await fetch(config.baseUrl || "https://api.openai.com/v1/chat/completions", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${config.apiKey}`,
		},
		body: JSON.stringify({
			model: config.model || "gpt-4o-mini",
			messages: [
				{
					role: "system",
					content: "You are a professional content writer. Generate concise, helpful captions.",
				},
				{
					role: "user",
					content: prompt,
				},
			],
			temperature: 0.6,
			max_tokens: 100,
		}),
	});

	if (!response.ok) {
		return "";
	}

	const data = await response.json();
	return data.choices[0]?.message?.content?.trim() || "";
}
