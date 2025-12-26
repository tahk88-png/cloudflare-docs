"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@shared/api";
import { Product } from "@shared/types";

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getProducts()
      .then(setProducts)
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div>
        <h1 className="text-4xl font-bold mb-8">Welcome to Demo App</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-4xl font-bold mb-8">Welcome to Demo App</h1>
      <p className="text-lg mb-8 text-muted-foreground">
        Browse available tools and equipment for rent.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => (
          <Card key={product.id}>
            <CardHeader>
              <CardTitle>{product.name}</CardTitle>
              <CardDescription>
                Deposit: €{Number(product.deposit).toFixed(2)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <p className="text-sm text-muted-foreground mb-2">Pricing:</p>
                <ul className="text-sm space-y-1">
                  <li>Hourly: €{product.pricing.hourly.toFixed(2)}</li>
                  <li>Daily: €{product.pricing.daily.toFixed(2)}</li>
                  <li>Weekly: €{product.pricing.weekly.toFixed(2)}</li>
                </ul>
              </div>
              <Link href={`/tools/${product.slug}`}>
                <Button className="w-full">View Details</Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      {products.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              No products available. Make sure demo data is loaded.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
