"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/admin/EmptyState";
import { formatLocalDateTime, formatRelativeDate } from "@/lib/timezone";
import { copyToClipboard } from "@/lib/utils";
import {
  updateBookingStatusAction,
  cancelBookingAction,
} from "@/app/actions/admin";
import { toast } from "sonner";
import {
  MoreHorizontal,
  Copy,
  Check,
  X,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import type {
  BookingWithRelations,
  LockerWithRelations,
  ProductWithRelations,
  BookingStatus,
} from "@/lib/types";

const statusVariants: Record<
  BookingStatus,
  "default" | "success" | "warning" | "destructive" | "info"
> = {
  pending: "warning",
  confirmed: "success",
  cancelled: "destructive",
  completed: "info",
};

interface BookingsClientProps {
  bookings: BookingWithRelations[];
  totalPages: number;
  currentPage: number;
  total: number;
  lockers: LockerWithRelations[];
  products: ProductWithRelations[];
}

export function BookingsClient({
  bookings,
  totalPages,
  currentPage,
  total,
  lockers,
  products,
}: BookingsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [cancelDialogOpen, setCancelDialogOpen] = React.useState(false);
  const [selectedBooking, setSelectedBooking] =
    React.useState<BookingWithRelations | null>(null);
  const [cancelReason, setCancelReason] = React.useState("");
  const [isPending, setIsPending] = React.useState(false);

  const updateFilter = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page"); // Reset page when filtering
    router.push(`/admin/bookings?${params.toString()}`);
  };

  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", page.toString());
    router.push(`/admin/bookings?${params.toString()}`);
  };

  const handleCopyId = async (id: string) => {
    await copyToClipboard(id);
    toast.success("ID copied to clipboard");
  };

  const handleStatusChange = async (
    booking: BookingWithRelations,
    status: BookingStatus
  ) => {
    if (status === "cancelled") {
      setSelectedBooking(booking);
      setCancelDialogOpen(true);
      return;
    }

    setIsPending(true);
    const result = await updateBookingStatusAction(booking.id, status);
    setIsPending(false);

    if (result.success) {
      toast.success(`Booking ${status}`);
      router.refresh();
    } else {
      toast.error(result.error || "Failed to update booking");
    }
  };

  const handleCancel = async () => {
    if (!selectedBooking || !cancelReason.trim()) return;

    setIsPending(true);
    const result = await cancelBookingAction({
      id: selectedBooking.id,
      reason: cancelReason,
    });
    setIsPending(false);

    if (result.success) {
      toast.success("Booking cancelled");
      setCancelDialogOpen(false);
      setCancelReason("");
      setSelectedBooking(null);
      router.refresh();
    } else {
      toast.error(result.error || "Failed to cancel booking");
    }
  };

  if (bookings.length === 0 && !searchParams.toString()) {
    return (
      <EmptyState
        icon={Calendar}
        title="No bookings yet"
        description="Bookings will appear here when customers make reservations."
      />
    );
  }

  return (
    <>
      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <Select
          value={searchParams.get("status") || "all"}
          onValueChange={(value) => updateFilter("status", value)}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={searchParams.get("lockerId") || "all"}
          onValueChange={(value) => updateFilter("lockerId", value)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Locker" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Lockers</SelectItem>
            {lockers.map((locker) => (
              <SelectItem key={locker.id} value={locker.id}>
                {locker.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={searchParams.get("productId") || "all"}
          onValueChange={(value) => updateFilter("productId", value)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Product" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Products</SelectItem>
            {products.map((product) => (
              <SelectItem key={product.id} value={product.id}>
                {product.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          type="date"
          className="w-[150px]"
          value={searchParams.get("dateFrom") || ""}
          onChange={(e) => updateFilter("dateFrom", e.target.value)}
          placeholder="From date"
        />

        <Input
          type="date"
          className="w-[150px]"
          value={searchParams.get("dateTo") || ""}
          onChange={(e) => updateFilter("dateTo", e.target.value)}
          placeholder="To date"
        />

        {searchParams.toString() && (
          <Button
            variant="ghost"
            onClick={() => router.push("/admin/bookings")}
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date/Time</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  No bookings found matching your filters.
                </TableCell>
              </TableRow>
            ) : (
              bookings.map((booking) => (
                <TableRow key={booking.id}>
                  <TableCell>
                    <div className="font-medium">
                      {formatLocalDateTime(booking.startsAt, "dd.MM.yyyy")}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatLocalDateTime(booking.startsAt, "HH:mm")} -{" "}
                      {formatLocalDateTime(booking.endsAt, "HH:mm")}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{booking.product.name}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">
                      {booking.compartment.locker.name}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Compartment {booking.compartment.label}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariants[booking.status]}>
                      {booking.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {booking.user ? (
                      <div className="text-sm">{booking.user.email}</div>
                    ) : (
                      <span className="text-muted-foreground">Walk-in</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {formatRelativeDate(booking.createdAt)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleCopyId(booking.id)}
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          Copy ID
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {booking.status === "pending" && (
                          <DropdownMenuItem
                            onClick={() =>
                              handleStatusChange(booking, "confirmed")
                            }
                          >
                            <Check className="mr-2 h-4 w-4" />
                            Confirm
                          </DropdownMenuItem>
                        )}
                        {(booking.status === "pending" ||
                          booking.status === "confirmed") && (
                          <>
                            <DropdownMenuItem
                              onClick={() =>
                                handleStatusChange(booking, "completed")
                              }
                            >
                              <Check className="mr-2 h-4 w-4" />
                              Mark Completed
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                handleStatusChange(booking, "cancelled")
                              }
                              className="text-destructive"
                            >
                              <X className="mr-2 h-4 w-4" />
                              Cancel
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between py-4">
        <p className="text-sm text-muted-foreground">
          Showing {(currentPage - 1) * 20 + 1} to{" "}
          {Math.min(currentPage * 20, total)} of {total} bookings
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Cancel Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Booking</DialogTitle>
            <DialogDescription>
              Please provide a reason for cancelling this booking. This will be
              logged for audit purposes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Cancellation Reason</Label>
              <Textarea
                id="reason"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Enter reason for cancellation..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCancelDialogOpen(false)}
              disabled={isPending}
            >
              Keep Booking
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={!cancelReason.trim() || isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cancelling...
                </>
              ) : (
                "Cancel Booking"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
