import axios from 'axios'
import type {
  Scan,
  GraphResponse,
  FindingsPage,
  AttackPath,
  DashboardData,
  AwsAccount,
  OrganizationAccountsResponse,
  TriggerOrganizationScanResponse,
  TriggerScanResponse,
} from '../types'

const API_BASE_URL = import.meta.env.VITE_API_URL || ''

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})
export async function getAwsAccounts(): Promise<AwsAccount[]> {
  const { data } = await apiClient.get('/api/v1/aws/accounts')
  return data
}

export async function getOrganizationAccounts(profile: string): Promise<OrganizationAccountsResponse> {
  const { data } = await apiClient.get('/api/v1/aws/organization-accounts', {
    params: { profile },
  })
  return data
}
export async function triggerScan(
  account_id: string,
  region: string,
  profile?: string,
  role_arn?: string,
  account_name?: string,
): Promise<TriggerScanResponse> {
  const { data } = await apiClient.post('/api/v1/scans/trigger', {
    account_id,
    account_name,
    region,
    profile,
    role_arn,
  })
  return data
}

export async function triggerOrganizationScan(
  profile: string,
  region: string,
  role_name: string,
  account_ids?: string[],
): Promise<TriggerOrganizationScanResponse> {
  const { data } = await apiClient.post('/api/v1/scans/trigger-organization', {
    profile,
    region,
    role_name,
    account_ids,
  })
  return data
}

export async function getScans(): Promise<Scan[]> {
  const { data } = await apiClient.get('/api/v1/scans/')
  return data
}

export async function getScan(id: string): Promise<Scan> {
  const { data } = await apiClient.get(`/api/v1/scans/${id}`)
  return data
}

export async function deleteScan(id: string): Promise<void> {
  await apiClient.delete(`/api/v1/scans/${id}`)
}
export async function getGraph(scan_id: string): Promise<GraphResponse> {
  const { data } = await apiClient.get(`/api/v1/scans/${scan_id}/graph/`)
  return data
}
export async function getFindings(
  scan_id: string,
  severity?: string,
  resourceId?: string,
  limit = 50,
  offset = 0,
): Promise<FindingsPage> {
  const params: Record<string, string | number> = { limit, offset }
  if (severity) params.severity = severity
  if (resourceId) params.resource_id = resourceId
  const { data } = await apiClient.get(`/api/v1/scans/${scan_id}/findings/`, { params })
  return data
}
export async function getAttackPaths(scan_id: string): Promise<AttackPath[]> {
  const { data } = await apiClient.get(`/api/v1/scans/${scan_id}/attack-paths/`)
  return data
}
export async function getDashboard(scan_id: string): Promise<DashboardData> {
  const { data } = await apiClient.get(`/api/v1/scans/${scan_id}/dashboard/`)
  return data
}
