/**
 * OIDC (OpenID Connect) authentication helpers for HTTP client.
 *
 * This module provides utilities for testing OIDC flows with the HTTP client.
 * **NOT intended for production use** - use proper OIDC libraries in production.
 *
 * ## Features
 *
 * - **OIDC Discovery**: Auto-discover endpoints from `/.well-known/openid-configuration` (RFC 8414)
 * - **Authorization Code Grant**: Automated browser-based login flow for testing
 * - **PKCE Support**: Automatic PKCE (S256) for enhanced security (RFC 7636)
 * - **Public Client Support**: Works with Public Clients (SPAs, Native Apps) - no client secret required
 * - **Token Management**: Automatic Authorization header injection after login
 * - **Type Safety**: Discriminated union for login params and results with type-safe error handling
 * - **Extensible**: Easy to add new grant types via discriminated union pattern
 *
 * ## Installation
 *
 * ```bash
 * deno add jsr:@probitas/client-http
 * ```
 *
 * ## Quick Start
 *
 * ```ts
 * import { createOidcHttpClient } from "@probitas/client-http/oidc";
 *
 * // OIDC Discovery (recommended)
 * const http = await createOidcHttpClient({
 *   url: "http://localhost:3000",
 *   oidc: {
 *     issuer: "http://localhost:3000",  // Auto-discover endpoints
 *     clientId: "test-client",
 *   },
 * });
 *
 * // Login with Authorization Code Grant (PKCE enabled automatically)
 * const result = await http.login({
 *   type: "authorization_code",
 *   username: "testuser",
 *   password: "password123",
 * });
 *
 * if (result.ok) {
 *   console.log("Logged in:", result.token.accessToken);
 *
 *   // Authorization header is automatically set
 *   const profile = await http.get("/api/profile");
 *   console.log("Profile:", profile.json);
 * } else {
 *   console.error("Login failed:", result.error.message);
 * }
 *
 * await http.close();
 * ```
 *
 * ## OIDC Discovery (RFC 8414)
 *
 * Auto-discover endpoints from `/.well-known/openid-configuration` by providing
 * an `issuer` URL instead of manually specifying `authUrl` and `tokenUrl`:
 *
 * ```ts
 * import { createOidcHttpClient } from "@probitas/client-http/oidc";
 *
 * // Discovery automatically fetches:
 * // - authorization_endpoint
 * // - token_endpoint
 * // - issuer validation
 * const http = await createOidcHttpClient({
 *   url: "http://localhost:8080",
 *   oidc: {
 *     issuer: "http://localhost:8080",  // Auto-discover from /.well-known/openid-configuration
 *     clientId: "test-client",
 *   },
 * });
 *
 * const result = await http.login({
 *   type: "authorization_code",
 *   username: "testuser",
 *   password: "password123",
 * });
 * if (result.ok) {
 *   console.log("Access token:", result.token.accessToken);
 *   const profile = await http.get("/api/profile");
 * }
 * ```
 *
 * Manual configuration (`authUrl`, `tokenUrl`) always takes precedence over Discovery.
 *
 * ## Using with `using` Statement
 *
 * ```ts
 * import { createOidcHttpClient } from "@probitas/client-http/oidc";
 *
 * await using http = await createOidcHttpClient({
 *   url: "http://localhost:3000",
 *   oidc: {
 *     issuer: "http://localhost:3000",
 *     clientId: "test-client",
 *   },
 * });
 *
 * const result = await http.login({
 *   type: "authorization_code",
 *   username: "user",
 *   password: "pass",
 * });
 * if (result.ok) {
 *   await http.post("/api/data", { body: { value: 42 } });
 *   console.log("Data posted successfully");
 * }
 * // Automatic cleanup on scope exit
 * ```
 *
 * ## Manual Endpoint Configuration
 *
 * If your OIDC provider doesn't support Discovery, you can specify endpoints manually:
 *
 * ```ts
 * const http = await createOidcHttpClient({
 *   url: "http://localhost:3000",
 *   oidc: {
 *     authUrl: "/oauth/authorize",
 *     tokenUrl: "/oauth/token",
 *     clientId: "test-client",
 *   },
 * });
 * ```
 *
 * ## Related Packages
 *
 * | Package | Description |
 * |---------|-------------|
 * | [`@probitas/client-http`](https://jsr.io/@probitas/client-http) | Base HTTP client |
 * | [`@probitas/client`](https://jsr.io/@probitas/client) | Core utilities and types |
 *
 * ## Links
 *
 * - [GitHub Repository](https://github.com/probitas-test/probitas-packages)
 * - [Probitas Framework](https://github.com/probitas-test/probitas)
 *
 * @module
 */

