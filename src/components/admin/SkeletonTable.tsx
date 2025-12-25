import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function SkeletonTable() {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
             {[1, 2, 3, 4, 5].map((i) => (
                <TableHead key={i}><Skeleton className="h-4 w-[100px]" /></TableHead>
             ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {[1, 2, 3, 4, 5].map((i) => (
            <TableRow key={i}>
              {[1, 2, 3, 4, 5].map((j) => (
                <TableCell key={j}><Skeleton className="h-4 w-[100px]" /></TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
