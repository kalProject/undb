import { type ISpaceMemberDTO, type ISpaceMemberQueryRepository } from "@undb/authz"
import type { SpaceMemberComositeSpecification } from "@undb/authz/src/workspace-member/workspace-member.composite-specification"
import { inject, singleton } from "@undb/di"
import { None, Option, Some } from "@undb/domain"
import type { IQueryBuilder } from "../qb"
import { injectQueryBuilder } from "../qb.provider"
import { MemberMapper } from "./member.mapper"
import { SpaceMemberFilterVisitor } from "./workspace-member.filter-visitor"

@singleton()
export class SpaceMemberQueryRepository implements ISpaceMemberQueryRepository {
  constructor(
    @inject(MemberMapper)
    private readonly mapper: MemberMapper,
    @injectQueryBuilder()
    private readonly qb: IQueryBuilder,
  ) {}

  async findOneById(id: string): Promise<Option<ISpaceMemberDTO>> {
    const member = await this.qb
      .selectFrom("undb_space_member")
      .selectAll()
      .leftJoin("undb_user", "undb_user.id", "undb_space_member.user_id")
      .where((eb) => eb.eb("undb_user.id", "=", id))
      .executeTakeFirst()

    if (!member) {
      return None
    }

    return Some(this.mapper.toDTO(member))
  }

  async findByIds(ids: [string, ...string[]]): Promise<ISpaceMemberDTO[]> {
    const members = await this.qb
      .selectFrom("undb_space_member")
      .selectAll()
      .leftJoin("undb_user", "undb_user.id", "undb_space_member.user_id")
      .where((eb) => eb.eb("undb_user.id", "in", ids))
      .execute()

    return members.map((m) => this.mapper.toDTO(m))
  }

  async find(spec: Option<SpaceMemberComositeSpecification>): Promise<ISpaceMemberDTO[]> {
    const members = await this.qb
      .selectFrom("undb_space_member")
      .selectAll()
      .leftJoin("undb_user", "undb_user.id", "undb_space_member.user_id")
      .where((eb) => {
        const visitor = new SpaceMemberFilterVisitor(eb)

        if (spec.isSome()) {
          spec.unwrap().accept(visitor)
        }
        return visitor.cond
      })
      .execute()

    return members.map((m) => this.mapper.toDTO(m))
  }
}
