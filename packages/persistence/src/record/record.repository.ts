import { executionContext } from "@undb/context/server"
import { inject, singleton } from "@undb/di"
import { None, Some, type IUnitOfWork, type Option } from "@undb/domain"
import {
  CREATED_BY_TYPE,
  ID_TYPE,
  RecordComositeSpecification,
  RecordDO,
  TableIdVo,
  UPDATED_BY_TYPE,
  injectRecordOutboxService,
  injectTableRepository,
  type Field,
  type IRecordOutboxService,
  type IRecordRepository,
  type ITableRepository,
  type RecordId,
  type TableDo,
} from "@undb/table"
import type { CompiledQuery, ExpressionBuilder } from "kysely"
import type { IQueryBuilder } from "../qb"
import { injectQueryBuilder } from "../qb.provider"
import { UnderlyingTable } from "../underlying/underlying-table"
import { injectDbUnitOfWork } from "../uow"
import { RecordQueryHelper } from "./record-query.helper"
import { getRecordDTOFromEntity } from "./record-utils"
import { RecordMapper } from "./record.mapper"
import { RecordMutateVisitor } from "./record.mutate-visitor"

@singleton()
export class RecordRepository implements IRecordRepository {
  constructor(
    @injectQueryBuilder()
    private readonly qb: IQueryBuilder,
    @injectRecordOutboxService()
    private readonly outboxService: IRecordOutboxService,
    @injectDbUnitOfWork()
    public readonly uow: IUnitOfWork,
    @inject(RecordMapper)
    public readonly mapper: RecordMapper,
    @injectTableRepository()
    private readonly tableRepo: ITableRepository,
    @inject(RecordQueryHelper)
    private readonly helper: RecordQueryHelper,
  ) {}

  private async getForeignTables(table: TableDo, fields: Field[]): Promise<Map<string, TableDo>> {
    const map = new Map<string, TableDo>()

    const foriengTableIds = table.schema.getForeignTableIds(fields)
    const foreignTables = await this.tableRepo.findManyByIds([...foriengTableIds].map((id) => new TableIdVo(id)))
    for (const foreignTable of foreignTables) {
      map.set(foreignTable.id.value, foreignTable)
    }

    return map
  }

  // @transactional()
  async insert(table: TableDo, record: RecordDO): Promise<void> {
    const context = executionContext.getStore()
    const userId = context?.user?.userId!

    const t = new UnderlyingTable(table)

    const spec = record.toInsertSpec(table)

    const sql: CompiledQuery[] = []

    await this.qb
      .insertInto(t.name)
      .values((eb) => {
        const visitor = new RecordMutateVisitor(table, record, this.qb, eb)
        spec.accept(visitor)

        sql.push(...visitor.sql)

        return { ...visitor.data, [CREATED_BY_TYPE]: userId, [UPDATED_BY_TYPE]: userId }
      })
      .executeTakeFirst()
    for (const s of sql) {
      await this.qb.executeQuery(s)
    }
    await this.outboxService.save(record)
  }

  async bulkInsert(table: TableDo, records: RecordDO[]): Promise<void> {
    const context = executionContext.getStore()
    const userId = context?.user?.userId!

    const t = new UnderlyingTable(table)

    const sql: CompiledQuery[] = []

    await this.qb
      .insertInto(t.name)
      .values((eb) =>
        records.map((record) => {
          const spec = record.toInsertSpec(table)
          const visitor = new RecordMutateVisitor(table, record, this.qb, eb)
          spec.accept(visitor)

          sql.push(...visitor.sql)

          return { ...visitor.data, [CREATED_BY_TYPE]: userId, [UPDATED_BY_TYPE]: userId }
        }),
      )
      .executeTakeFirst()
    for (const s of sql) {
      await this.qb.executeQuery(s)
    }
    await this.outboxService.saveMany(records)
  }

  async findOne(table: TableDo, spec: Option<RecordComositeSpecification>): Promise<Option<RecordDO>> {
    const foreignTables = await this.getForeignTables(table, table.schema.fields)
    const qb = this.helper.createQuery(table, foreignTables, table.schema.fields, spec)

    const record = await qb.limit(1).executeTakeFirst()
    const dto = record ? getRecordDTOFromEntity(table, record) : undefined
    return dto ? Some(RecordDO.fromJSON(table, dto)) : None
  }

