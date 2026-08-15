/**
 * @project  SecretClock — iamuvin.com
 * @author   Uvin Vindula (IAMUVIN)
 * @website  https://iamuvin.com
 * @built    2026
 * @license  MIT
 */

import { z } from "zod";

export const sourceKindSchema = z.enum([
  "aws_secrets_manager",
  "github_actions",
  "normalized_csv",
]);

export const importContextSchema = z.object({
  environment: z.string().trim().min(1).max(80),
  owner: z.string().trim().max(120).optional().default(""),
  policyDays: z.number().int().min(0).max(999),
});

const sourceDateSchema = z
  .union([z.string(), z.number()])
  .optional()
  .nullable();

export const awsSecretListSchema = z
  .object({
    SecretList: z
      .array(
        z
          .object({
            Name: z.string().trim().min(1).max(512),
            LastRotatedDate: sourceDateSchema,
            NextRotationDate: sourceDateSchema,
            LastChangedDate: sourceDateSchema,
            RotationEnabled: z.boolean().optional().nullable(),
          })
          .passthrough(),
      )
      .max(5000),
  })
  .passthrough();

export const githubSecretListSchema = z
  .object({
    secrets: z
      .array(
        z
          .object({
            name: z.string().trim().min(1).max(512),
            created_at: z.string().datetime({ offset: true }),
            updated_at: z.string().datetime({ offset: true }),
          })
          .passthrough(),
      )
      .max(5000),
  })
  .passthrough();

export type SourceKind = z.infer<typeof sourceKindSchema>;
export type ImportContext = z.infer<typeof importContextSchema>;
