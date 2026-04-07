import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  deleteScan,
  getScan,
  getScans,
  triggerOrganizationScan,
  triggerScan,
} from '../api/client'

export function useScans() {
  return useQuery({
    queryKey: ['scans'],
    queryFn: getScans,
    refetchInterval: (query) => {
      const scans = query.state.data
      if (scans?.some((s) => s.status === 'pending' || s.status === 'running')) {
        return 10000
      }
      return false
    },
  })
}

export function useScan(id: string | undefined) {
  return useQuery({
    queryKey: ['scan', id],
    queryFn: () => getScan(id!),
    enabled: !!id,
    refetchInterval: (query) => {
      const scan = query.state.data
      if (scan?.status === 'pending' || scan?.status === 'running') {
        return 3000
      }
      return false
    },
  })
}

export function useTriggerScan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      account_id,
      account_name,
      region,
      profile,
      role_arn,
    }: {
      account_id: string
      account_name?: string
      region: string
      profile?: string
      role_arn?: string
    }) => triggerScan(account_id, region, profile, role_arn, account_name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scans'] })
    },
  })
}

export function useTriggerOrganizationScan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      profile,
      region,
      role_name,
      account_ids,
    }: {
      profile: string
      region: string
      role_name: string
      account_ids?: string[]
    }) => triggerOrganizationScan(profile, region, role_name, account_ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scans'] })
    },
  })
}

export function useDeleteScan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteScan(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scans'] })
    },
  })
}
