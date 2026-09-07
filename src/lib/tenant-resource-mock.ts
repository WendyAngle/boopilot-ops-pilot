// 「租户资源」聚合 mock：以托管账号为主体，串联镜像实例 / 设备 / 代理 IP
import {
  seedManagedAccounts,
  type Platform,
  type ManagedAccount,
} from "@/lib/managed-account-mock";

export type InstanceType = "云机镜像" | "指纹浏览器";

export interface TenantResourceRow {
  id: string;
  tenantId: string;
  tenantName: string;
  /** 账号 */
  accountId: string;
  accountName: string;
  accountPlatformId: string;
  platform: Platform;
  avatar: string;
  /** 镜像实例 */
  instanceId: string;
  instanceType: InstanceType;
  instanceName: string;
  /** 设备 */
  deviceId: string;
  deviceName: string;
  deviceType: "云机" | "Windows虚拟机";
  /** 代理 */
  proxyIp: string;
  proxyCountry: string;
  proxyProtocol: "SOCKS5" | "HTTP";
  updatedAt: string;
}

const COUNTRY_IP_PREFIX: Record<string, string> = {
  美国: "23.95",
  日本: "45.76",
  新加坡: "128.199",
  印度尼西亚: "103.87",
  中国: "120.24",
  马来西亚: "175.139",
};

function pad(n: number, len = 3) {
  return String(n).padStart(len, "0");
}

function buildRow(acc: ManagedAccount, i: number): TenantResourceRow {
  const isCloud = acc.deviceType !== "Windows虚拟机";
  const instanceType: InstanceType = isCloud ? "云机镜像" : "指纹浏览器";
  const nodeIdx = (i % 6) + 1;
  const country = acc.country;
  const prefix = COUNTRY_IP_PREFIX[country] ?? "23.95";

  return {
    id: `tr-${acc.id}`,
    tenantId: acc.tenantId,
    tenantName: acc.tenantName,
    accountId: acc.id,
    accountName: acc.username,
    accountPlatformId: acc.platformId,
    platform: acc.platform,
    avatar: acc.avatar,
    instanceId: isCloud
      ? `img-${pad(1000 + i * 7)}`
      : `fp-${pad(2000 + i * 11)}`,
    instanceType,
    instanceName: isCloud
      ? `image-${acc.platform.toLowerCase().replace("/", "-")}-${pad(i + 1, 2)}`
      : `fp-${acc.platform.toLowerCase().replace("/", "-")}-${pad(i + 1, 2)}`,
    deviceId: isCloud ? `cvm-${pad(300 + i * 3)}` : `wvm-${pad(700 + i * 3)}`,
    deviceName: isCloud
      ? `yaan-node${nodeIdx}-i${(i % 4) + 1}`
      : `pve-win-${pad(i + 1, 2)}`,
    deviceType: isCloud ? "云机" : "Windows虚拟机",
    proxyIp: `${prefix}.${(i * 13) % 240}.${(i * 29) % 250}`,
    proxyCountry: country,
    proxyProtocol: i % 3 === 0 ? "HTTP" : "SOCKS5",
    updatedAt: acc.createdAt,
  };
}

export function seedTenantResources(): TenantResourceRow[] {
  return seedManagedAccounts().map(buildRow);
}
