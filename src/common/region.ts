/**
 * MaaS region helpers (aligned with Python `common.env`):
 * region-aware base URL resolution and workspace/region validation.
 */

/**
 * MaaS regions: region -> URL subdomain identifier.
 *
 * `cn-beijing` is deliberately excluded: it is the default region and keeps
 * using the legacy `dashscope.aliyuncs.com` endpoints. Its MaaS URLs are only
 * reachable when the caller explicitly requests the region.
 */
export const MAAS_REGIONS: Record<string, string> = {
  'ap-southeast-1': 'ap-southeast-1',
  'us-east-1': 'us-east-1',
  'cn-hongkong': 'cn-hongkong',
  'eu-central-1': 'eu-central-1',
  'ap-northeast-1': 'ap-northeast-1',
};

/** Regions that support MaaS endpoints (includes `cn-beijing` when explicitly requested). */
export const SUPPORTED_REGIONS: string[] = [...Object.keys(MAAS_REGIONS), 'cn-beijing'];

// workspace_id and region become DNS labels of the MaaS endpoint host, so they
// must not contain characters that could break out of the host.
const WORKSPACE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;
// RFC 1123 hostname label: 1-63 chars, no leading/trailing hyphen.
const REGION_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/;

/** Placeholder left in a base URL when the workspace id is not yet known. */
export const WORKSPACE_ID_PLACEHOLDER = '{workspace_id}';

/**
 * Validate that `workspaceId` is safe to use as a URL subdomain.
 * @throws Error when invalid.
 */
export function validateWorkspaceId(workspaceId: string): string {
  if (!workspaceId || !WORKSPACE_ID_PATTERN.test(workspaceId)) {
    throw new Error(
      `Invalid workspace_id '${workspaceId}': must match ^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$`,
    );
  }
  return workspaceId;
}

/**
 * Validate that `region` is a well-formed hostname label.
 * @throws Error when invalid.
 */
export function validateRegion(region: string): string {
  if (!region || !REGION_PATTERN.test(region)) {
    throw new Error(
      `Invalid region '${region}': must be a hostname label (1-63 chars of [A-Za-z0-9-], not starting or ending with '-')`,
    );
  }
  return region;
}

/**
 * Resolve the `{workspace_id}` placeholder in a base URL.
 *
 * @throws Error when the URL contains the placeholder but no workspace id is available.
 */
export function resolveBaseURL(url: string, workspaceId?: string): string {
  if (!url.includes(WORKSPACE_ID_PLACEHOLDER)) {
    return url;
  }
  if (workspaceId) {
    validateWorkspaceId(workspaceId);
    return url.split(WORKSPACE_ID_PLACEHOLDER).join(workspaceId);
  }
  throw new Error(
    "The base URL contains '{workspace_id}' but no workspace id is available: " +
      'pass workspace to the Configuration, or set the DASHSCOPE_WORKSPACE_ID environment variable.',
  );
}

/** The three MaaS base URLs for a region. */
export interface MaasBaseUrls {
  http: string;
  websocket: string;
  compatible: string;
}

/**
 * Build MaaS base URLs for a region. When `workspaceId` is omitted, the host
 * keeps the `{workspace_id}` placeholder to be resolved later per request.
 */
export function buildMaasBaseUrls(region: string, workspaceId?: string, apiVersion = 'v1'): MaasBaseUrls {
  validateRegion(region);
  const regionId = MAAS_REGIONS[region] ?? region;
  const ws = workspaceId ? validateWorkspaceId(workspaceId) : WORKSPACE_ID_PLACEHOLDER;
  const host = `${ws}.${regionId}.maas.aliyuncs.com`;
  return {
    http: `https://${host}/api/${apiVersion}`,
    websocket: `wss://${host}/api-ws/${apiVersion}/inference`,
    compatible: `https://${host}/compatible-mode/${apiVersion}`,
  };
}
