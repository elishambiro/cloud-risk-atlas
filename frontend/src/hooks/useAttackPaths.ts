import { useQuery } from '@tanstack/react-query'
import { getAttackPaths } from '../api/client'

export function useAttackPaths(scan_id: string | undefined) {
  return useQuery({
    queryKey: ['attack-paths', scan_id],
    queryFn: () => getAttackPaths(scan_id!),
    enabled: !!scan_id,
    staleTime: 30_000,
  })
}
