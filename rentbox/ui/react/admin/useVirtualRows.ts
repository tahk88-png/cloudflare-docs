import * as React from "react";

export function useVirtualRows(params: { count: number; rowHeight: number; overscan?: number }) {
	const overscan = params.overscan ?? 6;
	const containerRef = React.useRef<HTMLDivElement | null>(null);
	const [scrollTop, setScrollTop] = React.useState(0);
	const [height, setHeight] = React.useState(600);

	React.useEffect(() => {
		const el = containerRef.current;
		if (!el) return;
		function onScroll() {
			// Read current element each time (avoids nullability complaints)
			const current = containerRef.current;
			if (!current) return;
			setScrollTop(current.scrollTop);
		}
		const ro = new ResizeObserver(() => setHeight(el.clientHeight));
		ro.observe(el);
		el.addEventListener("scroll", onScroll, { passive: true });
		return () => {
			ro.disconnect();
			el.removeEventListener("scroll", onScroll);
		};
	}, []);

	const startIndex = Math.max(0, Math.floor(scrollTop / params.rowHeight) - overscan);
	const endIndex = Math.min(params.count - 1, Math.floor((scrollTop + height) / params.rowHeight) + overscan);
	const offsetTop = startIndex * params.rowHeight;
	const visibleCount = Math.max(0, endIndex - startIndex + 1);

	return {
		containerRef,
		startIndex,
		endIndex,
		offsetTop,
		visibleCount,
		totalHeight: params.count * params.rowHeight,
	};
}

