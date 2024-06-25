import staticPlugin from "@elysiajs/static"
import { singleton } from "@undb/di"
import Elysia from "elysia"

@singleton()
export class Web {
  route() {
    return new Elysia()
      .use(staticPlugin({ prefix: "/", assets: "dist" }))
      .get("/", () => Bun.file("dist/index.html"))
      .get("/t/*", () => Bun.file("dist/index.html"))
  }
}
