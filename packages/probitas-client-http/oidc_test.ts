import { assert, assertEquals, assertFalse, assertRejects } from "@std/assert";
import { createOidcHttpClient } from "./oidc.ts";

function createMockFetch(
  handler: (req: Request) => Response | Promise<Response>,
): typeof fetch {
  return (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init);
    return Promise.resolve(handler(request));
  };
}

Deno.test("createOidcHttpClient", async (t) => {
  await t.step("returns OidcHttpClient with OIDC methods", async () => {
    const client = await createOidcHttpClient({
      url: "http://localhost:3000",
      oidc: {
        authUrl: "/oauth/authorize",
        tokenUrl: "/oauth/token",
        clientId: "test-client",
      },
    });

    // Check that client has OIDC methods
    assertEquals(typeof client.login, "function");
    assertEquals(typeof client.getToken, "function");
    assertEquals(typeof client.logout, "function");

    // Check that client still has HTTP methods
    assertEquals(typeof client.get, "function");
    assertEquals(typeof client.post, "function");
  });

  await t.step("has default OIDC configuration", async () => {
    const client = await createOidcHttpClient({
      url: "http://localhost:3000",
      oidc: {
        authUrl: "/oauth/authorize",
        tokenUrl: "/oauth/token",
        clientId: "test-client",
      },
    });

    // Defaults should be applied internally
    // We'll verify through behavior in subsequent tests
    assert(client);
  });
});

