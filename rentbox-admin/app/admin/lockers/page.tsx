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

async function getLockers() {
  return prisma.locker.findMany({
    include: {
      _count: {
        select: { compartments: true },
      },
    },
    orderBy: { name: 'asc' },
  });
}

export default async function LockersPage() {
  const lockers = await getLockers();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Lockers</h1>
        <p className="text-muted-foreground">
          Manage locker locations
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Timezone</TableHead>
                  <TableHead>Compartments</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lockers.map((locker) => (
                  <TableRow key={locker.id}>
                    <TableCell className="font-medium">{locker.name}</TableCell>
                    <TableCell>{locker.locationText}</TableCell>
                    <TableCell className="text-muted-foreground">{locker.timezone}</TableCell>
                    <TableCell>{locker._count.compartments}</TableCell>
                    <TableCell>
                      <Badge variant={locker.active ? 'default' : 'outline'}>
                        {locker.active ? 'Active' : 'Inactive'}
                      </Badge>
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
