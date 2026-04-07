import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { Severity, ResourceType } from '../types'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

const SEVERITY_TEXT: Record<string, string> = {
  critical: 'text-red-400',
  high:     'text-orange-400',
  medium:   'text-yellow-400',
  low:      'text-blue-400',
}

const SEVERITY_BG: Record<string, string> = {
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
  high:     'bg-orange-500/20 text-orange-400 border-orange-500/30',
  medium:   'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  low:      'bg-blue-500/20 text-blue-400 border-blue-500/30',
}

const SEVERITY_BORDER: Record<string, string> = {
  critical: 'border-red-500',
  high:     'border-orange-500',
  medium:   'border-yellow-500',
  low:      'border-blue-500',
}

const RESOURCE_ICON: Record<string, string> = {
  EC2_INSTANCE:     '🖥️',
  S3_BUCKET:        '🪣',
  IAM_ROLE:         '🔑',
  SECURITY_GROUP:   '🛡️',
  VPC:              '🌐',
  SUBNET:           '📡',
  LAMBDA_FUNCTION:  '⚡',
  IGW:              '🚪',
  INTERNET:         '🌍',
}

export function severityColor(severity: Severity | string): string {
  return SEVERITY_TEXT[severity?.toLowerCase()] ?? 'text-gray-400'
}

export function severityBgColor(severity: Severity | string): string {
  return SEVERITY_BG[severity?.toLowerCase()] ?? 'bg-gray-500/20 text-gray-400 border-gray-500/30'
}

export function severityBorderColor(severity: Severity | string): string {
  return SEVERITY_BORDER[severity?.toLowerCase()] ?? 'border-gray-600'
}

export function resourceIcon(type: ResourceType | string): string {
  return RESOURCE_ICON[type] ?? '📦'
}

export function hasDistinctAccountName(accountId: string, accountName?: string | null): boolean {
  const normalizedName = accountName?.trim()
  return !!normalizedName && normalizedName !== accountId
}

export function formatAccountLabel(accountId: string, accountName?: string | null): string {
  return hasDistinctAccountName(accountId, accountName)
    ? `${accountName} (${accountId})`
    : accountId
}

export function formatRelativeTime(dateString: string): string {
  const diffMs  = Date.now() - new Date(dateString).getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHr  = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr  / 24)

  if (diffSec < 60) return `${diffSec}s ago`
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr  < 24) return `${diffHr}h ago`
  return `${diffDay}d ago`
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
}

export function formatResourceType(type: string | null | undefined): string {
  if (!type) return 'Unknown'
  return type
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function shortResourceId(resourceId: string): string {
  if (resourceId.includes('INTERNET')) return 'Internet'

  const slashParts = resourceId.split('/').filter(Boolean)
  if (slashParts.length > 0) {
    return slashParts[slashParts.length - 1]
  }

  const colonParts = resourceId.split(':').filter(Boolean)
  if (colonParts.length > 0) {
    return colonParts[colonParts.length - 1]
  }

  return resourceId
}