import type {
  CookieConfig,
  HttpClient,
  HttpConnectionConfig,
  HttpOptions,
  HttpRequestOptions,
} from "./types.ts";
import { createHttpClient } from "./client.ts";

/**
 * OIDC-enabled HTTP client with authentication methods
 */
export interface OidcHttpClient extends HttpClient {
  /**
   * Perform OIDC login with specified grant type
   * Currently supports Authorization Code Grant with automatic form submission and PKCE (S256)
   *
   * @param params - Login parameters (discriminated union by type)
   * @returns Login result with token information
   *
   * @example
   * ```ts
   * import { createOidcHttpClient } from "@probitas/client-http/oidc";
   *
   * const client = await createOidcHttpClient({
   *   url: "http://localhost:3000",
   *   oidc: { issuer: "http://localhost:3000", clientId: "test" },
   * });
   *
   * const result = await client.login({
   *   type: "authorization_code",
   *   username: "testuser",
   *   password: "testpass",
   * });
   * ```
   */
  login(params: LoginParams): Promise<OidcLoginResult>;

  /**
   * Get current OIDC token info (if authenticated)
   *
   * @returns Current token or null if not authenticated
   */
  getToken(): OidcToken | null;

  /**
   * Clear OIDC authentication state
   */
  logout(): Promise<void>;
}

/**
 * OIDC Discovery metadata (subset of RFC 8414)
 */
interface OidcDiscoveryMetadata {
  /** Issuer identifier */
  issuer: string;
  /** Authorization endpoint URL */
  authorization_endpoint: string;
  /** Token endpoint URL */
  token_endpoint: string;
  /** Additional metadata fields (not used but may be present) */
  [key: string]: unknown;
}

/**
 * Configuration for OIDC HTTP client
 */
export interface OidcClientConfig {
  /** Base HTTP client configuration */
  url: string | HttpConnectionConfig;
  headers?: HeadersInit;
  cookies?: CookieConfig;

  /** Custom fetch implementation (for testing/mocking) */
  fetch?: typeof fetch;

  /** OIDC-specific configuration */
  oidc: {
    /**
     * Issuer URL for OIDC Discovery
     * If provided, will fetch endpoints from /.well-known/openid-configuration
     */
    issuer?: string;
    /**
     * Authorization endpoint (e.g., "/oauth/authorize")
     * Optional if issuer is provided (will be fetched via Discovery)
     */
    authUrl?: string;
    /**
     * Token endpoint (e.g., "/oauth/token")
     * Optional if issuer is provided (will be fetched via Discovery)
     */
    tokenUrl?: string;
    /** Client ID */
    clientId: string;
    /** Redirect URI (default: "http://localhost/callback") */
    redirectUri?: string;
    /** OAuth scopes (default: "openid profile") */
    scope?: string;
  };
}

/**
 * Additional options for Authorization Code Flow
 */
export interface OidcAuthCodeOptions {
  /** Login form URL if different from auth endpoint */
  loginFormUrl?: string;
  /**
   * Authorization URL for form submission (POST)
   * If not specified, uses loginFormUrl or authUrl from config
   * Useful when GET and POST endpoints differ (e.g., /login vs /authorize)
   */
  authorizeUrl?: string;
  /** Form field names (default: { username: "username", password: "password" }) */
  formFields?: {
    username?: string;
    password?: string;
  };
  /** Additional form fields to submit */
  extraFields?: Record<string, string>;
}

/**
 * Authorization Code Grant login parameters
 */
export interface AuthorizationCodeGrantParams {
  /** Grant type discriminator */
  type: "authorization_code";
  /** Username for authentication */
  username: string;
  /** Password for authentication */
  password: string;
  /** Additional options for Authorization Code Flow */
  options?: OidcAuthCodeOptions;
}

