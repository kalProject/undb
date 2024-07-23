import { TableIdVo } from "../../../../table-id.vo"
import { getSpec, replaceCondtionFieldNameWithFieldId } from "../../../schema/fields/condition"
import { RecordComositeSpecification, RecordDO, type IBulkDeleteRecordsDTO } from "../../record"
import type { RecordsService } from "../records.service"

export async function bulkdeleteRecordsMethod(
  this: RecordsService,
  tableId: string,
  dto: IBulkDeleteRecordsDTO,
): Promise<RecordDO[]> {
  const id = new TableIdVo(tableId)
  const table = (await this.tableRepository.findOneById(id)).expect("Table not found")

  let filter = dto.filter
  if (dto.isOpenapi) {
    filter = replaceCondtionFieldNameWithFieldId(filter, table.schema)
  }

  const spec = getSpec(table.schema, filter).expect("Invalid filter") as RecordComositeSpecification

  const records = await this.repo.find(table, spec)

  for (const record of records) {
    record.delete(table)
  }

  await this.repo.deleteByIds(table, records)

  return records
}
