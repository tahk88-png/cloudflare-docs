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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getProducts()
      .then((data) => {
        setProducts(data);
        setError(null);
      })
      .catch((err) => {
        console.error("Failed to load products:", err);
        setError("Failed to load products. Make sure API is running.");
        setProducts([]);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div>
        <h1 className="text-4xl font-bold mb-8">Tere tulemast Demo App'i</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h1 className="text-4xl font-bold mb-8">Tere tulemast Demo App'i</h1>
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-red-500">{error}</p>
            <p className="text-center text-sm text-muted-foreground mt-2">
              Veenduge, et API töötab: http://localhost:3001
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-4xl font-bold mb-8">Tere tulemast Demo App'i</h1>
      <p className="text-lg mb-8 text-muted-foreground">
        Sirvige saadaolevaid tööriistu ja seadmeid rendiks.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => (
          <Card key={product.id}>
            <CardHeader>
              <CardTitle>{product.name}</CardTitle>
              <CardDescription>
                Tagatis: €{Number(product.deposit).toFixed(2)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <p className="text-sm text-muted-foreground mb-2">Hinnad:</p>
                <ul className="text-sm space-y-1">
                  <li>Tunnis: €{product.pricing.hourly.toFixed(2)}</li>
                  <li>Päevas: €{product.pricing.daily.toFixed(2)}</li>
                  <li>Nädalas: €{product.pricing.weekly.toFixed(2)}</li>
                </ul>
              </div>
              <Link href={`/tools/${product.slug}`}>
                <Button className="w-full">Vaata üksikasju</Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      {products.length === 0 && !loading && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Tooteid pole saadaval. Veenduge, et demo andmed on laetud.
            </p>
            <p className="text-center text-sm text-muted-foreground mt-2">
              Käivitage: pnpm demo:load
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
