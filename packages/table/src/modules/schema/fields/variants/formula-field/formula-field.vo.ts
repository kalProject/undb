import { None, Option, Some } from "@undb/domain"
import { createParser, FormulaVisitor, returnType } from "@undb/formula"
import { z } from "@undb/zod"
import { match } from "ts-pattern"
import type { RecordComositeSpecification } from "../../../../records/record/record.composite-specification"
import { fieldId, FieldIdVo } from "../../field-id.vo"
import type { IFieldVisitor } from "../../field.visitor"
import { AbstractField, baseFieldDTO, createBaseFieldDTO } from "../abstract-field.vo"
import { StringEmpty } from "../string-field"
import { FormulaFieldValue } from "./formula-field-value.vo"
import { formulaFieldAggregate } from "./formula-field.aggregate"
import {
  createFormulaFieldCondition,
  type IFormulaFieldCondition,
  type IFormulaFieldConditionSchema,
} from "./formula-field.condition"
import { FormulaEqual, FormulaGT, FormulaGTE, FormulaLT, FormulaLTE } from "./formula-field.specification"

export const FORMULA_TYPE = "formula" as const

const fn = z.string()

export const formulaFieldOption = z.object({
  fn,
})

const formulaMetadata = z.object({
  returnType: returnType,
  fields: z.array(fieldId),
})

export type IFormulaFieldMetadata = z.infer<typeof formulaMetadata>

export type IFormulaFieldOption = z.infer<typeof formulaFieldOption>

export const createFormulaFieldDTO = createBaseFieldDTO.extend({
  type: z.literal(FORMULA_TYPE),
  option: formulaFieldOption,
})

export const createTablesFormulaFieldDTO = createFormulaFieldDTO

export type ICreateFormulaFieldDTO = z.infer<typeof createFormulaFieldDTO>

export const updateFormulaFieldDTO = createFormulaFieldDTO.setKey("id", fieldId)
export type IUpdateFormulaFieldDTO = z.infer<typeof updateFormulaFieldDTO>

export const formulaFieldDTO = baseFieldDTO.extend({
  type: z.literal(FORMULA_TYPE),
  option: formulaFieldOption,
})

export type IFormulaFieldDTO = z.infer<typeof formulaFieldDTO>

export class FormulaField extends AbstractField<FormulaFieldValue, undefined, IFormulaFieldOption> {
  private metadata: Option<IFormulaFieldMetadata> = None
  constructor(dto: IFormulaFieldDTO) {
    super(dto)
    if (dto.option) {
      this.setOption(dto.option)
    }
  }

  setOption(option: IFormulaFieldOption) {
    this.option = Some(option)
    const fn = option.fn
    if (fn) {
      try {
        const parser = createParser(fn)
        const tree = parser.formula()
        const visitor = new FormulaVisitor()
        const result = visitor.visit(tree)
        if (result.type === "functionCall") {
          const metadata: IFormulaFieldMetadata = {
            returnType: result.returnType,
            fields: visitor.getVariables(),
          }
          this.setMetadata(metadata)
        }
      } catch (error) {
        // ignore
      }
    }
  }

  setMetadata(metadata: IFormulaFieldMetadata) {
    this.metadata = Some(metadata)
  }

  static create(dto: ICreateFormulaFieldDTO) {
    const field = new FormulaField({ ...dto, id: FieldIdVo.fromStringOrCreate(dto.id).value })
    return field
  }

  override computed = true

  override type = FORMULA_TYPE

  override accept(visitor: IFieldVisitor): void {
    visitor.formula(this)
  }

  override get valueSchema() {
    return z.any()
  }

  override getSpec(condition: IFormulaFieldCondition) {
    const spec = match(condition)
      .with({ op: "eq" }, ({ value }) => new FormulaEqual(value, this.id))
      .with({ op: "neq" }, ({ value }) => new FormulaEqual(value, this.id).not())
      .with({ op: "gt" }, ({ value }) => new FormulaGT(value, this.id))
      .with({ op: "gte" }, ({ value }) => new FormulaGTE(value, this.id))
      .with({ op: "lt" }, ({ value }) => new FormulaLT(value, this.id))
      .with({ op: "lte" }, ({ value }) => new FormulaLTE(value, this.id))
      .with({ op: "is_empty" }, () => new StringEmpty(this.id))
      .with({ op: "is_not_empty" }, () => new StringEmpty(this.id).not())
      .exhaustive()

    return Option(spec)
  }

  protected override getConditionSchema(optionType: z.ZodTypeAny): IFormulaFieldConditionSchema {
    return createFormulaFieldCondition(optionType)
  }

  override getMutationSpec(value: FormulaFieldValue): Option<RecordComositeSpecification> {
    return Some(new FormulaEqual(value.value ?? null, this.id))
  }

  override get aggregate() {
    return formulaFieldAggregate
  }

  get fn() {
    return this.option.mapOr("", (o) => o.fn)
  }

  get returnType() {
    return this.metadata.mapOr("any", (m) => m.returnType)
  }

  override toJSON() {
    return {
      ...super.toJSON(),
      metadata: this.metadata.into(null),
    }
  }
}
