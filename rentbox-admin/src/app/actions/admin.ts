"use server";

import { revalidatePath } from "next/cache";
import { assertPermission } from "@/lib/auth/requireRole";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import type { ApiResponse, BookingStatus } from "@/lib/types";

// Import admin services
import * as bookingService from "@/lib/admin/bookings";
import * as productService from "@/lib/admin/products";
import * as categoryService from "@/lib/admin/categories";
import * as lockerService from "@/lib/admin/lockers";
import * as compartmentService from "@/lib/admin/compartments";
import * as userService from "@/lib/admin/users";

// Import validations
import {
  createBookingSchema,
  cancelBookingSchema,
  createProductSchema,
  updateProductSchema,
  createCategorySchema,
  updateCategorySchema,
  createLockerSchema,
  updateLockerSchema,
  createCompartmentSchema,
  updateCompartmentSchema,
  createUserSchema,
  updateUserSchema,
} from "@/lib/validations";

// ============================================
// BOOKING ACTIONS
// ============================================

export async function createBookingAction(
  data: unknown
): Promise<ApiResponse<{ id: string }>> {
  const user = await assertPermission("MANAGE_BOOKINGS");
  
  const { limited } = await checkRateLimit(`${user.id}:booking`, "/admin/bookings", 30);
  if (limited) {
    return { success: false, error: "Rate limit exceeded" };
  }

  const parsed = createBookingSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    const booking = await bookingService.createBooking(parsed.data, user.id);
    revalidatePath("/admin/bookings");
    revalidatePath("/admin");
    return { success: true, data: { id: booking.id } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create booking",
    };
  }
}

export async function updateBookingStatusAction(
  id: string,
  status: BookingStatus,
  cancelReason?: string
): Promise<ApiResponse<{ id: string }>> {
  const user = await assertPermission("MANAGE_BOOKINGS");

  try {
    const booking = await bookingService.updateBookingStatus(
      id,
      status,
      user.id,
      cancelReason
    );
    revalidatePath("/admin/bookings");
    revalidatePath("/admin");
    return { success: true, data: { id: booking.id } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update booking",
    };
  }
}

export async function cancelBookingAction(
  data: unknown
): Promise<ApiResponse<{ id: string }>> {
  const user = await assertPermission("CANCEL_BOOKINGS");

  const parsed = cancelBookingSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    const booking = await bookingService.updateBookingStatus(
      parsed.data.id,
      "cancelled",
      user.id,
      parsed.data.reason
    );
    revalidatePath("/admin/bookings");
    revalidatePath("/admin");
    return { success: true, data: { id: booking.id } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to cancel booking",
    };
  }
}

// ============================================
// PRODUCT ACTIONS
// ============================================

export async function createProductAction(
  data: unknown
): Promise<ApiResponse<{ id: string }>> {
  const user = await assertPermission("MANAGE_PRODUCTS");

  const parsed = createProductSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    const product = await productService.createProduct(parsed.data, user.id);
    revalidatePath("/admin/products");
    revalidatePath("/admin");
    return { success: true, data: { id: product.id } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create product",
    };
  }
}

export async function updateProductAction(
  data: unknown
): Promise<ApiResponse<{ id: string }>> {
  const user = await assertPermission("MANAGE_PRODUCTS");

  const parsed = updateProductSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    const product = await productService.updateProduct(parsed.data, user.id);
    revalidatePath("/admin/products");
    revalidatePath("/admin");
    return { success: true, data: { id: product.id } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update product",
    };
  }
}

export async function deleteProductAction(
  id: string
): Promise<ApiResponse<null>> {
  const user = await assertPermission("MANAGE_PRODUCTS");

  try {
    await productService.deleteProduct(id, user.id);
    revalidatePath("/admin/products");
    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete product",
    };
  }
}

export async function toggleProductActiveAction(
  id: string
): Promise<ApiResponse<{ id: string; active: boolean }>> {
  const user = await assertPermission("MANAGE_PRODUCTS");

  try {
    const product = await productService.toggleProductActive(id, user.id);
    revalidatePath("/admin/products");
    revalidatePath("/admin");
    return { success: true, data: { id: product.id, active: product.active } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to toggle product",
    };
  }
}

// ============================================
// CATEGORY ACTIONS
// ============================================

export async function createCategoryAction(
  data: unknown
): Promise<ApiResponse<{ id: string }>> {
  const user = await assertPermission("MANAGE_CATEGORIES");

  const parsed = createCategorySchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    const category = await categoryService.createCategory(parsed.data, user.id);
    revalidatePath("/admin/categories");
    return { success: true, data: { id: category.id } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create category",
    };
  }
}

export async function updateCategoryAction(
  data: unknown
): Promise<ApiResponse<{ id: string }>> {
  const user = await assertPermission("MANAGE_CATEGORIES");

  const parsed = updateCategorySchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    const category = await categoryService.updateCategory(parsed.data, user.id);
    revalidatePath("/admin/categories");
    return { success: true, data: { id: category.id } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update category",
    };
  }
}

export async function deleteCategoryAction(
  id: string
): Promise<ApiResponse<null>> {
  const user = await assertPermission("MANAGE_CATEGORIES");

  try {
    await categoryService.deleteCategory(id, user.id);
    revalidatePath("/admin/categories");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete category",
    };
  }
}

