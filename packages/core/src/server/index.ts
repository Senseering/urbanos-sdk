import { createPrivateKey, randomUUID, sign, type KeyObject } from 'node:crypto';

import type { AccessToken, TokenProvider } from '../auth/token-provider.js';
import { UrbanOSClient } from '../client/client.js';
import { HttpTransport } from '../client/http-transport.js';
import { AuthError, GatewayError } from '../errors/errors.js';

const ASSERTION_TYPE = 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer';
const DATA_AUDIENCE = 'urbanos-api';
const DIRECTORY_AUDIENCE = 'urbanos-service-directory';
const TOKEN_SKEW_MS = 30_000;

export interface SharedSecretServiceCredential {
  type: 'shared_secret';
  credentialId: string;
  clientSecret: string;
}

export interface PrivateKeyJwtServiceCredential {
  type: 'private_key_jwt';
  credentialId: string;
  keyId: string;
  /** PKCS#8 or SEC1 PEM. Keep this in a server-side secret manager. */
  privateKey: string;
}

export type UrbanOSServiceCredential =
  SharedSecretServiceCredential | PrivateKeyJwtServiceCredential;

export interface ServiceTarget {
  elementId: number;
  mandateIds: number[];
}

export interface ServiceElementOptions {
  /** Narrow reads to this mandate plus organisation-level data. */
  mandateId?: number;
}

export interface UrbanOSServiceClientOptions {
  baseUrl: string;
  credential: UrbanOSServiceCredential;
  /** Data/storage scopes requested for each element-bound token. */
  scopes: string[];
  fetchImpl?: typeof fetch;
  /**
   * Exact audience placed in private_key_jwt assertions. Defaults to the
   * configured baseUrl + /oauth/token.
   */
  tokenEndpointAudience?: string;
  /** Refresh this many milliseconds before expiry. Default: 30 seconds. */
  tokenSkewMs?: number;
}

/** One server-side secret copied from the app-client API-key dialog. */
export interface UrbanOSApiKeyClientOptions {
  baseUrl: string;
  apiKey: string;
  /** Omit to use the key's approved permissions; specify to narrow further. */
  scopes?: string[];
  fetchImpl?: typeof fetch;
  tokenSkewMs?: number;
}

function decodeApiKey(apiKey: string): SharedSecretServiceCredential {
  const match =
    typeof apiKey === 'string'
      ? /^uos_api_(uos_sc_[a-z0-9]{20,40})\.(uos_ss_[0-9a-f]{64})$/.exec(apiKey)
      : null;
  if (!match) throw new TypeError('Invalid urbanOS API key');
  return { type: 'shared_secret', credentialId: match[1]!, clientSecret: match[2]! };
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  element_id?: number;
  mandate_id?: number;
  mandate_ids?: number[];
}

interface CachedToken {
  token: AccessToken;
  mandateIds: number[];
}

interface DirectoryResponse {
  targets: Array<{ element_id: number; mandate_ids?: number[] }>;
}

/**
 * Server-only OAuth client for background services. It discovers eligible
 * organizations and returns the ordinary UrbanOSClient bound to exactly one.
 */
export class UrbanOSServiceClient {
  private readonly opts: UrbanOSServiceClientOptions;
  private readonly fetchImpl: typeof fetch;
  private readonly baseUrl: string;
  private readonly tokenAudience: string;
  private readonly tokenSkewMs: number;
  private readonly assertionKey?: KeyObject;
  private readonly providers = new Map<string, ServiceTokenProvider>();
  private directoryToken?: CachedToken;
  private directoryInFlight?: Promise<CachedToken>;