/**
 * Login parameters (discriminated union for different grant types)
 */
export type LoginParams = AuthorizationCodeGrantParams;

/**
 * Result of OIDC login operation
 */
export type OidcLoginResult =
  | { ok: true; token: OidcToken }
  | { ok: false; error: OidcError };

/**
 * OIDC token information
 */
export interface OidcToken {
  accessToken: string;
  tokenType: string;
  expiresIn?: number;
  refreshToken?: string;
  idToken?: string;
  scope?: string;
}

/**
 * OIDC error information
 */
export interface OidcError {
  /** OAuth 2.0 error code (e.g., "invalid_grant", "server_error", "network_error") */
  code: string;
  /** Error message */
  message: string;
  /** Optional error description from OAuth response */
  description?: string;
}

/**
 * Fetch OIDC Discovery metadata from /.well-known/openid-configuration
 *
 * @param issuerUrl - Issuer URL (e.g., "http://localhost:3000")
 * @param fetchFn - Optional fetch function for testing
 * @returns Discovery metadata or null on error
 */
async function fetchDiscoveryMetadata(
  issuerUrl: string,
  fetchFn: typeof fetch = fetch,
): Promise<OidcDiscoveryMetadata | null> {
  try {
    // Construct well-known URL
    // Use relative path to preserve issuer's path component
    const baseUrl = issuerUrl.endsWith("/") ? issuerUrl : issuerUrl + "/";
    const wellKnownUrl = new URL(
      ".well-known/openid-configuration",
      baseUrl,
    );

    const response = await fetchFn(wellKnownUrl.toString());
    if (!response.ok) {
      return null;
    }

    const metadata = await response.json();

    // Validate required fields
    if (
      typeof metadata !== "object" || metadata === null ||
      !("authorization_endpoint" in metadata) ||
      !("token_endpoint" in metadata) ||
      !("issuer" in metadata)
    ) {
      return null;
    }

    return metadata as OidcDiscoveryMetadata;
  } catch {
    return null;
  }
}

/**
 * Create an OIDC-enabled HTTP client
 *
 * @param config - OIDC client configuration
 * @returns OIDC HTTP client instance
 *
 * @example
 * ```ts
 * import { createOidcHttpClient } from "@probitas/client-http/oidc";
 *
 * const http = await createOidcHttpClient({
 *   url: "http://localhost:3000",
 *   oidc: {
 *     issuer: "http://localhost:3000",
 *     clientId: "test-client",
 *   },
 * });
 *
 * const result = await http.login({
 *   type: "authorization_code",
 *   username: "user",
 *   password: "pass",
 * });
 * console.log(result.ok);
 *
 * await http.close();
 * ```
 */