  async find(table: TableDo, spec: RecordComositeSpecification): Promise<RecordDO[]> {
    const t = new UnderlyingTable(table)
    const foreignTables = await this.getForeignTables(table, table.schema.fields)
    const qb = this.helper.createQuery(table, foreignTables, table.schema.fields, Some(spec))
    const records = await qb.where(this.helper.handleWhere(table, Some(spec))).execute()

    return records.map((record) => {
      const dto = getRecordDTOFromEntity(table, record)
      return RecordDO.fromJSON(table, dto)
    })
  }

  async findOneById(table: TableDo, recordId: RecordId): Promise<Option<RecordDO>> {
    const foreignTables = await this.getForeignTables(table, table.schema.fields)
    const qb = this.helper.createQuery(table, foreignTables, table.schema.fields, None)

    const records = await qb.where(`${table.id.value}.${ID_TYPE}`, "=", recordId.value).limit(1).execute()

    if (!records.length) {
      return None
    }

    const dto = getRecordDTOFromEntity(table, records[0])
    return Some(RecordDO.fromJSON(table, dto))
  }

  async findByIds(table: TableDo, ids: RecordId[]): Promise<RecordDO[]> {
    const t = new UnderlyingTable(table)
    const foreignTables = await this.getForeignTables(table, table.schema.fields)
    const qb = this.helper.createQuery(table, foreignTables, table.schema.fields, None)

    const records = await qb
      .where(
        `${table.id.value}.${ID_TYPE}`,
        "in",
        ids.map((id) => id.value),
      )
      .execute()

    return records.map((record) => {
      const dto = getRecordDTOFromEntity(table, record)
      return RecordDO.fromJSON(table, dto)
    })
  }

  // @transactional()
  async updateOneById(table: TableDo, record: RecordDO, spec: Option<RecordComositeSpecification>): Promise<void> {
    if (spec.isNone()) return

    const context = executionContext.getStore()
    const userId = context?.user?.userId!

    const t = new UnderlyingTable(table)
    const sql: CompiledQuery[] = []

    await this.qb
      .updateTable(t.name)
      .set((eb) => {
        const visitor = new RecordMutateVisitor(table, record, this.qb, eb)
        spec.unwrap().accept(visitor)
        sql.push(...visitor.sql)
        return { ...visitor.data, [UPDATED_BY_TYPE]: userId }
      })
      .where(`${table.id.value}.${ID_TYPE}`, "=", record.id.value)
      .executeTakeFirst()

    for (const s of sql) {
      await this.qb.executeQuery(s)
    }

    await this.outboxService.save(record)
  }

  async bulkUpdate(
    table: TableDo,
    spec: RecordComositeSpecification,
    update: RecordComositeSpecification,
    records: RecordDO[],
  ): Promise<void> {
    const context = executionContext.getStore()
    const userId = context?.user?.userId!

    const t = new UnderlyingTable(table)
    const sql: CompiledQuery[] = []

    const qb = this.qb
    function handleUpdate() {
      return (eb: ExpressionBuilder<any, any>) => {
        let data = {}
        for (const record of records) {
          const visitor = new RecordMutateVisitor(table, record, qb, eb)
          update.accept(visitor)
          sql.push(...visitor.sql)
          data = { ...data, ...visitor.data }
        }

        return { ...data, [UPDATED_BY_TYPE]: userId }
      }
    }

    await this.qb
      .updateTable(t.name)
      .set(handleUpdate())
      .where(this.helper.handleWhere(table, Some(spec)))
      .execute()

    for (const s of sql) {
      await this.qb.executeQuery(s)
    }

    await this.outboxService.saveMany(records)
  }

  // @transactional()
  async deleteOneById(table: TableDo, record: RecordDO): Promise<void> {
    const t = new UnderlyingTable(table)
    // TODO: use deleted at
    await this.qb.deleteFrom(t.name).where(ID_TYPE, "=", record.id.value).executeTakeFirst()
    await this.outboxService.save(record)
  }

  async deleteByIds(table: TableDo, records: RecordDO[]): Promise<void> {
    const t = new UnderlyingTable(table)
    const ids = records.map((r) => r.id.value)
    await this.qb.deleteFrom(t.name).where(ID_TYPE, "in", ids).executeTakeFirst()
    await this.outboxService.saveMany(records)
  }
}
