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
import { BookingStatus } from '@prisma/client';
import { MoreHorizontal, CheckCircle, XCircle, Trash2, Clock } from 'lucide-react';
import { confirmBooking, completeBooking, deleteBooking } from '@/lib/actions/bookings';
import { CancelBookingDialog } from './CancelBookingDialog';
import { toast } from 'sonner';

interface BookingActionsProps {
  booking: {
    id: string;
    status: BookingStatus;
  };
}

export function BookingActions({ booking }: BookingActionsProps) {
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    const result = await confirmBooking(booking.id);
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Booking confirmed');
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    const result = await completeBooking(booking.id);
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Booking marked as completed');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this booking?')) return;

    setLoading(true);
    const result = await deleteBooking(booking.id);
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Booking deleted');
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" disabled={loading}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {booking.status === BookingStatus.PENDING && (
            <DropdownMenuItem onClick={handleConfirm}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Confirm
            </DropdownMenuItem>
          )}
          {booking.status === BookingStatus.CONFIRMED && (
            <DropdownMenuItem onClick={handleComplete}>
              <Clock className="mr-2 h-4 w-4" />
              Mark Completed
            </DropdownMenuItem>
          )}
          {(booking.status === BookingStatus.PENDING || booking.status === BookingStatus.CONFIRMED) && (
            <DropdownMenuItem onClick={() => setCancelDialogOpen(true)}>
              <XCircle className="mr-2 h-4 w-4" />
              Cancel
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleDelete} className="text-destructive">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CancelBookingDialog
        bookingId={booking.id}
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
      />
    </>
  );
}
