import { CharStreams, CommonTokenStream } from "antlr4ts"
import { FormulaVisitor } from "./formula.visitor"
import { FormulaLexer } from "./grammar/FormulaLexer"
import { FormulaParser } from "./grammar/FormulaParser"

export function createParser(input: string) {
  const inputStream = CharStreams.fromString(input)
  const lexer = new FormulaLexer(inputStream)
  const tokenStream = new CommonTokenStream(lexer)
  return new FormulaParser(tokenStream)
}

export function parseFormula(input: string) {
  const parser = createParser(input)

  const tree = parser.formula()

  const visitor = new FormulaVisitor()
  const parsedFormula = visitor.visit(tree)

  return parsedFormula
}
