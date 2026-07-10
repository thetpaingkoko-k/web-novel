import { setupWorker } from "msw/browser"
import { browserHandlers } from "./browser-handlers"

export const worker = setupWorker(...browserHandlers)

/** Starts the dev mock backend. No-op unless called (main.tsx gates on a flag). */
export async function startMockWorker() {
  await worker.start({
    onUnhandledRequest: "bypass",
    quiet: true,
  })
  // eslint-disable-next-line no-console
  console.info(
    "%c[WebNovel] Dev mock backend active.",
    "color:#a855f7;font-weight:bold",
    "\nSeeded logins (any password): reader@example.com · author@example.com · hobbyist@example.com · admin@example.com"
  )
}
