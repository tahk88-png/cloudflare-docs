export function renderTemplate(
	template: string,
	vars: Record<string, string>,
) {
	return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, key) => {
		const v = vars[key];
		return v ?? "";
	});
}

