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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
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
import { EmptyState } from "@/components/admin/EmptyState";
import { formatCurrency, slugify, copyToClipboard } from "@/lib/utils";
import {
  createProductAction,
  updateProductAction,
  deleteProductAction,
  toggleProductActiveAction,
} from "@/app/actions/admin";
import { toast } from "sonner";
import {
  MoreHorizontal,
  Copy,
  Plus,
  Pencil,
  Trash2,
  Package,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Search,
} from "lucide-react";
import type { ProductWithRelations, Category } from "@/lib/types";

interface ProductsClientProps {
  products: ProductWithRelations[];
  totalPages: number;
  currentPage: number;
  total: number;
  categories: Category[];
}

export function ProductsClient({
  products,
  totalPages,
  currentPage,
  total,
  categories,
}: ProductsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [selectedProduct, setSelectedProduct] =
    React.useState<ProductWithRelations | null>(null);
  const [isPending, setIsPending] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState(
    searchParams.get("search") || ""
  );

  // Form state
  const [formData, setFormData] = React.useState({
    name: "",
    slug: "",
    shortDescription: "",
    description: "",
    categoryId: "",
    basePrice: "",
    priceUnit: "hour" as "hour" | "day",
    slotMinutes: "15",
    minRentalMinutes: "60",
    maxRentalMinutes: "",
    active: true,
  });

  const resetForm = () => {
    setFormData({
      name: "",
      slug: "",
      shortDescription: "",
      description: "",
      categoryId: categories[0]?.id || "",
      basePrice: "",
      priceUnit: "hour",
      slotMinutes: "15",
      minRentalMinutes: "60",
      maxRentalMinutes: "",
      active: true,
    });
    setSelectedProduct(null);
  };

  const openEditDialog = (product: ProductWithRelations) => {
    setSelectedProduct(product);
    setFormData({
      name: product.name,
      slug: product.slug,
      shortDescription: product.shortDescription || "",
      description: product.description || "",
      categoryId: product.categoryId,
      basePrice: product.basePrice.toString(),
      priceUnit: product.priceUnit,
      slotMinutes: product.slotMinutes.toString(),
      minRentalMinutes: product.minRentalMinutes.toString(),
      maxRentalMinutes: product.maxRentalMinutes?.toString() || "",
      active: product.active,
    });
    setDialogOpen(true);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const updateFilter = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page");
    router.push(`/admin/products?${params.toString()}`);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilter("search", searchQuery || null);
  };

  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", page.toString());
    router.push(`/admin/products?${params.toString()}`);
  };

  const handleCopyId = async (id: string) => {
    await copyToClipboard(id);
    toast.success("ID copied to clipboard");
  };

  const handleNameChange = (name: string) => {
    setFormData((prev) => ({
      ...prev,
      name,
      slug: !selectedProduct ? slugify(name) : prev.slug,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPending(true);

    const data = {
      name: formData.name,
      slug: formData.slug,
      shortDescription: formData.shortDescription || undefined,
      description: formData.description || undefined,
      categoryId: formData.categoryId,
      basePrice: parseFloat(formData.basePrice),
      priceUnit: formData.priceUnit,
      slotMinutes: parseInt(formData.slotMinutes),
      minRentalMinutes: parseInt(formData.minRentalMinutes),
      maxRentalMinutes: formData.maxRentalMinutes
        ? parseInt(formData.maxRentalMinutes)
        : null,
      active: formData.active,
    };

    const result = selectedProduct
      ? await updateProductAction({ ...data, id: selectedProduct.id })
      : await createProductAction(data);

    setIsPending(false);

    if (result.success) {
      toast.success(selectedProduct ? "Product updated" : "Product created");
      setDialogOpen(false);
      resetForm();
      router.refresh();
    } else {
      toast.error(result.error || "Failed to save product");
    }
  };

  const handleDelete = async () => {
    if (!selectedProduct) return;

    setIsPending(true);
    const result = await deleteProductAction(selectedProduct.id);
    setIsPending(false);

    if (result.success) {
      toast.success("Product deleted");
      setDeleteDialogOpen(false);
      setSelectedProduct(null);
      router.refresh();
    } else {
      toast.error(result.error || "Failed to delete product");
    }
  };

  const handleToggleActive = async (product: ProductWithRelations) => {
    const result = await toggleProductActiveAction(product.id);
    if (result.success) {
      toast.success(
        result.data?.active ? "Product activated" : "Product deactivated"
      );
      router.refresh();
    } else {
      toast.error(result.error || "Failed to toggle product");
    }
  };

  return (
    <>
      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <form onSubmit={handleSearch} className="flex gap-2">
          <Input
            type="search"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-[250px]"
          />
          <Button type="submit" variant="outline" size="icon">
            <Search className="h-4 w-4" />
          </Button>
        </form>

        <Select
          value={searchParams.get("categoryId") || "all"}
          onValueChange={(value) => updateFilter("categoryId", value)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={searchParams.get("active") || "all"}
          onValueChange={(value) => updateFilter("active", value)}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="true">Active</SelectItem>
            <SelectItem value="false">Inactive</SelectItem>
          </SelectContent>
        </Select>

        <Button onClick={openCreateDialog} className="ml-auto">
          <Plus className="mr-2 h-4 w-4" />
          Add Product
        </Button>
      </div>

      {/* Table */}
      {products.length === 0 && !searchParams.toString() ? (
        <EmptyState
          icon={Package}
          title="No products yet"
          description="Create your first rental product to get started."
          actionLabel="Add Product"
          onAction={openCreateDialog}
        />
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Compartments</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[70px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      No products found matching your filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div className="font-medium">{product.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {product.slug}
                        </div>
                      </TableCell>
                      <TableCell>{product.category.name}</TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {formatCurrency(Number(product.basePrice))}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          per {product.priceUnit}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {product.compartments.length}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={product.active ? "success" : "secondary"}
                        >
                          {product.active ? "Active" : "Inactive"}
                        </Badge>
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
                              onClick={() => handleCopyId(product.id)}
                            >
                              <Copy className="mr-2 h-4 w-4" />
                              Copy ID
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => openEditDialog(product)}
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleToggleActive(product)}
                            >
                              {product.active ? "Deactivate" : "Activate"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedProduct(product);
                                setDeleteDialogOpen(true);
                              }}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
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
              {Math.min(currentPage * 20, total)} of {total} products
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
        </>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedProduct ? "Edit Product" : "Create Product"}
            </DialogTitle>
            <DialogDescription>
              {selectedProduct
                ? "Update the product details below."
                : "Fill in the details for the new product."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug *</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, slug: e.target.value }))
                  }
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="shortDescription">Short Description</Label>
              <Input
                id="shortDescription"
                value={formData.shortDescription}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    shortDescription: e.target.value,
                  }))
                }
                placeholder="Brief description (shown in lists)"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Full Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Detailed product description"
                rows={4}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="categoryId">Category *</Label>
                <Select
                  value={formData.categoryId}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, categoryId: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-4 grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="basePrice">Price (€) *</Label>
                  <Input
                    id="basePrice"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.basePrice}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        basePrice: e.target.value,
                      }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priceUnit">Per</Label>
                  <Select
                    value={formData.priceUnit}
                    onValueChange={(value: "hour" | "day") =>
                      setFormData((prev) => ({ ...prev, priceUnit: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hour">Hour</SelectItem>
                      <SelectItem value="day">Day</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="slotMinutes">Slot (minutes)</Label>
                <Input
                  id="slotMinutes"
                  type="number"
                  min="5"
                  value={formData.slotMinutes}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      slotMinutes: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="minRentalMinutes">Min Rental (minutes)</Label>
                <Input
                  id="minRentalMinutes"
                  type="number"
                  min="15"
                  value={formData.minRentalMinutes}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      minRentalMinutes: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxRentalMinutes">Max Rental (minutes)</Label>
                <Input
                  id="maxRentalMinutes"
                  type="number"
                  min="15"
                  value={formData.maxRentalMinutes}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      maxRentalMinutes: e.target.value,
                    }))
                  }
                  placeholder="No limit"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="active"
                checked={formData.active}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, active: checked }))
                }
              />
              <Label htmlFor="active">Active</Label>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : selectedProduct ? (
                  "Update Product"
                ) : (
                  "Create Product"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Product</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{selectedProduct?.name}&quot;? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Product"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
