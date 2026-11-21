import { z } from 'zod';

export const localizedTextSchema = z.object({
  tr: z.string().trim().min(1),
  en: z.string().trim().min(1),
});

export const categorySchema = z.enum(['outerwear', 'women', 'men', 'tailoring']);

export const orderStatusSchema = z.enum(['received', 'preparing', 'shipped', 'delivered']);

export const productVariantSchema = z.object({
  sku: z.string().trim().min(2).max(40),
  colorId: z.string().trim().min(1).max(32),
  size: z.string().trim().min(1).max(16),
  stock: z.number().int().min(0).max(9999),
});

export const productColorOptionSchema = z.object({
  id: z.string().trim().min(1).max(32),
  name: localizedTextSchema,
  hex: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
});

export const createOrUpdateProductSchema = z.object({
  slug: z.string().trim().min(2).max(80).optional(),
  title: localizedTextSchema,
  subtitle: localizedTextSchema,
  description: localizedTextSchema,
  composition: localizedTextSchema,
  care: localizedTextSchema,
  category: categorySchema,
  collectionTag: z.string().trim().min(1).max(40),
  priceTry: z.number().positive().max(250000),
  compareAtTry: z.number().positive().max(250000).optional(),
  image: z.string().trim().min(1),
  colors: z.array(productColorOptionSchema).min(1),
  sizes: z.array(z.string().trim().min(1)).min(1),
  variants: z.array(productVariantSchema).min(1),
  featured: z.boolean().default(false),
  isNew: z.boolean().default(false),
});

export const shippingAddressSchema = z.object({
  fullName: z.string().trim().min(3, 'Full name is required'),
  email: z.string().trim().email('Valid email is required'),
  phone: z.string().trim().min(7, 'Valid phone number is required'),
  city: z.string().trim().min(2, 'City is required'),
  district: z.string().trim().min(2, 'District is required'),
  addressLine: z.string().trim().min(6, 'Address line is required'),
  postalCode: z.string().trim().min(4, 'Postal code is required').max(12),
});

export const createOrderSchema = z.object({
  shipping: shippingAddressSchema,
  deliveryMethod: z.enum(['standard', 'express']),
  paymentLast4: z.string().regex(/^\d{4}$/, 'Card last 4 digits required'),
  couponCode: z.string().trim().max(32).optional(),
  items: z
    .array(
      z.object({
        productId: z.string().trim().min(1),
        sku: z.string().trim().min(1),
        quantity: z.number().int().min(1).max(20),
      }),
    )
    .min(1, 'Cart cannot be empty'),
});

export const updateOrderStatusSchema = z.object({
  status: orderStatusSchema,
  noteTr: z.string().trim().max(200).optional(),
  noteEn: z.string().trim().max(200).optional(),
});

export const demoSwitchSchema = z.object({
  role: z.enum(['customer', 'admin']),
});

export const presignUploadSchema = z.object({
  filename: z.string().trim().min(1).max(160),
  contentType: z.enum(['image/webp', 'image/jpeg', 'image/png']),
  sizeBytes: z.number().int().positive().max(5 * 1024 * 1024),
});
