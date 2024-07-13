import { ValueObject } from "@undb/domain"
import { z } from "@undb/zod"
import { isEqual } from "radash"
import { fieldId, type Field } from "../../../schema"

export const viewSortOption = z.object({
  fieldId,
  direction: z.enum(["asc", "desc"]),
})

export const viewSort = viewSortOption.array()

export type IViewSort = z.infer<typeof viewSort>

export class ViewSort extends ValueObject<IViewSort> {
  constructor(props: IViewSort) {
    super(props)
  }

  public isEqual(sort: IViewSort): boolean {
    return isEqual(sort, this.props)
  }

  public toJSON(): IViewSort {
    return [...this.props]
  }

  public fieldIds(): Set<string> {
    return this.props.reduce((acc, { fieldId }) => acc.add(fieldId), new Set<string>())
  }

  public deleteField(field: Field): ViewSort {
    return new ViewSort(this.props.filter((sort) => sort.fieldId !== field.id.value))
  }

  public get count() {
    return this.props.length
  }
}
