"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@shared/api";
import { Product } from "@shared/types";
import { format, addDays, startOfDay } from "date-fns";
import { addToCart } from "@/lib/cart";

export default function ProductPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [slots, setSlots] = useState<any[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  useEffect(() => {
    api.getProduct(slug).then(setProduct).finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (product) {
      setSlotsLoading(true);
      api
        .getSlots(product.id, { date: selectedDate })
        .then((data: any) => setSlots(data.slots || []))
        .finally(() => setSlotsLoading(false));
    }
  }, [product, selectedDate]);

  const handleAddToCart = () => {
    if (!selectedSlot || !product) return;
    const [start, end] = selectedSlot.split("|");
    addToCart({
      productId: product.id,
      compartmentId: "temp-compartment-id", // Would come from slot selection in real app
      startAt: start,
      endAt: end,
    });
    alert("Added to cart!");
    // Redirect to cart
    window.location.href = "/cart";
  };

  if (loading) {
    return (
      <div>
        <Skeleton className="h-8 w-64 mb-4" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!product) {
    return <div>Product not found</div>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">{product.name}</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Product Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Deposit</p>
                <p className="text-2xl font-bold">€{Number(product.deposit).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Pricing</p>
                <ul className="space-y-1">
                  <li>Hourly: €{product.pricing.hourly.toFixed(2)}</li>
                  <li>Daily: €{product.pricing.daily.toFixed(2)}</li>
                  <li>Weekly: €{product.pricing.weekly.toFixed(2)}</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Select Time Slot</CardTitle>
            <CardDescription>Choose a date and available time slot</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Date</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                  min={format(new Date(), "yyyy-MM-dd")}
                  max={format(addDays(new Date(), 30), "yyyy-MM-dd")}
                />
              </div>

              {slotsLoading ? (
                <Skeleton className="h-32 w-full" />
              ) : (
                <div>
                  <p className="text-sm font-medium mb-2">Available Slots</p>
                  <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                    {slots.map((slot: any, idx: number) => {
                      const slotKey = `${slot.start}|${slot.end}`;
                      return (
                        <Button
                          key={idx}
                          variant={selectedSlot === slotKey ? "default" : "outline"}
                          onClick={() => setSelectedSlot(slotKey)}
                          className="text-xs"
                        >
                          {format(new Date(slot.start), "HH:mm")} - {format(new Date(slot.end), "HH:mm")}
                        </Button>
                      );
                    })}
                  </div>
                  {slots.length === 0 && (
                    <p className="text-sm text-muted-foreground">No available slots for this date</p>
                  )}
                </div>
              )}

              <Button
                className="w-full"
                onClick={handleAddToCart}
                disabled={!selectedSlot}
              >
                Add to Cart
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
