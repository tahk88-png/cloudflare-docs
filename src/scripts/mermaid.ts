function getMermaidTheme() {
	return document.documentElement.getAttribute("data-theme") === "light"
		? "neutral"
		: "dark";
}

let mermaidSingleton: (typeof import("mermaid"))["default"] | undefined;
let observersInitialized = false;
let intersectionObserver: IntersectionObserver | undefined;
let themeObserver: MutationObserver | undefined;

async function renderDiagram(
	mermaid: (typeof import("mermaid"))["default"],
	diagram: HTMLPreElement,
) {
	// Cache the original diagram source so we can re-render on theme changes.
	if (!diagram.getAttribute("data-diagram")) {
		diagram.setAttribute("data-diagram", diagram.textContent ?? "");
	}

	const def = diagram.getAttribute("data-diagram") ?? "";
	if (!def.trim()) return;

	mermaid.initialize({ startOnLoad: false, theme: getMermaidTheme() });
	const { svg } = await mermaid.render(`mermaid-${crypto.randomUUID()}`, def);
	diagram.innerHTML = svg;
	diagram.setAttribute("data-processed", "true");
}

function getUnprocessedDiagrams() {
	return Array.from(
		document.querySelectorAll<HTMLPreElement>('pre.mermaid:not([data-processed="true"])'),
	);
}

export async function initMermaid() {
	if (!mermaidSingleton) {
		const { default: mermaid } = await import("mermaid");
		mermaidSingleton = mermaid;
	}
	const mermaid = mermaidSingleton;

	// Render diagrams lazily as they enter the viewport.
	const renderIfNeeded = async (diagram: HTMLPreElement) => {
		if (diagram.getAttribute("data-processed") === "true") return;
		await renderDiagram(mermaid, diagram);
	};

	if (!observersInitialized) {
		observersInitialized = true;

		if ("IntersectionObserver" in window) {
			intersectionObserver = new IntersectionObserver((entries) => {
				for (const entry of entries) {
					if (!entry.isIntersecting) continue;
					const diagram = entry.target as HTMLPreElement;
					void renderIfNeeded(diagram);
					intersectionObserver?.unobserve(diagram);
				}
			});
		}

		// Re-render processed diagrams on theme changes.
		themeObserver = new MutationObserver(() => {
			const processed = Array.from(
				document.querySelectorAll<HTMLPreElement>(
					'pre.mermaid[data-processed="true"]',
				),
			);
			for (const diagram of processed) {
				diagram.removeAttribute("data-processed");
			}
			for (const diagram of getUnprocessedDiagrams()) {
				void renderIfNeeded(diagram);
			}
		});

		themeObserver.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ["data-theme"],
		});
	}

	// Always (re-)scan in case client-side navigation introduced new diagrams.
	if (intersectionObserver) {
		for (const diagram of getUnprocessedDiagrams()) {
			intersectionObserver.observe(diagram);
		}
	} else {
		// Fallback: render all.
		await Promise.all(getUnprocessedDiagrams().map((diagram) => renderIfNeeded(diagram)));
	}
}
