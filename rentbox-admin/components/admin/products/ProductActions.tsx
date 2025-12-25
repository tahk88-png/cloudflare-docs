'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit, Trash2, Power } from 'lucide-react';
import { toggleProductActive, deleteProduct } from '@/lib/actions/products';
import { toast } from 'sonner';

interface ProductActionsProps {
  product: {
    id: string;
    name: string;
    active: boolean;
  };
}

export function ProductActions({ product }: ProductActionsProps) {
  const [loading, setLoading] = useState(false);

  const handleToggleActive = async () => {
    setLoading(true);
    const result = await toggleProductActive(product.id);
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`Product ${result.product?.active ? 'activated' : 'deactivated'}`);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${product.name}"?`)) return;

    setLoading(true);
    const result = await deleteProduct(product.id);
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Product deleted');
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" disabled={loading}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleToggleActive}>
          <Power className="mr-2 h-4 w-4" />
          {product.active ? 'Deactivate' : 'Activate'}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleDelete} className="text-destructive">
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
