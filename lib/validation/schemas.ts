import { z } from "zod";

export const customerSchema = z.object({
  fullName: z.string().min(2),
  phone: z.string().min(8),
  email: z.string().email()
});

export const bookingRequestSchema = z
  .object({
  businessSlug: z.string().min(1),
  serviceId: z.string().uuid().optional(),
  serviceIds: z.array(z.string().uuid()).min(1).optional(),
  professionalId: z.string().uuid(),
  startAt: z.string().datetime({ offset: true }),
  customer: customerSchema
  })
  .refine((value) => Boolean(value.serviceId || value.serviceIds?.length), {
    message: "At least one service is required",
    path: ["serviceIds"]
  });

export const mercadoPagoWebhookSchema = z.object({
  appointmentId: z.string().min(1),
  providerPaymentId: z.string().min(1),
  outcome: z.enum(["approved", "rejected", "cancelled", "expired", "pending"])
});

export const adminServiceSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  durationMinutes: z.coerce.number().int().positive(),
  priceAmount: z.coerce.number().int().nonnegative(),
  depositType: z.enum(["fixed", "percentage"]),
  depositValue: z.coerce.number().int().nonnegative(),
  active: z.boolean().optional()
});

export const adminServicePatchSchema = adminServiceSchema.partial();

export const adminProfessionalSchema = z.object({
  name: z.string().min(1),
  bio: z.string().optional().nullable(),
  active: z.boolean().optional()
});

export const adminProfessionalPatchSchema = adminProfessionalSchema.partial();

export const adminBusinessHourSchema = z.object({
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  active: z.boolean().optional()
});

export const adminBusinessHoursReplaceSchema = z.object({
  professionalId: z.string().uuid().optional().nullable(),
  hours: z.array(adminBusinessHourSchema)
});

export const adminAvailabilityBlockSchema = z.object({
  professionalId: z.string().uuid().optional().nullable(),
  startAt: z.string().datetime({ offset: true }),
  endAt: z.string().datetime({ offset: true }),
  reason: z.string().optional().nullable()
});

export const adminBrandingSchema = z.object({
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  themePreset: z
    .enum(["editorial_green", "soft_rose", "warm_terracotta", "calm_blue", "minimal_dark"])
    .default("editorial_green"),
  heroText: z.string().trim().min(10).max(180),
  visualMode: z.enum(["default", "compact"]),
  logoUrl: z
    .union([z.string().trim().url(), z.literal("")])
    .optional()
    .nullable()
    .transform((value) => (value ? value : null))
});