Deno.test("OidcHttpClient.login", async (t) => {
  await t.step("performs Authorization Code Grant flow", async () => {
    const requests: Request[] = [];
    let capturedState: string | null = null;

    const mockFetch = createMockFetch((req) => {
      requests.push(req.clone());

      // Step 1: GET /oauth/authorize (login form)
      if (req.method === "GET" && req.url.includes("/oauth/authorize")) {
        // Extract state from query parameters
        const url = new URL(req.url);
        capturedState = url.searchParams.get("state");

        return new Response("<form>Login Form</form>", {
          status: 200,
          headers: {
            "Content-Type": "text/html",
            "Set-Cookie": "session=test-session; Path=/",
          },
        });
      }

      // Step 2: POST /oauth/authorize (form submission)
      if (req.method === "POST" && req.url.includes("/oauth/authorize")) {
        // Return same state that client sent
        return new Response("", {
          status: 302,
          headers: {
            Location:
              `http://localhost/callback?code=test-code&state=${capturedState}`,
            "Set-Cookie": "session=; Max-Age=0",
          },
        });
      }

      // Step 3: POST /oauth/token (code exchange)
      if (req.method === "POST" && req.url.includes("/oauth/token")) {
        return new Response(
          JSON.stringify({
            access_token: "test-access-token",
            token_type: "Bearer",
            expires_in: 3600,
            refresh_token: "test-refresh-token",
            id_token: "test-id-token",
            scope: "openid profile",
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      return new Response("Not Found", { status: 404 });
    });

    const client = await createOidcHttpClient({
      url: "http://localhost:3000",
      oidc: {
        authUrl: "/oauth/authorize",
        tokenUrl: "/oauth/token",
        clientId: "test-client",
      },
      fetch: mockFetch,
    });

    const result = await client.login({
      type: "authorization_code",
      username: "testuser",
      password: "password123",
    });

    // Verify flow executed 3 requests
    assertEquals(requests.length, 3);

    // Verify Step 1: GET login form
    assertEquals(requests[0].method, "GET");
    assert(requests[0].url.includes("/oauth/authorize"));
    assert(requests[0].url.includes("redirect_uri="));
    assert(requests[0].url.includes("response_type=code"));

    // Verify Step 2: POST form submission
    assertEquals(requests[1].method, "POST");
    const formBody = await requests[1].text();
    const formParams = new URLSearchParams(formBody);
    assertEquals(formParams.get("username"), "testuser");
    assertEquals(formParams.get("password"), "password123");

    // Verify Step 3: POST token exchange
    assertEquals(requests[2].method, "POST");
    const tokenBody = await requests[2].text();
    const tokenParams = new URLSearchParams(tokenBody);
    assertEquals(tokenParams.get("grant_type"), "authorization_code");
    assertEquals(tokenParams.get("code"), "test-code");
    assertEquals(tokenParams.get("client_id"), "test-client");

    // Verify result
    assert(result.ok);
    assertEquals(result.token.accessToken, "test-access-token");
    assertEquals(result.token.tokenType, "Bearer");
    assertEquals(result.token.expiresIn, 3600);
    assertEquals(result.token.refreshToken, "test-refresh-token");
  });

  await t.step("sets Authorization header after successful login", async () => {
    let authHeader: string | null = null;
    let state: string | null = null;

    const mockFetch = createMockFetch((req) => {
      if (req.method === "GET" && req.url.includes("/oauth/authorize")) {
        const url = new URL(req.url);
        state = url.searchParams.get("state");
        return new Response("<form>", { status: 200 });
      }
      if (req.method === "POST" && req.url.includes("/oauth/authorize")) {
        return new Response("", {
          status: 302,
          headers: {
            Location: `http://localhost/callback?code=abc&state=${state}`,
          },
        });
      }
      if (req.method === "POST" && req.url.includes("/oauth/token")) {
        return new Response(
          JSON.stringify({
            access_token: "test-token",
            token_type: "Bearer",
          }),
          { status: 200 },
        );
      }

      // Capture Authorization header from subsequent request
      authHeader = req.headers.get("Authorization");
      return new Response(JSON.stringify({ id: 1 }), { status: 200 });
    });

    const client = await createOidcHttpClient({
      url: "http://localhost:3000",
      oidc: {
        authUrl: "/oauth/authorize",
        tokenUrl: "/oauth/token",
        clientId: "test-client",
      },
      fetch: mockFetch,
    });

    const loginResult = await client.login({
      type: "authorization_code",
      username: "user",
      password: "pass",
    });
    assert(loginResult.ok);

    // Make a request after login
    await client.get("/api/profile");

    assertEquals(authHeader, "Bearer test-token");
  });

  await t.step("normalizes token_type to Title Case", async () => {
    let state: string | null = null;

    const mockFetch = createMockFetch((req) => {
      if (req.method === "GET" && req.url.includes("/oauth/authorize")) {
        const url = new URL(req.url);
        state = url.searchParams.get("state");
        return new Response("<form>", { status: 200 });
      }
      if (req.method === "POST" && req.url.includes("/oauth/authorize")) {
        return new Response("", {
          status: 302,
          headers: {
            Location: `http://localhost/callback?code=abc&state=${state}`,
          },
        });
      }
      if (req.method === "POST" && req.url.includes("/oauth/token")) {
        return new Response(
          JSON.stringify({
            access_token: "test-token",
            token_type: "bearer", // lowercase
          }),
          { status: 200 },
        );
      }
      return new Response("", { status: 404 });
    });

    const client = await createOidcHttpClient({
      url: "http://localhost:3000",
      oidc: {
        authUrl: "/oauth/authorize",
        tokenUrl: "/oauth/token",
        clientId: "test-client",
      },
      fetch: mockFetch,
    });

    const result = await client.login({
      type: "authorization_code",
      username: "user",
      password: "pass",
    });

    assert(result.ok);
    // Should be normalized to "Bearer"
    assertEquals(result.token.tokenType, "Bearer");
  });

  await t.step("returns error when authorization fails", async () => {
    let state: string | null = null;

    const mockFetch = createMockFetch((req) => {
      if (req.method === "GET" && req.url.includes("/oauth/authorize")) {
        const url = new URL(req.url);
        state = url.searchParams.get("state");
        return new Response("<form>", { status: 200 });
      }
      if (req.method === "POST" && req.url.includes("/oauth/authorize")) {
        // Return error in redirect
        return new Response("", {
          status: 302,
          headers: {
            Location:
              `http://localhost/callback?error=access_denied&error_description=User%20denied%20access&state=${state}`,
          },
        });
      }
      return new Response("", { status: 404 });
    });

    const client = await createOidcHttpClient({
      url: "http://localhost:3000",
      oidc: {
        authUrl: "/oauth/authorize",
        tokenUrl: "/oauth/token",
        clientId: "test-client",
      },
      fetch: mockFetch,
    });

    const result = await client.login({
      type: "authorization_code",
      username: "wrong",
      password: "credentials",
    });

    assertFalse(result.ok);
    assertEquals(result.error.code, "access_denied");
    assertEquals(result.error.message, "User denied access");
  });

  await t.step("returns error on invalid token response", async () => {
    let state: string | null = null;

    const mockFetch = createMockFetch((req) => {
      if (req.method === "GET" && req.url.includes("/oauth/authorize")) {
        const url = new URL(req.url);
        state = url.searchParams.get("state");
        return new Response("<form>", { status: 200 });
      }
      if (req.method === "POST" && req.url.includes("/oauth/authorize")) {
        return new Response("", {
          status: 302,
          headers: {
            Location: `http://localhost/callback?code=abc&state=${state}`,
          },
        });
      }
      if (req.method === "POST" && req.url.includes("/oauth/token")) {
        return new Response(
          JSON.stringify({
            // Missing required fields: access_token and token_type
            expires_in: 3600,
          }),
          { status: 200 },
        );
      }
      return new Response("", { status: 404 });
    });

    const client = await createOidcHttpClient({
      url: "http://localhost:3000",
      oidc: {
        authUrl: "/oauth/authorize",
        tokenUrl: "/oauth/token",
        clientId: "test-client",
      },
      fetch: mockFetch,
    });

    const result = await client.login({
      type: "authorization_code",
      username: "user",
      password: "pass",
    });

    assertFalse(result.ok);
    assertEquals(result.error.code, "server_error");
    assert(result.error.message.includes("missing required fields"));
  });
});

Deno.test("OidcHttpClient.getToken", async (t) => {
  await t.step("returns null when not authenticated", async () => {
    const client = await createOidcHttpClient({
      url: "http://localhost:3000",
      oidc: {
        authUrl: "/oauth/authorize",
        tokenUrl: "/oauth/token",
        clientId: "test-client",
      },
    });

    assertEquals(client.getToken(), null);
  });

  await t.step("returns token after successful login", async () => {
    let state: string | null = null;

    const mockFetch = createMockFetch((req) => {
      if (req.method === "GET") {
        const url = new URL(req.url);
        state = url.searchParams.get("state");
        return new Response("<form>", { status: 200 });
      }
      if (req.method === "POST" && req.url.includes("/oauth/authorize")) {
        return new Response("", {
          status: 302,
          headers: {
            Location: `http://localhost/callback?code=abc&state=${state}`,
          },
        });
      }
      return new Response(
        JSON.stringify({
          access_token: "test-token",
          token_type: "Bearer",
          expires_in: 3600,
          refresh_token: "refresh-token",
        }),
        { status: 200 },
      );
    });

    const client = await createOidcHttpClient({
      url: "http://localhost:3000",
      oidc: {
        authUrl: "/oauth/authorize",
        tokenUrl: "/oauth/token",
        clientId: "test-client",
      },
      fetch: mockFetch,
    });

    const loginResult = await client.login({
      type: "authorization_code",
      username: "user",
      password: "pass",
    });
    assert(loginResult.ok);

    const token = client.getToken();
    assertEquals(token?.accessToken, "test-token");
    assertEquals(token?.tokenType, "Bearer");
    assertEquals(token?.expiresIn, 3600);
    assertEquals(token?.refreshToken, "refresh-token");
  });
});

Deno.test("OidcHttpClient.logout", async (t) => {
  await t.step("clears token state", async () => {
    let state: string | null = null;

    const mockFetch = createMockFetch((req) => {
      if (req.method === "GET") {
        const url = new URL(req.url);
        state = url.searchParams.get("state");
        return new Response("<form>", { status: 200 });
      }
      if (req.method === "POST" && req.url.includes("/oauth/authorize")) {
        return new Response("", {
          status: 302,
          headers: {
            Location: `http://localhost/callback?code=abc&state=${state}`,
          },
        });
      }
      return new Response(
        JSON.stringify({
          access_token: "test-token",
          token_type: "Bearer",
        }),
        { status: 200 },
      );
    });

    const client = await createOidcHttpClient({
      url: "http://localhost:3000",
      oidc: {
        authUrl: "/oauth/authorize",
        tokenUrl: "/oauth/token",
        clientId: "test-client",
      },
      fetch: mockFetch,
    });

    // Login first
    const loginResult = await client.login({
      type: "authorization_code",
      username: "user",
      password: "pass",
    });
    assert(loginResult.ok);
    assert(client.getToken() !== null);

    // Logout
    await client.logout();

    // Token should be cleared
    assertEquals(client.getToken(), null);
  });
});

Deno.test("OIDC Discovery", async (t) => {
  await t.step("fetches endpoints via Discovery", async () => {
    const mockFetch = createMockFetch((req) => {
      if (req.url.includes("/.well-known/openid-configuration")) {
        return new Response(
          JSON.stringify({
            issuer: "http://localhost:3000",
            authorization_endpoint: "http://localhost:3000/oauth/authorize",
            token_endpoint: "http://localhost:3000/oauth/token",
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      }
      return new Response(
        JSON.stringify({ access_token: "token", token_type: "Bearer" }),
        { status: 200 },
      );
    });

    const client = await createOidcHttpClient({
      url: "http://localhost:3000",
      oidc: {
        issuer: "http://localhost:3000",
        clientId: "test-client",
      },
      fetch: mockFetch,
    });

    // Verify client was created successfully
    assert(client);
    assertEquals(typeof client.login, "function");
  });

  await t.step("manual config overrides Discovery", async () => {
    let discoveryRequested = false;

    const mockFetch = createMockFetch((req) => {
      if (req.url.includes("/.well-known/openid-configuration")) {
        discoveryRequested = true;
        return new Response(
          JSON.stringify({
            issuer: "http://localhost:3000",
            authorization_endpoint: "http://localhost:3000/discovered/auth",
            token_endpoint: "http://localhost:3000/discovered/token",
          }),
          { status: 200 },
        );
      }
      return new Response(
        JSON.stringify({ access_token: "token", token_type: "Bearer" }),
        { status: 200 },
      );
    });

    const client = await createOidcHttpClient({
      url: "http://localhost:3000",
      oidc: {
        issuer: "http://localhost:3000",
        authUrl: "/custom/authorize", // Manual override
        tokenUrl: "/custom/token", // Manual override
        clientId: "test-client",
      },
      fetch: mockFetch,
    });

    // Discovery should not be requested when both endpoints are manually configured
    assertFalse(discoveryRequested);
    assert(client);
  });

  await t.step(
    "throws error when Discovery fails and no manual config",
    async () => {
      const mockFetch = createMockFetch(() => {
        return new Response("Not Found", { status: 404 });
      });

      await assertRejects(
        async () => {
          await createOidcHttpClient({
            url: "http://localhost:3000",
            oidc: {
              issuer: "http://localhost:3000",
              clientId: "test-client",
            },
            fetch: mockFetch,
          });
        },
        Error,
        "OIDC endpoints not configured",
      );
    },
  );

  await t.step(
    "throws error when neither issuer nor endpoints provided",
    async () => {
      await assertRejects(
        async () => {
          await createOidcHttpClient({
            url: "http://localhost:3000",
            oidc: {
              clientId: "test-client",
              // No issuer, authUrl, or tokenUrl
            },
          });
        },
        Error,
        "OIDC endpoints not configured",
      );
    },
  );
});
