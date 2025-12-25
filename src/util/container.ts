import { experimental_AstroContainer } from "astro/container";
import reactRenderer from "@astrojs/react/server.js";
import mdxRenderer from "@astrojs/mdx/server.js";
import { render, type CollectionEntry } from "astro:content";
import type { AstroComponentFactory } from "astro/runtime/server/index.js";
import type { AstroGlobal } from "astro";

// `@astrojs/react/server` declares its renderer functions with an explicit `this: RendererContext`.
// Astro's container API expects renderer methods without that explicit `this` annotation.
// This wrapper preserves runtime behavior while satisfying the container's typing.
const reactRendererForContainer = {
	...reactRenderer,
	check(Component: unknown, props: Record<string, unknown>, children: unknown) {
		return (reactRenderer as any).check.call(this, Component, props, children);
	},
	renderToStaticMarkup(
		Component: unknown,
		props: Record<string, unknown>,
		slots: Record<string, unknown>,
		metadata: unknown,
	) {
		return (reactRenderer as any).renderToStaticMarkup.call(
			this,
			Component,
			props,
			slots,
			metadata,
		);
	},
};

export async function entryToString(
	entry: CollectionEntry<"docs" | "changelog">,
	locals: AstroGlobal["locals"],
) {
	if (entry.rendered?.html) {
		return entry.rendered.html;
	}

	const container = await experimental_AstroContainer.create({});
	container.addServerRenderer({ renderer: mdxRenderer });
	container.addServerRenderer({ renderer: reactRendererForContainer });

	const { Content } = await render(entry);

	const html = await container.renderToString(Content, {
		params: { slug: entry.id },
		locals,
	});

	return html;
}

export async function componentToString(
	component: AstroComponentFactory,
	props: Record<string, unknown>,
) {
	const container = await experimental_AstroContainer.create({});
	container.addServerRenderer({ renderer: mdxRenderer });
	container.addServerRenderer({ renderer: reactRendererForContainer });

	const html = await container.renderToString(component, {
		props,
	});

	return html;
}
