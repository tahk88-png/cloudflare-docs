import { createProduct } from "@/lib/actions/product";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { PriceUnit } from "@prisma/client";

export default async function NewProductPage() {
  const categories = await prisma.category.findMany({ where: { active: true } });

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>New Product</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createProduct} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input name="name" id="name" required />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input name="slug" id="slug" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="categoryId">Category</Label>
              <select name="categoryId" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" required>
                <option value="">Select Category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="base_price">Base Price</Label>
                    <Input name="base_price" id="base_price" type="number" step="0.01" required />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="price_unit">Unit</Label>
                    <select name="price_unit" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" required>
                        {Object.values(PriceUnit).map((u) => (
                            <option key={u} value={u}>{u}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="flex items-center space-x-2">
               <input type="checkbox" name="active" id="active" className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" />
               <Label htmlFor="active">Active</Label>
            </div>

            <Button type="submit">Create Product</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
