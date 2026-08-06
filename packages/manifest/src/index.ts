/**
 * @senseering/urbanos-manifest
 *
 * The app manifest: one declarative file per app describing the store listing,
 * the scopes it needs (with localized consent reasons), how it embeds, and
 * whether it offers a demo. Authored as TS via defineAppManifest, validated with
 * zod, compiled to JSON at publish. See docs/publishing.md for the field guide.
 */
import { z } from 'zod';

export const MANIFEST_VERSION = '0.1.0';

/** A localized string map, e.g. { en: "Air Quality", de: "Luftqualität" }. */
const localized = z.record(z.string());

const scopeRequest = z.object({
  scope: z.string(),
  reason: localized,
});

export const appManifestSchema = z.object({
  manifestVersion: z.literal(1),
  id: z
    .string()
    .regex(/^[a-z0-9]+(\.[a-z0-9-]+)+$/, 'id must be reverse-DNS, e.g. io.acme.air-quality'),
  version: z.string(),
  name: localized,
  description: localized.optional(),
  developer: z.object({
    name: z.string(),
    url: z.string().url().optional(),
    supportEmail: z.string().email().optional(),
  }),
  icons: z.object({ svg: z.string().optional(), png512: z.string().optional() }).optional(),
  categories: z.array(z.string()).default([]),
  embed: z.object({
    protocol: z.literal(2),
    hostOrigins: z.array(z.string()),
    modes: z.array(z.enum(['app', 'card'])).default(['app']),
  }),
  scopes: z.object({
    required: z.array(scopeRequest).default([]),
    optional: z.array(scopeRequest).default([]),
  }),
  sensorTypes: z
    .object({
      required: z.array(z.string()).default([]),
      optional: z.array(z.string()).default([]),
    })
    .optional(),
  screens: z
    .array(z.object({ id: z.string(), path: z.string(), title: localized.optional() }))
    .default([]),
  settings: z.unknown().optional(),
  ai: z
    .object({ prompts: z.array(z.object({ id: z.string(), schemaVersion: z.number() })) })
    .optional(),
  pricing: z
    .object({
      model: z.string(),
      monthlyFrom: z.number().optional(),
      currency: z.string().optional(),
    })
    .optional(),
  demo: z.object({ available: z.boolean(), entryPath: z.string().optional() }).optional(),
  locales: z.array(z.string()).default(['de']),
  minSdkVersion: z.string().optional(),
});

export type AppManifest = z.infer<typeof appManifestSchema>;
export type AppManifestInput = z.input<typeof appManifestSchema>;

/** Define + validate a manifest (throws on invalid input). */
export function defineAppManifest(manifest: AppManifestInput): AppManifest {
  return appManifestSchema.parse(manifest);
}

/** Validate an unknown value as a manifest, returning structured errors. */
export function validateAppManifest(
  value: unknown,
): { ok: true; manifest: AppManifest } | { ok: false; errors: string[] } {
  const r = appManifestSchema.safeParse(value);
  if (r.success) return { ok: true, manifest: r.data };
  return { ok: false, errors: r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`) };
}
