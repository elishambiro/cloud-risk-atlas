import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useScans } from './useScan'

const SCAN_QUERY_PARAM = 'scan'

export function useSelectedScan() {
  const [searchParams, setSearchParams] = useSearchParams()
  const scansQuery = useScans()
  const scans = scansQuery.data
  const requestedScanId = searchParams.get(SCAN_QUERY_PARAM)

  const completedScans = useMemo(
    () => scans?.filter((scan) => scan.status === 'complete') ?? [],
    [scans],
  )

  const selectedScan = useMemo(() => {
    if (!completedScans.length) return undefined
    return completedScans.find((scan) => scan.id === requestedScanId) ?? completedScans[0]
  }, [completedScans, requestedScanId])

  const setSelectedScanId = (scanId: string | null) => {
    const nextParams = new URLSearchParams(searchParams)
    if (scanId) {
      nextParams.set(SCAN_QUERY_PARAM, scanId)
    } else {
      nextParams.delete(SCAN_QUERY_PARAM)
    }
    setSearchParams(nextParams)
  }

  return {
    ...scansQuery,
    scans,
    latestScan: scans?.[0],
    completedScans,
    requestedScanId,
    selectedScan,
    selectedScanId: selectedScan?.id ?? null,
    setSelectedScanId,
  }
}
