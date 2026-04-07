export type ScanStatus = 'pending' | 'running' | 'complete' | 'failed'
export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'none'
export type ResourceType =
  | 'EC2_INSTANCE'
  | 'S3_BUCKET'
  | 'IAM_ROLE'
  | 'SECURITY_GROUP'
  | 'VPC'
  | 'SUBNET'
  | 'LAMBDA_FUNCTION'
  | 'IGW'
  | 'INTERNET'

export interface Scan {
  id: string
  status: ScanStatus
  account_id: string
  account_name: string | null
  region: string
  started_at: string
  finished_at: string | null
  summary: ScanSummary | null
  error: string | null
}

export interface AwsAccount {
  profile: string
  account_id: string
  alias: string | null
  label: string
}

export interface OrganizationAccount {
  account_id: string
  name: string
  email: string | null
  status: string
  label: string
  is_management: boolean
}

export interface OrganizationAccountsResponse {
  management_account_id: string | null
  default_role_name: string
  accounts: OrganizationAccount[]
}

export interface TriggerScanResponse {
  scan_id: string
  status: string
  message: string
}

export interface TriggerOrganizationScanResponse {
  scan_ids: string[]
  status: string
  total_started: number
  message: string
}

export interface ScanSummary {
  total_resources: number
  total_findings: number
  total_attack_paths: number
  global_risk_score: number
  severity_counts: Record<string, number>
}

export interface GraphNode {
  id: string
  type: ResourceType
  name: string | null
  risk_score: number
  severity: Severity
  is_internet_reachable: boolean
  metadata: Record<string, unknown>
  account_id?: string
  region?: string
}

export interface GraphEdge {
  id: string
  source: string
  target: string
  relation_type: string
}

export interface GraphResponse {
  nodes: GraphNode[]
  edges: GraphEdge[]
  scan_id: string | null
}

export interface Finding {
  id: string
  scan_id: string
  resource_id: string
  resource_name: string | null
  resource_type: string | null
  rule_id: string
  title: string
  severity: Severity
  score: number
  explanation: string
  impact: string
  remediation: string
  metadata: Record<string, unknown> | null
}

export interface FindingsPage {
  items: Finding[]
  total: number
  limit: number
  offset: number
  has_more: boolean
}

export interface AttackPath {
  id: string
  scan_id: string
  title: string
  path: string[]
  severity: Severity
  score: number
  entry_point: string
  target: string
  description: string
}

export interface SeverityCount {
  critical: number
  high: number
  medium: number
  low: number
  none: number
}

export interface DashboardScanInfo {
  id: string
  status: ScanStatus
  account_id: string
  account_name: string | null
  region: string
  started_at: string | null
  finished_at: string | null
  duration_seconds: number | null
  error: string | null
}

export interface TopResource {
  resource_id: string
  name: string | null
  type: string
  risk_score: number
  severity: Severity
  is_internet_reachable: boolean
}

export interface TopAttackPath {
  id: string
  title: string
  severity: Severity
  score: number
  entry_point: string
  target: string
  description: string
}

export interface DashboardData {
  global_risk_score: number
  severity_counts: SeverityCount
  top_resources: TopResource[]
  top_attack_paths: TopAttackPath[]
  total_resources: number
  total_findings: number
  total_attack_paths: number
  scan_info: DashboardScanInfo
}
