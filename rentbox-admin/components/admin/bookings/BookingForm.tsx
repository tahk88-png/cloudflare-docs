'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createBooking } from '@/lib/actions/bookings';
import { toast } from 'sonner';
import { BookingStatus } from '@prisma/client';

interface BookingFormProps {
  onSuccess?: () => void;
}

export function BookingForm({ onSuccess }: BookingFormProps) {
  const [loading, setLoading] = useState(false);
  const [lockers, setLockers] = useState<any[]>([]);
  const [compartments, setCompartments] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  
  const [selectedLocker, setSelectedLocker] = useState('');
  const [selectedCompartment, setSelectedCompartment] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [status, setStatus] = useState<BookingStatus>(BookingStatus.PENDING);

  useEffect(() => {
    // Fetch lockers and products
    fetch('/api/admin/lockers')
      .then(res => res.json())
      .then(data => setLockers(data.lockers || []));

    fetch('/api/admin/products')
      .then(res => res.json())
      .then(data => setProducts(data.products || []));
  }, []);

  useEffect(() => {
    if (selectedLocker) {
      fetch(`/api/admin/compartments?lockerId=${selectedLocker}`)
        .then(res => res.json())
        .then(data => setCompartments(data.compartments || []));
    } else {
      setCompartments([]);
    }
  }, [selectedLocker]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCompartment || !selectedProduct || !startsAt || !endsAt) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    const result = await createBooking({
      compartmentId: selectedCompartment,
      productId: selectedProduct,
      startsAt: new Date(startsAt).toISOString(),
      endsAt: new Date(endsAt).toISOString(),
      status,
    });
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Booking created successfully');
      onSuccess?.();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="locker">Locker *</Label>
        <Select value={selectedLocker} onValueChange={setSelectedLocker}>
          <SelectTrigger>
            <SelectValue placeholder="Select locker" />
          </SelectTrigger>
          <SelectContent>
            {lockers.map((locker) => (
              <SelectItem key={locker.id} value={locker.id}>
                {locker.name} - {locker.locationText}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="compartment">Compartment *</Label>
        <Select
          value={selectedCompartment}
          onValueChange={setSelectedCompartment}
          disabled={!selectedLocker}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select compartment" />
          </SelectTrigger>
          <SelectContent>
            {compartments.map((compartment) => (
              <SelectItem key={compartment.id} value={compartment.id}>
                {compartment.label}
                {compartment.product && ` - ${compartment.product.name}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="product">Product *</Label>
        <Select value={selectedProduct} onValueChange={setSelectedProduct}>
          <SelectTrigger>
            <SelectValue placeholder="Select product" />
          </SelectTrigger>
          <SelectContent>
            {products.map((product) => (
              <SelectItem key={product.id} value={product.id}>
                {product.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startsAt">Start Date & Time *</Label>
          <Input
            id="startsAt"
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="endsAt">End Date & Time *</Label>
          <Input
            id="endsAt"
            type="datetime-local"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <Select
          value={status}
          onValueChange={(value) => setStatus(value as BookingStatus)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={BookingStatus.PENDING}>Pending</SelectItem>
            <SelectItem value={BookingStatus.CONFIRMED}>Confirmed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create Booking'}
        </Button>
      </div>
    </form>
  );
}
