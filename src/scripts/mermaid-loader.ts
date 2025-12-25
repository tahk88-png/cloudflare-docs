// Lazy-load Mermaid only on pages that include Mermaid diagrams.
//
// Important: Starlight/Astro can perform client-side navigations. This loader
// must re-check after swaps so Mermaid diagrams render on navigated pages too.

let mermaidInitPromise: Promise<void> | undefined;

function maybeInitMermaid() {
	if (!document.querySelector("pre.mermaid")) return;

	mermaidInitPromise ??= import("./mermaid")
		.then(({ initMermaid }) => initMermaid())
		.catch(() => {
			// Best-effort: avoid breaking page rendering if Mermaid fails to load.
		});
}

maybeInitMermaid();
window.addEventListener("astro:page-load", maybeInitMermaid);
window.addEventListener("astro:after-swap", maybeInitMermaid);

