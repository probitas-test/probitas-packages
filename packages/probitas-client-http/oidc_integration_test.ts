/**
 * Integration tests for OIDC HTTP Client using echo-http.
 *
 * Run with:
 *   docker compose up -d echo-http
 *   deno test -A packages/probitas-client-http/oidc_integration_test.ts
 *   docker compose down
 */

import { assert, assertEquals, assertFalse } from "@std/assert";
import { createOidcHttpClient } from "./oidc.ts";

const ECHO_HTTP_URL = Deno.env.get("ECHO_HTTP_URL") ?? "http://localhost:8080";

async function isEchoHttpAvailable(): Promise<boolean> {
  try {
    const res = await fetch(`${ECHO_HTTP_URL}/health`, {
      signal: AbortSignal.timeout(1000),
    });
    await res.body?.cancel();
    return res.ok;
  } catch {
    return false;
  }
}

Deno.test({
  name: "Integration: OIDC Discovery",
  ignore: !(await isEchoHttpAvailable()),
  async fn(t) {
    await t.step("fetches OIDC discovery metadata", async () => {
      // Test with testuser/testpass credentials in the URL path
      const issuer = `${ECHO_HTTP_URL}/oidc/testuser/testpass`;

      const client = await createOidcHttpClient({
        url: ECHO_HTTP_URL,
        oidc: {
          issuer,
          clientId: "test-client",
        },
      });

      // Client creation should succeed with discovery
      assert(client);
      assertEquals(typeof client.login, "function");
      assertEquals(typeof client.getToken, "function");

      await client.close();
    });

    await t.step("discovered endpoints match expected URLs", async () => {
      // Manually fetch discovery metadata to verify structure
      const issuer = `${ECHO_HTTP_URL}/oidc/testuser/testpass`;
      const wellKnownUrl = `${issuer}/.well-known/openid-configuration`;

      const res = await fetch(wellKnownUrl);
      assert(res.ok, "Discovery endpoint should be accessible");

      const metadata = await res.json();

      assertEquals(metadata.issuer, issuer);
      assertEquals(
        metadata.authorization_endpoint,
        `${issuer}/authorize`,
      );
      assertEquals(metadata.token_endpoint, `${issuer}/token`);
      assertEquals(metadata.response_types_supported, ["code"]);
      assertEquals(metadata.grant_types_supported, ["authorization_code"]);
    });
  },
});

Deno.test({
  name: "Integration: OIDC Authorization Code Grant",
  ignore: !(await isEchoHttpAvailable()),
  async fn(t) {
    await t.step("successful login with correct credentials", async () => {
      const issuer = `${ECHO_HTTP_URL}/oidc/testuser/testpass`;

      const client = await createOidcHttpClient({
        url: ECHO_HTTP_URL,
        oidc: {
          issuer,
          clientId: "test-client",
        },
      });

      // Login should succeed with matching credentials
      const result = await client.login({
        type: "authorization_code",
        username: "testuser",
        password: "testpass",
      });

      assert(result.ok, "Login should succeed");
      assert(result.token.accessToken, "Should have access token");
      assertEquals(result.token.tokenType, "Bearer");
      assert(result.token.expiresIn, "Should have expires_in");

      // Verify token is stored
      const token = client.getToken();
      assertEquals(token?.accessToken, result.token.accessToken);

      await client.close();
    });

    await t.step("failed login with incorrect credentials", async () => {
      const issuer = `${ECHO_HTTP_URL}/oidc/testuser/testpass`;

      const client = await createOidcHttpClient({
        url: ECHO_HTTP_URL,
        oidc: {
          issuer,
          clientId: "test-client",
        },
      });

      // Login should fail with non-matching credentials
      const result = await client.login({
        type: "authorization_code",
        username: "wronguser",
        password: "wrongpass",
      });

      assertFalse(result.ok, "Login should fail");
      assert(result.error.message, "Should have error message");

      await client.close();
    });

    await t.step("Authorization header is set after login", async () => {
      const issuer = `${ECHO_HTTP_URL}/oidc/testuser/testpass`;

      const client = await createOidcHttpClient({
        url: ECHO_HTTP_URL,
        oidc: {
          issuer,
          clientId: "test-client",
        },
      });

      // Login
      const loginResult = await client.login({
        type: "authorization_code",
        username: "testuser",
        password: "testpass",
      });
      assert(loginResult.ok);

      // Make a request to /headers to verify Authorization header
      const response = await client.get("/headers");
      assert(response.ok);

      const data = response.json as { headers: Record<string, string> };
      assertEquals(
        data.headers["Authorization"],
        `Bearer ${loginResult.token.accessToken}`,
      );

      await client.close();
    });
  },
});

Deno.test({
  name: "Integration: OIDC with manual endpoint configuration",
  ignore: !(await isEchoHttpAvailable()),
  async fn(t) {
    await t.step("creates client with manual endpoints", async () => {
      // Manually specify endpoints instead of using discovery
      const basePath = "/oidc/testuser/testpass";

      const client = await createOidcHttpClient({
        url: ECHO_HTTP_URL,
        oidc: {
          authUrl: `${basePath}/authorize`,
          tokenUrl: `${basePath}/token`,
          clientId: "test-client",
        },
      });

      // Client creation should succeed
      assert(client);
      assertEquals(typeof client.login, "function");

      await client.close();
    });
  },
});

Deno.test({
  name: "Integration: OIDC token management",
  ignore: !(await isEchoHttpAvailable()),
  async fn(t) {
    await t.step("getToken returns null before login", async () => {
      const issuer = `${ECHO_HTTP_URL}/oidc/testuser/testpass`;

      const client = await createOidcHttpClient({
        url: ECHO_HTTP_URL,
        oidc: {
          issuer,
          clientId: "test-client",
        },
      });

      const token = client.getToken();
      assertEquals(token, null);

      await client.close();
    });

    await t.step("logout clears token", async () => {
      const issuer = `${ECHO_HTTP_URL}/oidc/testuser/testpass`;

      const client = await createOidcHttpClient({
        url: ECHO_HTTP_URL,
        oidc: {
          issuer,
          clientId: "test-client",
        },
      });

      // Login
      const loginResult = await client.login({
        type: "authorization_code",
        username: "testuser",
        password: "testpass",
      });
      assert(loginResult.ok);
      assert(client.getToken() !== null);

      // Logout should clear token
      await client.logout();
      assertEquals(client.getToken(), null);

      await client.close();
    });
  },
});
