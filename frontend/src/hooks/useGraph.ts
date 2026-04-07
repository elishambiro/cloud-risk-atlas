import { useQuery } from '@tanstack/react-query'
import { getGraph } from '../api/client'

export function useGraph(scan_id: string | undefined) {
  return useQuery({
    queryKey: ['graph', scan_id],
    queryFn: () => getGraph(scan_id!),
    enabled: !!scan_id,
    staleTime: 60_000,
  })
}
