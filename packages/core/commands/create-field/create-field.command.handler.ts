import type { ICommandHandler } from '@egodb/domain'
import type { ITableRepository } from '../../table.repository'
import type { CreateFieldCommand } from './create-field.command'

type ICreateFieldCommandHandler = ICommandHandler<CreateFieldCommand, void>

export class CreateFieldCommandHandler implements ICreateFieldCommandHandler {
  constructor(protected readonly tableRepo: ITableRepository) {}

  async execute(command: CreateFieldCommand): Promise<void> {
    const table = (await this.tableRepo.findOneById(command.tableId)).unwrap()

    const spec = table.createField(command.field)

    await this.tableRepo.updateOneById(table.id.value, spec)
  }
}
