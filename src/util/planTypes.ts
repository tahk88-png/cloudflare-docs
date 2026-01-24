/**
 * Plan availability value types
 * Can be a boolean, number, or string describing the feature availability
 */
export type PlanValue = boolean | number | string;

/**
 * Feature property describing availability across different plan tiers
 */
export interface FeatureProperty {
	title: string;
	summary?: string;
	free?: PlanValue;
	lite?: PlanValue;
	pro?: PlanValue;
	pro_plus?: PlanValue;
	biz?: PlanValue;
	ent?: PlanValue;
	ent_plus?: PlanValue;
}

/**
 * Feature with title, optional link, and properties
 */
export interface Feature {
	title: string;
	link?: string;
	properties: Record<string, FeatureProperty>;
}

/**
 * Plan category containing multiple features
 */
export interface PlanCategory {
	title: string;
	link?: string;
	ent_plus?: string; // Custom label for Enterprise Plus tier
	properties?: Record<string, FeatureProperty>;
	[key: string]: Feature | string | Record<string, FeatureProperty> | undefined;
}

/**
 * Root plans structure
 */
export type PlansData = Record<string, PlanCategory>;