export async function moveCategoryUpAction(
  id: string
): Promise<ApiResponse<null>> {
  const user = await assertPermission("MANAGE_CATEGORIES");

  try {
    await categoryService.moveCategoryUp(id, user.id);
    revalidatePath("/admin/categories");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to move category",
    };
  }
}

export async function moveCategoryDownAction(
  id: string
): Promise<ApiResponse<null>> {
  const user = await assertPermission("MANAGE_CATEGORIES");

  try {
    await categoryService.moveCategoryDown(id, user.id);
    revalidatePath("/admin/categories");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to move category",
    };
  }
}

// ============================================
// LOCKER ACTIONS
// ============================================

export async function createLockerAction(
  data: unknown
): Promise<ApiResponse<{ id: string }>> {
  const user = await assertPermission("MANAGE_LOCKERS");

  const parsed = createLockerSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    const locker = await lockerService.createLocker(parsed.data, user.id);
    revalidatePath("/admin/lockers");
    return { success: true, data: { id: locker.id } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create locker",
    };
  }
}

export async function updateLockerAction(
  data: unknown
): Promise<ApiResponse<{ id: string }>> {
  const user = await assertPermission("MANAGE_LOCKERS");

  const parsed = updateLockerSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    const locker = await lockerService.updateLocker(parsed.data, user.id);
    revalidatePath("/admin/lockers");
    return { success: true, data: { id: locker.id } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update locker",
    };
  }
}

export async function deleteLockerAction(
  id: string
): Promise<ApiResponse<null>> {
  const user = await assertPermission("MANAGE_LOCKERS");

  try {
    await lockerService.deleteLocker(id, user.id);
    revalidatePath("/admin/lockers");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete locker",
    };
  }
}

// ============================================
// COMPARTMENT ACTIONS
// ============================================

export async function createCompartmentAction(
  data: unknown
): Promise<ApiResponse<{ id: string }>> {
  const user = await assertPermission("MANAGE_COMPARTMENTS");

  const parsed = createCompartmentSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    const compartment = await compartmentService.createCompartment(
      parsed.data,
      user.id
    );
    revalidatePath("/admin/compartments");
    revalidatePath("/admin");
    return { success: true, data: { id: compartment.id } };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create compartment",
    };
  }
}

export async function updateCompartmentAction(
  data: unknown
): Promise<ApiResponse<{ id: string }>> {
  const user = await assertPermission("MANAGE_COMPARTMENTS");

  const parsed = updateCompartmentSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    const compartment = await compartmentService.updateCompartment(
      parsed.data,
      user.id
    );
    revalidatePath("/admin/compartments");
    revalidatePath("/admin");
    return { success: true, data: { id: compartment.id } };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update compartment",
    };
  }
}

export async function deleteCompartmentAction(
  id: string
): Promise<ApiResponse<null>> {
  const user = await assertPermission("MANAGE_COMPARTMENTS");

  try {
    await compartmentService.deleteCompartment(id, user.id);
    revalidatePath("/admin/compartments");
    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to delete compartment",
    };
  }
}

export async function setMaintenanceAction(
  id: string,
  active: boolean,
  notes: string
): Promise<ApiResponse<{ id: string }>> {
  const user = await assertPermission("SET_MAINTENANCE");

  try {
    const compartment = await compartmentService.setCompartmentMaintenance(
      id,
      active,
      notes,
      user.id
    );
    revalidatePath("/admin/compartments");
    revalidatePath("/admin");
    return { success: true, data: { id: compartment.id } };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to update maintenance status",
    };
  }
}

export async function assignProductAction(
  compartmentId: string,
  productId: string | null
): Promise<ApiResponse<{ id: string }>> {
  const user = await assertPermission("MANAGE_COMPARTMENTS");

  try {
    const compartment = await compartmentService.assignProductToCompartment(
      compartmentId,
      productId,
      user.id
    );
    revalidatePath("/admin/compartments");
    return { success: true, data: { id: compartment.id } };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to assign product",
    };
  }
}

// ============================================
// USER ACTIONS
// ============================================

export async function createUserAction(
  data: unknown
): Promise<ApiResponse<{ id: string }>> {
  const user = await assertPermission("MANAGE_ROLES");

  const parsed = createUserSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    const newUser = await userService.createUser(parsed.data, user.id);
    revalidatePath("/admin/users");
    return { success: true, data: { id: newUser.id } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create user",
    };
  }
}

export async function updateUserAction(
  data: unknown
): Promise<ApiResponse<{ id: string }>> {
  const user = await assertPermission("MANAGE_ROLES");

  const parsed = updateUserSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    const updatedUser = await userService.updateUser(
      parsed.data,
      user.id,
      user.role
    );
    revalidatePath("/admin/users");
    return { success: true, data: { id: updatedUser.id } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update user",
    };
  }
}

export async function deleteUserAction(id: string): Promise<ApiResponse<null>> {
  const user = await assertPermission("MANAGE_ROLES");

  try {
    await userService.deleteUser(id, user.id);
    revalidatePath("/admin/users");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete user",
    };
  }
}

export async function toggleUserActiveAction(
  id: string
): Promise<ApiResponse<{ id: string; active: boolean }>> {
  const user = await assertPermission("MANAGE_ROLES");

  try {
    const updatedUser = await userService.toggleUserActive(id, user.id);
    revalidatePath("/admin/users");
    return {
      success: true,
      data: { id: updatedUser.id, active: updatedUser.active },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to toggle user",
    };
  }
}
