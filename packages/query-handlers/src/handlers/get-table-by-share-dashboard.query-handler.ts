import { injectSpaceMemberService, type ISpaceMemberService } from "@undb/authz"
import { injectContext, type IContext } from "@undb/context"
import { setContextValue } from "@undb/context/server"
import { queryHandler } from "@undb/cqrs"
import { singleton } from "@undb/di"
import type { IQueryHandler } from "@undb/domain"
import { GetTableByShareDashboardQuery, type IGetTableByShareDashboardQuery } from "@undb/queries"
import { injectShareService, type IShareService } from "@undb/share"
import { injectSpaceService, type ISpaceService } from "@undb/space"
import { type ITableDTO } from "@undb/table"

@queryHandler(GetTableByShareDashboardQuery)
@singleton()
export class GetTableByShareDashboardQueryHandler implements IQueryHandler<any, ITableDTO> {
  constructor(
    @injectShareService()
    private readonly svc: IShareService,
    @injectSpaceService()
    private readonly spaceSvc: ISpaceService,
    @injectSpaceMemberService()
    private readonly spaceMemberSvc: ISpaceMemberService,
    @injectContext()
    private readonly context: IContext,
  ) {}

  async execute(query: IGetTableByShareDashboardQuery): Promise<ITableDTO> {
    const userId = this.context.mustGetCurrentUserId()
    const space = await this.spaceSvc.setSpaceContext(setContextValue, { shareId: query.shareId })
    await this.spaceMemberSvc.setSpaceMemberContext(setContextValue, space.id.value, userId)

    return this.svc.getTableByShareDashboard(query.shareId, query.tableId)
  }
}