export async function createOidcHttpClient(
  config: OidcClientConfig,
): Promise<OidcHttpClient> {
  // Create base HTTP client
  const baseClient = createHttpClient({
    url: config.url,
    headers: config.headers,
    cookies: config.cookies,
    fetch: config.fetch,
  });

  // Resolve endpoints: manual config takes precedence over Discovery
  let authUrl = config.oidc.authUrl;
  let tokenUrl = config.oidc.tokenUrl;

  // If issuer is provided and endpoints are not manually configured, fetch via Discovery
  if (config.oidc.issuer && (!authUrl || !tokenUrl)) {
    const metadata = await fetchDiscoveryMetadata(
      config.oidc.issuer,
      config.fetch,
    );
    if (metadata) {
      authUrl = authUrl || metadata.authorization_endpoint;
      tokenUrl = tokenUrl || metadata.token_endpoint;
    }
  }

  // Validate that we have required endpoints
  if (!authUrl || !tokenUrl) {
    throw new Error(
      "OIDC endpoints not configured: provide either (issuer) or (authUrl + tokenUrl)",
    );
  }

  // OIDC configuration with resolved endpoints
  const oidcConfig = {
    redirectUri: "http://localhost/callback",
    scope: "openid profile",
    ...config.oidc,
    authUrl,
    tokenUrl,
  };

  // Token storage
  let currentToken: OidcToken | null = null;

  // Helper to normalize token_type to Title Case (e.g., "bearer" -> "Bearer")
  function normalizeTokenType(tokenType: string): string {
    return tokenType.charAt(0).toUpperCase() + tokenType.slice(1).toLowerCase();
  }

  // Helper to validate and parse token response
  function parseTokenResponse(tokenData: unknown): OidcToken | null {
    // Validate that tokenData is an object and has required fields
    if (
      typeof tokenData !== "object" || tokenData === null ||
      !("access_token" in tokenData) || !("token_type" in tokenData)
    ) {
      return null;
    }

    const data = tokenData as Record<string, unknown>;

    return {
      accessToken: String(data.access_token),
      tokenType: normalizeTokenType(String(data.token_type)),
      expiresIn: typeof data.expires_in === "number"
        ? data.expires_in
        : undefined,
      refreshToken: data.refresh_token ? String(data.refresh_token) : undefined,
      idToken: data.id_token ? String(data.id_token) : undefined,
      scope: data.scope ? String(data.scope) : undefined,
    };
  }

  // Helper to add Authorization header to options
  function addAuthHeaderToOptions(options?: HttpOptions): HttpOptions {
    if (!currentToken) return options ?? {};

    const headers = new Headers(options?.headers);
    headers.set(
      "Authorization",
      `${currentToken.tokenType} ${currentToken.accessToken}`,
    );

    return {
      ...options,
      headers,
    };
  }

  function addAuthHeaderToRequestOptions(
    options?: HttpRequestOptions,
  ): HttpRequestOptions {
    if (!currentToken) return options ?? {};

    const headers = new Headers(options?.headers);
    headers.set(
      "Authorization",
      `${currentToken.tokenType} ${currentToken.accessToken}`,
    );

    return {
      ...options,
      headers,
    };
  }

  // Wrap HTTP methods to automatically include Authorization header
  const wrappedClient: HttpClient = {
    ...baseClient,
    config: baseClient.config,
    get: (path, options?) =>
      baseClient.get(path, addAuthHeaderToOptions(options)),
    head: (path, options?) =>
      baseClient.head(path, addAuthHeaderToOptions(options)),
    post: (path, options?) =>
      baseClient.post(path, addAuthHeaderToRequestOptions(options)),
    put: (path, options?) =>
      baseClient.put(path, addAuthHeaderToRequestOptions(options)),
    patch: (path, options?) =>
      baseClient.patch(path, addAuthHeaderToRequestOptions(options)),
    delete: (path, options?) =>
      baseClient.delete(path, addAuthHeaderToRequestOptions(options)),
    options: (path, options?) =>
      baseClient.options(path, addAuthHeaderToOptions(options)),
    request: (method, path, options?) =>
      baseClient.request(method, path, addAuthHeaderToRequestOptions(options)),
    getCookies: () => baseClient.getCookies(),
    setCookie: (name, value) => baseClient.setCookie(name, value),
    clearCookies: () => baseClient.clearCookies(),
    close: () => baseClient.close(),
    [Symbol.asyncDispose]: () => baseClient[Symbol.asyncDispose](),
  };

  // OIDC methods implementation
  const oidcMethods = {
    async login(params: LoginParams): Promise<OidcLoginResult> {
      if (params.type === "authorization_code") {
        return await loginWithAuthorizationCodeGrant(
          params.username,
          params.password,
          params.options,
        );
      }

      // Unreachable due to type system, but included for safety
      return {
        ok: false,
        error: {
          code: "invalid_request",
          message: `Unsupported grant type: ${(params as LoginParams).type}`,
        },
      };
    },

    getToken(): OidcToken | null {
      return currentToken;
    },

    logout(): Promise<void> {
      currentToken = null;
      return Promise.resolve();
    },
  };

  // PKCE (Proof Key for Code Exchange) helpers (RFC 7636)
  function generateCodeVerifier(): string {
    // Generate 43-128 character random string using unreserved characters
    // Using base64url encoding of 32 random bytes = 43 characters
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");
  }

  async function generateCodeChallenge(verifier: string): Promise<string> {
    // S256: BASE64URL(SHA256(ASCII(code_verifier)))
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const hash = await crypto.subtle.digest("SHA-256", data);
    return btoa(String.fromCharCode(...new Uint8Array(hash)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");
  }

  // Authorization Code Grant implementation
  async function loginWithAuthorizationCodeGrant(
    username: string,
    password: string,
    options?: OidcAuthCodeOptions,
  ): Promise<OidcLoginResult> {
    try {
      // Step 1: Generate state and PKCE parameters
      const state = crypto.randomUUID();
      const codeVerifier = generateCodeVerifier();
      const codeChallenge = await generateCodeChallenge(codeVerifier);

      // Get login form from authorization endpoint
      const loginFormUrl = options?.loginFormUrl || oidcConfig.authUrl;
      const loginFormResponse = await baseClient.get(loginFormUrl, {
        query: {
          client_id: oidcConfig.clientId,
          redirect_uri: oidcConfig.redirectUri,
          response_type: "code",
          scope: oidcConfig.scope,
          state, // Client-generated state
          code_challenge: codeChallenge, // PKCE
          code_challenge_method: "S256", // PKCE method
        },
      });

      if (!loginFormResponse.ok) {
        return {
          ok: false,
          error: {
            code: "server_error",
            message: "Failed to fetch login form",
          },
        };
      }

      // Step 2: Submit login form to authorization endpoint
      const usernameField = options?.formFields?.username || "username";
      const passwordField = options?.formFields?.password || "password";

      const formData = new URLSearchParams({
        [usernameField]: username,
        [passwordField]: password,
        redirect_uri: oidcConfig.redirectUri,
        state, // Same state as in Step 1
        ...options?.extraFields,
      });

      // POST to authorization endpoint
      // Standard OIDC: same endpoint handles GET (login form) and POST (authorization)
      const authorizeUrl = options?.authorizeUrl || oidcConfig.authUrl;

      const authorizeResponse = await baseClient.post(authorizeUrl, {
        body: formData,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        redirect: "manual",
        throwOnError: false,
      });

      // Step 3: Extract authorization code from redirect response
      if (
        authorizeResponse.status !== 302 && authorizeResponse.status !== 303
      ) {
        return {
          ok: false,
          error: {
            code: "invalid_grant",
            message: "Authorization failed: expected redirect response",
          },
        };
      }

      const locationHeader = authorizeResponse.headers.get("location");
      if (!locationHeader) {
        return {
          ok: false,
          error: {
            code: "server_error",
            message: "No location header in authorization response",
          },
        };
      }

      const redirectUrl = new URL(locationHeader, oidcConfig.redirectUri);
      const code = redirectUrl.searchParams.get("code");
      const returnedState = redirectUrl.searchParams.get("state");

      // Verify state matches (CSRF protection)
      if (returnedState !== state) {
        return {
          ok: false,
          error: {
            code: "invalid_request",
            message: "State mismatch: possible CSRF attack",
          },
        };
      }

      if (!code) {
        const error = redirectUrl.searchParams.get("error");
        const errorDescription = redirectUrl.searchParams.get(
          "error_description",
        );
        return {
          ok: false,
          error: {
            code: error || "server_error",
            message: errorDescription || "Authorization failed",
          },
        };
      }

      // Step 4: Exchange authorization code for tokens
      const tokenBody = new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: oidcConfig.redirectUri,
        client_id: oidcConfig.clientId,
        code_verifier: codeVerifier, // PKCE
      });

      const tokenResponse = await baseClient.post(oidcConfig.tokenUrl, {
        body: tokenBody,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });

      if (tokenResponse.ok) {
        const tokenData = tokenResponse.json;
        const token = parseTokenResponse(tokenData);
        if (!token) {
          return {
            ok: false,
            error: {
              code: "server_error",
              message: "Invalid token response: missing required fields",
            },
          };
        }
        currentToken = token;
        return { ok: true, token: currentToken };
      } else {
        const errorData = tokenResponse.processed ? tokenResponse.json : {};
        return {
          ok: false,
          error: {
            code: errorData.error || "server_error",
            message: errorData.error_description || "Token exchange failed",
            description: errorData.error_description,
          },
        };
      }
    } catch (error) {
      return {
        ok: false,
        error: {
          code: "network_error",
          message: error instanceof Error ? error.message : "Network error",
        },
      };
    }
  }

  // Return combined client
  return Object.assign(wrappedClient, oidcMethods);
}
