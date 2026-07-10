import { http, HttpResponse } from "msw"
import { beforeEach, describe, expect, it } from "vitest"
import { apiClient, tokenStorage } from "@/api/client"
import { server } from "@/test/mocks/server"

describe("apiClient auth refresh", () => {
  beforeEach(() => {
    tokenStorage.setTokens("expired-token", "valid-refresh-token")
  })

  it("retries the original request after refreshing an expired token", async () => {
    let calls = 0
    server.use(
      http.get("/api/v1/users/me", () => {
        calls += 1
        if (calls === 1) return HttpResponse.json({ message: "unauthorized" }, { status: 401 })
        return HttpResponse.json({ userId: 1, username: "reader1" })
      }),
      http.post("/api/v1/auth/refresh", () =>
        HttpResponse.json({ accessToken: "new-token", refreshToken: "new-refresh" })
      )
    )

    const { data } = await apiClient.get("/users/me")

    expect(data.username).toBe("reader1")
    expect(tokenStorage.getAccessToken()).toBe("new-token")
  })
})
