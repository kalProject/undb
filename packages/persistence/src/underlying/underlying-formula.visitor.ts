import {
  AbstractParseTreeVisitor,
  AddSubExprContext,
  AndExprContext,
  ArgumentListContext,
  ComparisonExprContext,
  FormulaContext,
  FunctionCallContext,
  FunctionExprContext,
  MulDivModExprContext,
  NotExprContext,
  NumberExprContext,
  OrExprContext,
  ParenExprContext,
  StringExprContext,
  VariableContext,
  VariableExprContext,
  type FormulaFunction,
  type FormulaParserVisitor,
} from "@undb/formula"
import { FieldIdVo, type TableDo } from "@undb/table"
import { match } from "ts-pattern"

export class UnderlyingFormulaVisitor extends AbstractParseTreeVisitor<string> implements FormulaParserVisitor<string> {
  constructor(private readonly table: TableDo) {
    super()
  }

  protected defaultResult(): string {
    return ""
  }

  visitNumberExpr(ctx: NumberExprContext): string {
    return ctx.NUMBER().text
  }

  visitStringExpr(ctx: StringExprContext): string {
    return ctx.STRING().text
  }

  visitComparisonExpr(ctx: ComparisonExprContext): string {
    return this.visit(ctx.expression(0)) + ctx._op.text + this.visit(ctx.expression(1))
  }

  visitAndExpr(ctx: AndExprContext): string {
    return this.visit(ctx.expression(0)) + " AND " + this.visit(ctx.expression(1))
  }

  visitOrExpr(ctx: OrExprContext): string {
    return this.visit(ctx.expression(0)) + " OR " + this.visit(ctx.expression(1))
  }

  visitNotExpr(ctx: NotExprContext): string {
    return "NOT " + this.visit(ctx.expression())
  }

  visitAddSubExpr(ctx: AddSubExprContext): string {
    return this.visit(ctx.expression(0)) + ctx._op.text + this.visit(ctx.expression(1))
  }

  visitMulDivModExpr(ctx: MulDivModExprContext): string {
    return this.visit(ctx.expression(0)) + ctx._op.text + this.visit(ctx.expression(1))
  }

  visitVariable(ctx: VariableContext): string {
    const fieldId = ctx.IDENTIFIER().text
    const field = this.table.schema
      .getFieldById(new FieldIdVo(fieldId))
      .expect(`variable ${fieldId} not found in table ${this.table.name.value}`)
    if (field.type === "currency") {
      return `(${fieldId}/100)`
    }
    return fieldId
  }

  visitFormula(ctx: FormulaContext): string {
    const expr = ctx.expression()
    return this.visit(expr)
  }

  visitFunctionExpr(ctx: FunctionExprContext): string {
    return this.visit(ctx.functionCall())
  }

  visitVariableExpr(ctx: VariableExprContext): string {
    return this.visit(ctx.variable())
  }

  visitParenExpr(ctx: ParenExprContext): string {
    return this.visit(ctx.expression())
  }

  private arguments(ctx: FunctionCallContext): string[] {
    return ctx
      .argumentList()!
      .expression()
      .map((expr) => this.visit(expr))
  }
  visitFunctionCall(ctx: FunctionCallContext): string {
    const functionName = ctx.IDENTIFIER().text as FormulaFunction
    return match(functionName)
      .with("ADD", "SUM", () => {
        const fn = this.arguments(ctx).join(" + ")
        return `(${fn})`
      })
      .with("SUBTRACT", () => {
        const fn = this.arguments(ctx).join(" - ")
        return `(${fn})`
      })
      .with("MULTIPLY", () => {
        const fn = this.arguments(ctx).join(" * ")
        return `(${fn})`
      })
      .with("DIVIDE", () => {
        const fn = this.arguments(ctx).join(" / ")
        return `(${fn})`
      })
      .with("CONCAT", () => {
        const fn = this.arguments(ctx)
          .map((arg) => `COALESCE(${arg}, '')`)
          .join(" || ")
        return `(${fn})`
      })
      .with("AVERAGE", () => {
        const args = this.arguments(ctx)
        return `(
        (${args.map((arg) => `COALESCE(${arg}, 0)`).join(" + ")})
        /
        (NULLIF(
          ${args.map((arg) => `(CASE WHEN ${arg} IS NULL THEN 0 ELSE 1 END)`).join(" + ")}
        , 0)
        ))`
      })
      .with("LEFT", () => {
        const args = this.arguments(ctx)
        return `SUBSTR(${args[0]}, 1, ${args[1]})`
      })
      .with("RIGHT", () => {
        const args = this.arguments(ctx)
        return `SUBSTR(${args[0]}, -${args[1]}, ${args[1]})`
      })
      .with("MID", () => {
        const args = this.arguments(ctx)
        return `SUBSTR(${args[0]}, ${args[1]}, ${args[2]})`
      })
      .with("AND", () => {
        const args = this.arguments(ctx)
        return `(${args.map((arg) => `COALESCE(${arg}, FALSE)`).join(" AND ")})`
      })
      .with("OR", () => {
        const args = this.arguments(ctx)
        return `(${args.map((arg) => `COALESCE(${arg}, FALSE)`).join(" OR ")})`
      })
      .with("NOT", () => {
        const args = this.arguments(ctx)
        return `NOT ${args[0]}`
      })
      .with("SEARCH", () => {
        const args = this.arguments(ctx)
        return `COALESCE(INSTR(LOWER(COALESCE(${args[1]}, '')), LOWER(COALESCE(${args[0]}, ''))), 0)`
      })
      .with("LEN", () => {
        const args = this.arguments(ctx)
        return `LENGTH(${args[0]})`
      })
      .with("REPEAT", () => {
        const args = this.arguments(ctx)
        // args[0] 是要重复的字符串，args[1] 是重复次数
        return `SUBSTR(REPLACE(HEX(ZEROBLOB(${args[1]})), '00', ${args[0]}), 1, LENGTH(${args[0]}) * ${args[1]})`
      })
      .otherwise(() => {
        const args = ctx.argumentList() ? this.visit(ctx.argumentList()!) : ""
        return `${functionName}(${args})`
      })
  }

  visitArgumentList(ctx: ArgumentListContext): string {
    return ctx
      .expression()
      .map((expr) => this.visit(expr))
      .join(", ")
  }
}
