"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getCart } from "@/lib/cart";
import { api } from "@shared/api";

export default function CheckoutPage() {
  const [cart, setCart] = useState(getCart());
  const [code, setCode] = useState("");
  const [appliedCode, setAppliedCode] = useState<any>(null);
  const [flags, setFlags] = useState<any>({});

  useEffect(() => {
    api.getFlags().then(setFlags);
  }, []);

  const handleApplyCode = async () => {
    if (!code) return;
    const result = await api.applyCode(code);
    if (result && !result.error) {
      setAppliedCode(result);
    } else {
      alert("Invalid code");
    }
  };

  if (!flags.checkout_enabled) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">Checkout is currently disabled</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Checkout</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {cart.map((item, idx) => (
                <div key={idx} className="border-b pb-4">
                  <p className="font-medium">Item {idx + 1}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(item.startAt).toLocaleString()} - {new Date(item.endAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Discount Code</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Enter code"
                  className="flex-1 px-3 py-2 border rounded-md"
                  onKeyDown={(e) => e.key === 'Enter' && handleApplyCode()}
                />
                <Button onClick={handleApplyCode}>Apply</Button>
              </div>
              {appliedCode && (
                <div className="p-3 bg-green-50 rounded-md">
                  <p className="text-sm font-medium">Code applied: {appliedCode.code}</p>
                  <p className="text-xs text-muted-foreground">
                    {appliedCode.type === "discount" ? "Discount" : "Voucher"}: €{appliedCode.value}
                  </p>
                </div>
              )}
              <Button className="w-full" size="lg">
                Complete Purchase
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
