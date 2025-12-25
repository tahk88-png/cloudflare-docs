'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface SettingsFormProps {
  settings: Record<string, string>;
}

export function SettingsForm({ settings }: SettingsFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    default_slot_minutes: settings.default_slot_minutes || '15',
    default_min_rental_minutes: settings.default_min_rental_minutes || '60',
    contact_email: settings.contact_email || 'info@rentbox.ee',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update settings');
      }

      toast.success('Settings updated successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="default_slot_minutes">Default Slot Duration (minutes)</Label>
        <Input
          id="default_slot_minutes"
          type="number"
          value={formData.default_slot_minutes}
          onChange={(e) => setFormData(prev => ({ ...prev, default_slot_minutes: e.target.value }))}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="default_min_rental_minutes">Default Min Rental Duration (minutes)</Label>
        <Input
          id="default_min_rental_minutes"
          type="number"
          value={formData.default_min_rental_minutes}
          onChange={(e) => setFormData(prev => ({ ...prev, default_min_rental_minutes: e.target.value }))}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="contact_email">Contact Email</Label>
        <Input
          id="contact_email"
          type="email"
          value={formData.contact_email}
          onChange={(e) => setFormData(prev => ({ ...prev, contact_email: e.target.value }))}
        />
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </form>
  );
}
