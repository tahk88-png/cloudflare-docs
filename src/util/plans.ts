import { getEntry } from "astro:content";
import { getProperty } from "dot-prop";

export type PlanCellValue = string | number | boolean;

export type PlanTierKey =
	| "free"
	| "lite"
	| "pro"
	| "pro_plus"
	| "biz"
	| "ent"
	| "ent_plus";

export type PlanFeatureProperty = {
	title: string;
	summary?: string;
	link?: string;
} & Partial<Record<PlanTierKey, PlanCellValue>>;

export type PlanFeature = {
	title: string;
	link?: string;
	/**
	 * Optional label for the `ent_plus` tier, e.g. "Enterprise with add-on".
	 */
	ent_plus?: string;
	properties: Record<string, PlanFeatureProperty>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

export function isPlanFeature(value: unknown): value is PlanFeature {
	if (!isRecord(value)) return false;
	if (typeof value.title !== "string") return false;
	if (!isRecord(value.properties)) return false;
	return true;
}

/**
 * Returns all features within a plan "category" object (skipping metadata keys).
 */
export function getPlanCategoryFeatures(
	category: unknown,
): Array<[string, PlanFeature]> {
	if (!isRecord(category)) return [];

	return Object.entries(category).flatMap(([key, value]) => {
		if (key === "title" || key === "link") return [];
		if (!isPlanFeature(value)) return [];
		return [[key, value]];
	});
}

export async function indexPlans(id: string): Promise<unknown> {
	const entry = await getEntry("plans", "index");

	if (!entry) {
		throw new Error(`[IndexPlans] Failed to load plans JSON.`);
	}

	const plan = getProperty(entry.data, id);

	if (!plan) {
		throw new Error(`[IndexPlans] Failed to find ${id} in plans JSON.`);
	}

	return plan;
}
