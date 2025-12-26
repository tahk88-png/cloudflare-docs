import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api } from "@shared/api";
import { Product } from "@shared/types";

async function getProducts(): Promise<Product[]> {
  try {
    return await api.getProducts();
  } catch {
    return [];
  }
}

export default async function ToolsPage() {
  const products = await getProducts();

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Available Tools</h1>
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
                <Button className="w-full">View & Book</Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
