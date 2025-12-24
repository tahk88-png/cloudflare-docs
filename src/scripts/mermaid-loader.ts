// Lazy-load Mermaid only on pages that include Mermaid diagrams.
if (document.querySelector("pre.mermaid")) {
	import("./mermaid")
		.then(({ initMermaid }) => initMermaid())
		.catch(() => {
			// Best-effort: avoid breaking page rendering if Mermaid fails to load.
		});
}

