import { Option, ValueObject } from '@undb/domain'
import { z, type ZodSchema } from 'zod'
import type {
  INotRecordComositeSpecification,
  IRecordComositeSpecification,
} from '../../../records/record/record.composite-specification'
import type { IFieldDTO } from '../dto/field.dto'
import type { IFieldFilterSchema, MaybeFieldFilterWithFieldId } from '../field-filter.type'
import { FieldIdVo, fieldId, type FieldId } from '../field-id.vo'
import { FieldNameVo, fieldName } from '../field-name.vo'
import type { FieldType, IFieldFilter } from '../field.type'
import type { IFieldVisitor } from '../field.visitor'

export const createBaseFieldDTO = z.object({
  id: fieldId.optional(),
  name: fieldName,
})

export type ICreateBaseFieldDTO = z.infer<typeof createBaseFieldDTO>

export const baseFieldDTO = z.object({
  id: fieldId,
  name: fieldName,
  required: z.boolean().optional(),
})

export type IBaseFieldDTO = z.infer<typeof baseFieldDTO>

export abstract class AbstractField<V extends ValueObject> {
  id!: FieldId
  name!: FieldNameVo

  constructor(dto: IBaseFieldDTO) {
    this.id = new FieldIdVo(dto.id)
    this.name = new FieldNameVo(dto.name)
    this.required = dto.required
  }

  abstract type: FieldType
  /**
   * whether the field value is controlled by system
   */
  protected system = false

  #required: boolean | undefined = undefined
  get required() {
    return this.system ? false : this.#required
  }
  set required(value: boolean | undefined) {
    if (this.system) {
      return
    }

    this.#required = value
  }

  protected abstract get valueSchema(): ZodSchema
  validate(value: V) {
    return this.valueSchema.safeParse(value.unpack())
  }

  abstract getSpec(filter: IFieldFilter): Option<IRecordComositeSpecification | INotRecordComositeSpecification>

  abstract accept(visitor: IFieldVisitor): void

  protected abstract get filterSchema(): IFieldFilterSchema

  validateFilter(filter: MaybeFieldFilterWithFieldId) {
    return this.filterSchema.safeParse(filter)
  }

  toJSON(): IFieldDTO {
    return {
      id: this.id.value,
      name: this.name.value,
      type: this.type,
      required: this.required,
    }
  }
}
