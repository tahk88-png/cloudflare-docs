"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getCart, clearCart, CartItem } from "@/lib/cart";
import Link from "next/link";

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    setItems(getCart());
  }, []);

  const handleCheckout = () => {
    // Navigate to checkout
    window.location.href = "/checkout";
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Shopping Cart</h1>
      {items.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Your cart is empty</p>
            <Link href="/tools">
              <Button className="mt-4 w-full">Browse Tools</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map((item, idx) => (
            <Card key={idx}>
              <CardContent className="pt-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">Product ID: {item.productId}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(item.startAt).toLocaleString()} - {new Date(item.endAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          <div className="flex gap-4">
            <Button onClick={handleCheckout} className="flex-1">
              Proceed to Checkout
            </Button>
            <Button variant="outline" onClick={() => { clearCart(); setItems([]); }}>
              Clear Cart
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
