import { prisma } from '@/lib/db/prisma';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

async function getCompartments() {
  return prisma.compartment.findMany({
    include: {
      locker: {
        select: { name: true, locationText: true },
      },
      product: {
        select: { name: true },
      },
    },
    orderBy: [
      { locker: { name: 'asc' } },
      { label: 'asc' },
    ],
  });
}

export default async function CompartmentsPage() {
  const compartments = await getCompartments();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Compartments</h1>
        <p className="text-muted-foreground">
          Manage locker compartments and product assignments
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Locker</TableHead>
                  <TableHead>Label</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {compartments.map((compartment) => (
                  <TableRow key={compartment.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{compartment.locker.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {compartment.locker.locationText}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{compartment.label}</Badge>
                    </TableCell>
                    <TableCell>
                      {compartment.product ? (
                        compartment.product.name
                      ) : (
                        <span className="text-muted-foreground">No product assigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={compartment.active ? 'default' : 'outline'}>
                        {compartment.active ? 'Active' : 'Maintenance'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {compartment.notes || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
