import { useEffect, useState } from "react";
import ReactSelect from "./ReactSelect";
import { formatDistance } from "date-fns";

type ResourcesData = string;

type Resource = {
	id: string;
	href: string;
	title: string;
	description?: string;
	updated?: string;
	filterableValues?: string[];
};

interface Props {
	resources: Resource[];
	facets: Record<string, string[]>;
	filters?: ResourcesData[];
	columns: number;
	showDescriptions: boolean;
	showLastUpdated: boolean;
}

export default function ResourcesBySelector({
	resources,
	facets,
	filters,
	columns,
	showDescriptions,
	showLastUpdated,
}: Props) {
	const [selectedFilter, setSelectedFilter] = useState<string | null>(null);

	const timeAgo = (date?: Date) => {
		if (!date) return undefined;
		return formatDistance(date, new Date(), { addSuffix: true });
	};

	const handleFilterChange = (option: any) => {
		setSelectedFilter(option?.value || null);
	};

	const options = Object.entries(facets).map(([key, values]) => ({
		label: key,
		options: values.map((v) => ({
			value: v,
			label: v,
		})),
	}));

	const visibleResources = resources.filter((resource) => {
		if (!selectedFilter || !filters) return true;
		return (resource.filterableValues ?? []).includes(selectedFilter);
	});

	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		const value = params.get("filters");

		if (value) {
			setSelectedFilter(value);
		}
	}, []);

	return (
		<div>
			{filters && (
				<div className="not-content">
					<ReactSelect
						className="mt-2"
						value={
							selectedFilter
								? { value: selectedFilter, label: selectedFilter }
								: null
						}
						options={options}
						onChange={handleFilterChange}
						isClearable
						placeholder="Filter resources..."
					/>
				</div>
			)}

			<div
				className={`grid ${columns === 2 ? "md:grid-cols-2" : "md:grid-cols-3"} grid-cols-1 gap-4`}
			>
				{visibleResources.map((page) => {
					return (
						<a
							key={page.id}
							href={page.href}
							className="flex flex-col gap-2 rounded-sm border border-solid border-gray-200 p-6 text-black no-underline hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
						>
							<p className="decoration-accent underline decoration-2 underline-offset-4">
								{page.title}
							</p>
							{showDescriptions && (
								<span className="line-clamp-3" title={page.description}>
									{page.description}
								</span>
							)}
							{showLastUpdated && (
								<span className="line-clamp-3" title={page.description}>
									Updated{" "}
									{timeAgo(page.updated ? new Date(page.updated) : undefined)}
								</span>
							)}
						</a>
					);
				})}
			</div>
		</div>
	);
}
