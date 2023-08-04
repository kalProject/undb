import { rootFilter, tableIdSchema } from '@undb/core'
import { z } from 'zod'
import { rlsAction, rlsIdSchema } from './value-objects/index.js'

export const queryRLS: any = z.object({
  id: rlsIdSchema,
  tableId: tableIdSchema,
  policy: z.object({
    action: rlsAction,
    filter: rootFilter,
  }),
})

export type IQueryRLS = z.infer<typeof queryRLS>

export const updateRLSSchema = z.object({
  policy: z
    .object({
      action: rlsAction,
      filter: rootFilter,
    })
    .partial()
    .optional(),
})

export type IUpdateRLSSchema = z.infer<typeof updateRLSSchema>
