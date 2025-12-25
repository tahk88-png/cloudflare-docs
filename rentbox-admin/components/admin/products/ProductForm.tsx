'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { createProduct } from '@/lib/actions/products';
import { toast } from 'sonner';
import { PriceUnit } from '@prisma/client';

interface ProductFormProps {
  onSuccess?: () => void;
}

export function ProductForm({ onSuccess }: ProductFormProps) {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    shortDescription: '',
    description: '',
    categoryId: '',
    basePrice: '',
    priceUnit: PriceUnit.DAY,
    slotMinutes: '15',
    minRentalMinutes: '60',
    maxRentalMinutes: '',
    active: true,
  });

  useEffect(() => {
    fetch('/api/admin/categories')
      .then(res => res.json())
      .then(data => setCategories(data.categories || []));
  }, []);

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  };

  const handleNameChange = (name: string) => {
    setFormData(prev => ({
      ...prev,
      name,
      slug: generateSlug(name),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    const result = await createProduct({
      ...formData,
      basePrice: parseFloat(formData.basePrice),
      slotMinutes: parseInt(formData.slotMinutes),
      minRentalMinutes: parseInt(formData.minRentalMinutes),
      maxRentalMinutes: formData.maxRentalMinutes ? parseInt(formData.maxRentalMinutes) : null,
    });
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Product created successfully');
      onSuccess?.();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => handleNameChange(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="slug">Slug *</Label>
        <Input
          id="slug"
          value={formData.slug}
          onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="category">Category *</Label>
        <Select
          value={formData.categoryId}
          onValueChange={(value) => setFormData(prev => ({ ...prev, categoryId: value }))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="shortDescription">Short Description</Label>
        <Input
          id="shortDescription"
          value={formData.shortDescription}
          onChange={(e) => setFormData(prev => ({ ...prev, shortDescription: e.target.value }))}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          rows={4}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="basePrice">Base Price (€) *</Label>
          <Input
            id="basePrice"
            type="number"
            step="0.01"
            value={formData.basePrice}
            onChange={(e) => setFormData(prev => ({ ...prev, basePrice: e.target.value }))}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="priceUnit">Price Unit</Label>
          <Select
            value={formData.priceUnit}
            onValueChange={(value) => setFormData(prev => ({ ...prev, priceUnit: value as PriceUnit }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={PriceUnit.HOUR}>Hour</SelectItem>
              <SelectItem value={PriceUnit.DAY}>Day</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="slotMinutes">Slot Minutes</Label>
          <Input
            id="slotMinutes"
            type="number"
            value={formData.slotMinutes}
            onChange={(e) => setFormData(prev => ({ ...prev, slotMinutes: e.target.value }))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="minRentalMinutes">Min Rental (min)</Label>
          <Input
            id="minRentalMinutes"
            type="number"
            value={formData.minRentalMinutes}
            onChange={(e) => setFormData(prev => ({ ...prev, minRentalMinutes: e.target.value }))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="maxRentalMinutes">Max Rental (min)</Label>
          <Input
            id="maxRentalMinutes"
            type="number"
            value={formData.maxRentalMinutes}
            onChange={(e) => setFormData(prev => ({ ...prev, maxRentalMinutes: e.target.value }))}
          />
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="active"
          checked={formData.active}
          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, active: checked }))}
        />
        <Label htmlFor="active">Active</Label>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create Product'}
        </Button>
      </div>
    </form>
  );
}