  constructor(options: UrbanOSServiceClientOptions | UrbanOSApiKeyClientOptions) {
    assertServerRuntime();
    if ('apiKey' in options && 'credential' in options) {
      throw new TypeError('Provide an API key or an advanced credential, not both');
    }
    const opts: UrbanOSServiceClientOptions =
      'apiKey' in options
        ? {
            baseUrl: options.baseUrl,
            credential: decodeApiKey(options.apiKey),
            scopes: options.scopes ?? [],
            fetchImpl: options.fetchImpl,
            tokenSkewMs: options.tokenSkewMs,
          }
        : options;
    if (
      !opts.baseUrl ||
      !opts.credential.credentialId ||
      !Array.isArray(opts.scopes) ||
      (!('apiKey' in options) && opts.scopes.length === 0)
    ) {
      throw new TypeError('baseUrl, credentialId, and at least one scope are required');
    }
    this.opts = opts;
    const url = new URL(opts.baseUrl);
    if (
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      (url.protocol !== 'https:' &&
        !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)))
    ) {
      throw new TypeError('Server credentials require HTTPS (HTTP is allowed only on loopback)');
    }
    if (opts.credential.type === 'shared_secret' && !opts.credential.clientSecret) {
      throw new TypeError('clientSecret is required for a shared-secret credential');
    }
    if (opts.credential.type === 'private_key_jwt') {
      if (!/^[A-Za-z0-9._-]{8,128}$/.test(opts.credential.keyId)) {
        throw new TypeError('keyId must be a valid OAuth credential key id');
      }
      const key = createPrivateKey(opts.credential.privateKey);
      const curve = key.asymmetricKeyDetails?.namedCurve;
      if (key.asymmetricKeyType !== 'ec' || (curve !== 'prime256v1' && curve !== 'P-256')) {
        throw new TypeError('private_key_jwt requires an ES256 P-256 private key');
      }
      this.assertionKey = key;
    }
    this.baseUrl = opts.baseUrl.replace(/\/$/, '');
    this.fetchImpl = opts.fetchImpl ?? fetch;
    this.tokenAudience = opts.tokenEndpointAudience ?? `${this.baseUrl}/oauth/token`;
    this.tokenSkewMs = opts.tokenSkewMs ?? TOKEN_SKEW_MS;
  }

  async listTargets(): Promise<ServiceTarget[]> {
    let token = await this.getDirectoryToken(false);
    let response = await this.sendDirectoryRequest(token.token.accessToken);
    if (response.status === 401) {
      token = await this.getDirectoryToken(true);
      response = await this.sendDirectoryRequest(token.token.accessToken);
    }
    if (response.status === 401) throw new AuthError();
    if (!response.ok) {
      throw new GatewayError(`gateway responded ${response.status}`, response.status);
    }
    const body = (await response.json()) as DirectoryResponse;
    return body.targets.map((target) => ({
      elementId: target.element_id,
      mandateIds: target.mandate_ids ?? [],
    }));
  }

  forElement(elementId: number, options: ServiceElementOptions = {}): UrbanOSClient {
    if (!Number.isSafeInteger(elementId) || elementId <= 0) {
      throw new TypeError('elementId must be a positive safe integer');
    }
    const { mandateId } = options;
    if (mandateId !== undefined && (!Number.isSafeInteger(mandateId) || mandateId <= 0)) {
      throw new TypeError('mandateId must be a positive safe integer');
    }
    const cacheKey = `${elementId}:${mandateId ?? 0}`;
    let provider = this.providers.get(cacheKey);
    if (!provider) {
      provider = new ServiceTokenProvider(this, elementId, mandateId);
      this.providers.set(cacheKey, provider);
    }
    return new UrbanOSClient(
      new HttpTransport({ baseUrl: this.baseUrl, tokens: provider, fetchImpl: this.fetchImpl }),
      { tokens: provider },
    );
  }

  async acquireElementToken(elementId: number, mandateId?: number): Promise<CachedToken> {
    return this.requestToken(DATA_AUDIENCE, elementId, this.opts.scopes, mandateId);
  }

  isFresh(token: AccessToken): boolean {
    return token.expiresAt - this.tokenSkewMs > Date.now();
  }

  private async getDirectoryToken(force: boolean): Promise<CachedToken> {
    if (!force && this.directoryToken && this.isFresh(this.directoryToken.token)) {
      return this.directoryToken;
    }
    if (this.directoryInFlight) return this.directoryInFlight;
    this.directoryInFlight = this.requestToken(DIRECTORY_AUDIENCE, undefined, [])
      .then((token) => {
        this.directoryToken = token;
        return token;
      })
      .finally(() => {
        this.directoryInFlight = undefined;
      });
    return this.directoryInFlight;
  }

  private sendDirectoryRequest(accessToken: string): Promise<Response> {
    return this.fetchImpl(`${this.baseUrl}/v1/service-targets`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }

  private async requestToken(
    audience: string,
    elementId: number | undefined,
    scopes: string[],
    mandateId?: number,
  ): Promise<CachedToken> {
    const form = new URLSearchParams({ grant_type: 'client_credentials', audience });
    if (elementId !== undefined) form.set('element_id', String(elementId));
    if (mandateId !== undefined) form.set('mandate_id', String(mandateId));
    if (scopes.length > 0) form.set('scope', scopes.join(' '));
    const headers: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded',
    };
    const credential = this.opts.credential;
    if (credential.type === 'shared_secret') {
      headers.Authorization = `Basic ${Buffer.from(
        `${credential.credentialId}:${credential.clientSecret}`,
      ).toString('base64')}`;
    } else {
      form.set('client_id', credential.credentialId);
      form.set('client_assertion_type', ASSERTION_TYPE);
      form.set('client_assertion', this.createAssertion(credential));
    }
    const response = await this.fetchImpl(`${this.baseUrl}/oauth/token`, {
      method: 'POST',
      redirect: 'error',
      headers,
      body: form,
    });
    if (response.status === 401) throw new AuthError();
    if (!response.ok) {
      throw new GatewayError(`token endpoint responded ${response.status}`, response.status);
    }
    const body = (await response.json()) as TokenResponse;
    if (!body.access_token || !Number.isFinite(body.expires_in) || body.expires_in <= 0) {
      throw new GatewayError('token endpoint returned an invalid response', 502);
    }
    // Older gateways ignored machine mandate_id. Never silently use their
    // broader token when the application explicitly requested a mandate.
    if (
      mandateId !== undefined &&
      (body.element_id !== elementId ||
        body.mandate_id !== mandateId ||
        body.mandate_ids?.length !== 1 ||
        body.mandate_ids[0] !== mandateId)
    ) {
      throw new GatewayError('token endpoint did not confirm the requested mandate binding', 502);
    }
    return {
      token: {
        accessToken: body.access_token,
        expiresAt: Date.now() + body.expires_in * 1000,
        scopes: body.scope ? body.scope.split(/\s+/) : [],
        tenantId: body.element_id ?? 0,
        mandateId: body.mandate_id || undefined,
      },
      mandateIds: body.mandate_ids ?? [],
    };
  }

  private createAssertion(credential: PrivateKeyJwtServiceCredential): string {
    const now = Math.floor(Date.now() / 1000);
    const header = encodeJSON({ alg: 'ES256', typ: 'JWT', kid: credential.keyId });
    const claims = encodeJSON({
      iss: credential.credentialId,
      sub: credential.credentialId,
      aud: this.tokenAudience,
      iat: now,
      exp: now + 120,
      jti: randomUUID(),
    });
    const signingInput = `${header}.${claims}`;
    const signature = sign('sha256', Buffer.from(signingInput), {
      key: this.assertionKey!,
      dsaEncoding: 'ieee-p1363',
    }).toString('base64url');
    return `${signingInput}.${signature}`;
  }
}

class ServiceTokenProvider implements TokenProvider {
  private cached?: CachedToken;
  private inFlight?: Promise<CachedToken>;

  constructor(
    private readonly service: UrbanOSServiceClient,
    private readonly elementId: number,
    private readonly mandateId?: number,
  ) {}

  async getToken(): Promise<AccessToken> {
    if (this.cached && this.service.isFresh(this.cached.token)) return this.cached.token;
    return (await this.acquire()).token;
  }

  async refresh(): Promise<AccessToken> {
    this.cached = undefined;
    return (await this.acquire()).token;
  }

  private acquire(): Promise<CachedToken> {
    if (this.inFlight) return this.inFlight;
    this.inFlight = this.service
      .acquireElementToken(this.elementId, this.mandateId)
      .then((token) => {
        this.cached = token;
        return token;
      })
      .finally(() => {
        this.inFlight = undefined;
      });
    return this.inFlight;
  }
}

function encodeJSON(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function assertServerRuntime(): void {
  if (typeof window !== 'undefined') {
    throw new Error(
      '@datamatters-gmbh/urbanos-core/server contains server credentials and cannot run in a browser',
    );
  }
}
