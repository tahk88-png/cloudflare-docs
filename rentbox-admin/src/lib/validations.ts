import { z } from "zod";

// Common schemas
export const idSchema = z.string().cuid();

// User schemas
export const userRoleSchema = z.enum(["owner", "admin", "operator", "viewer"]);

export const createUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: userRoleSchema,
  active: z.boolean().default(true),
});

export const updateUserSchema = createUserSchema.partial().extend({
  id: idSchema,
});

// Login schema
export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

// Category schemas
export const createCategorySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  slug: z.string().min(2, "Slug must be at least 2 characters").regex(
    /^[a-z0-9-]+$/,
    "Slug can only contain lowercase letters, numbers, and hyphens"
  ),
  description: z.string().optional(),
  icon: z.string().optional(),
  order: z.number().int().min(0).default(0),
  active: z.boolean().default(true),
});

export const updateCategorySchema = createCategorySchema.partial().extend({
  id: idSchema,
});

// Product schemas
export const priceUnitSchema = z.enum(["hour", "day"]);

export const createProductSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  slug: z.string().min(2, "Slug must be at least 2 characters").regex(
    /^[a-z0-9-]+$/,
    "Slug can only contain lowercase letters, numbers, and hyphens"
  ),
  shortDescription: z.string().optional(),
  description: z.string().optional(),
  categoryId: idSchema,
  basePrice: z.number().positive("Price must be positive"),
  priceUnit: priceUnitSchema.default("hour"),
  slotMinutes: z.number().int().min(5).default(15),
  minRentalMinutes: z.number().int().min(15).default(60),
  maxRentalMinutes: z.number().int().min(15).nullable().optional(),
  active: z.boolean().default(true),
  tagIds: z.array(idSchema).optional(),
  images: z.array(z.object({
    url: z.string().url(),
    alt: z.string().optional(),
    order: z.number().int().min(0).default(0),
    isPrimary: z.boolean().default(false),
  })).optional(),
});

export const updateProductSchema = createProductSchema.partial().extend({
  id: idSchema,
});

// Locker schemas
export const createLockerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  locationText: z.string().min(2, "Location must be at least 2 characters"),
  timezone: z.string().default("Europe/Tallinn"),
  active: z.boolean().default(true),
});

export const updateLockerSchema = createLockerSchema.partial().extend({
  id: idSchema,
});

// Compartment schemas
export const createCompartmentSchema = z.object({
  lockerId: idSchema,
  label: z.string().min(1, "Label is required").max(10, "Label too long"),
  productId: idSchema.nullable().optional(),
  active: z.boolean().default(true),
  notes: z.string().optional(),
});

export const updateCompartmentSchema = createCompartmentSchema.partial().extend({
  id: idSchema,
});

// Booking schemas
export const bookingStatusSchema = z.enum(["pending", "confirmed", "cancelled", "completed"]);
export const paymentStatusSchema = z.enum(["pending", "paid", "failed", "refunded"]);

export const createBookingSchema = z.object({
  userId: idSchema.nullable().optional(),
  productId: idSchema,
  compartmentId: idSchema,
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  status: bookingStatusSchema.default("pending"),
  notes: z.string().optional(),
}).refine(
  (data) => data.endsAt > data.startsAt,
  { message: "End time must be after start time", path: ["endsAt"] }
).refine(
  (data) => data.startsAt > new Date(),
  { message: "Start time cannot be in the past", path: ["startsAt"] }
);

export const updateBookingSchema = z.object({
  id: idSchema,
  status: bookingStatusSchema.optional(),
  notes: z.string().optional(),
  cancelReason: z.string().optional(),
});

export const cancelBookingSchema = z.object({
  id: idSchema,
  reason: z.string().min(3, "Please provide a reason for cancellation"),
});

// Settings schema
export const updateSettingsSchema = z.object({
  defaultSlotMinutes: z.number().int().min(5).optional(),
  defaultMinRentalMinutes: z.number().int().min(15).optional(),
  timezone: z.string().optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
});

// Tag schemas
export const createTagSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  slug: z.string().min(2, "Slug must be at least 2 characters").regex(
    /^[a-z0-9-]+$/,
    "Slug can only contain lowercase letters, numbers, and hyphens"
  ),
});

// Type exports
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type CreateLockerInput = z.infer<typeof createLockerSchema>;
export type UpdateLockerInput = z.infer<typeof updateLockerSchema>;
export type CreateCompartmentInput = z.infer<typeof createCompartmentSchema>;
export type UpdateCompartmentInput = z.infer<typeof updateCompartmentSchema>;
export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type UpdateBookingInput = z.infer<typeof updateBookingSchema>;
export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
