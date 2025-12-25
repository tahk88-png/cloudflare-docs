import * as React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export type ColumnDef<T> = {
	key: string;
	header: string;
	cell: (row: T) => React.ReactNode;
	className?: string;
};

export function DataTable<T>({
	columns,
	rows,
	empty,
}: {
	columns: ColumnDef<T>[];
	rows: T[];
	empty?: React.ReactNode;
}) {
	if (rows.length === 0) {
		return empty ?? null;
	}

	return (
		<Table>
			<TableHeader>
				<TableRow>
					{columns.map((c) => (
						<TableHead key={c.key} className={c.className}>
							{c.header}
						</TableHead>
					))}
				</TableRow>
			</TableHeader>
			<TableBody>
				{rows.map((row, i) => (
					<TableRow key={i}>
						{columns.map((c) => (
							<TableCell key={c.key} className={c.className}>
								{c.cell(row)}
							</TableCell>
						))}
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}

