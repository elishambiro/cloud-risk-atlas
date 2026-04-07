import { useQuery } from '@tanstack/react-query'
import { getDashboard } from '../api/client'

export function useDashboard(scan_id: string | undefined) {
  return useQuery({
    queryKey: ['dashboard', scan_id],
    queryFn: () => getDashboard(scan_id!),
    enabled: !!scan_id,
    staleTime: 30_000,
  })
}
