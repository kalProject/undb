import { z } from "@undb/zod"
import { FieldConstraintVO, baseFieldConstraint } from "../../field-constraint.vo"
import { attachmentFieldValue } from "./attachment-field-value.vo"

export const attachmentFieldConstraint = z
  .object({
    max: z.number().int().positive(),
  })
  .merge(baseFieldConstraint)
  .partial()

export type IAttachmentFieldConstraint = z.infer<typeof attachmentFieldConstraint>

export class AttachmentFieldConstraint extends FieldConstraintVO<IAttachmentFieldConstraint> {
  constructor(dto: IAttachmentFieldConstraint) {
    super({
      required: dto.required,
      max: dto.max,
    })
  }
  override get schema() {
    let base = attachmentFieldValue
    const { required, max } = this.props
    if (!required) {
      base = base.min(0)
    } else {
      base = base.min(1)
    }

    if (max) {
      base = base.max(max)
    }

    return base
  }
}
