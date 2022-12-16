import type { ITableSpec, ITableSpecVisitor, WithTableId, WithTableName } from '@egodb/core'
import type { Result } from 'oxide.ts'
import { Err, Ok } from 'oxide.ts'
import type { TableInMemory } from './table'

type TableInMemoryPredicate = (value: TableInMemory, index: number, obj: TableInMemory[]) => unknown
const opposite =
  (fn: TableInMemoryPredicate) =>
  (...args: Parameters<TableInMemoryPredicate>): boolean =>
    !fn(...args)

export class TableInMemoryQueryVisitor implements ITableSpecVisitor {
  private predicate?: TableInMemoryPredicate
  private isOpposite = false

  getPredicate(): Result<TableInMemoryPredicate, Error> {
    if (!this.predicate) {
      return Err(new Error('missing predicate'))
    }

    if (this.isOpposite) {
      return Ok(opposite(this.predicate))
    }

    return Ok(this.predicate)
  }

  not(): this {
    this.isOpposite = !this.isOpposite
    return this
  }

  and(ss: ITableSpec[]): void {
    const ps = ss.map((s) => {
      const visitor = new TableInMemoryQueryVisitor()
      s.accept(visitor)
      return visitor.getPredicate().unwrap()
    })

    this.predicate = (...args) => ps.every((p) => p(...args))
  }

  idEqual(s: WithTableId): void {
    this.predicate = (t) => t.id === s.id.value
  }

  nameEqual(s: WithTableName): void {
    this.predicate = (t) => t.name === s.name.value
  }

  filterEqual(): void {
    throw new Error('cannot query by filters')
  }
}
