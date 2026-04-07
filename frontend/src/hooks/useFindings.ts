import { useQuery } from '@tanstack/react-query'
import { getFindings } from '../api/client'

interface UseFindingsOptions {
  severity?: string
  resourceId?: string
  page?: number
  pageSize?: number
  enabled?: boolean
  keepPreviousData?: boolean
}

export function useFindings(
  scan_id: string | undefined,
  {
    severity,
    resourceId,
    page = 0,
    pageSize = 50,
    enabled,
    keepPreviousData = false,
  }: UseFindingsOptions = {},
) {
  const offset = page * pageSize

  return useQuery({
    queryKey: ['findings', scan_id, severity, resourceId, page, pageSize],
    queryFn: () => getFindings(scan_id!, severity, resourceId, pageSize, offset),
    enabled: enabled ?? !!scan_id,
    staleTime: 30_000,
    placeholderData: keepPreviousData && !resourceId ? (previousData) => previousData : undefined,
  })
}
