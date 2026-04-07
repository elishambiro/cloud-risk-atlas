import React, { useEffect, useState } from 'react'
import { X, Play, Loader2, RefreshCw } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTriggerOrganizationScan, useTriggerScan } from '../../hooks/useScan'
import { getAwsAccounts, getOrganizationAccounts } from '../../api/client'

interface ScanTriggerModalProps {
  open: boolean
  onClose: () => void
}

const COMMON_REGIONS = [
  'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
  'eu-west-1', 'eu-west-2', 'eu-central-1',
  'ap-southeast-1', 'ap-southeast-2', 'ap-northeast-1',
]
const DEFAULT_ROLE_NAME = 'OrganizationAccountAccessRole'

export default function ScanTriggerModal({ open, onClose }: ScanTriggerModalProps) {
  const [scanMode, setScanMode] = useState<'single' | 'organization'>('single')
  const [selectedProfile, setSelectedProfile] = useState('')
  const [region, setRegion] = useState('eu-central-1')
  const [roleName, setRoleName] = useState(DEFAULT_ROLE_NAME)
  const [selectedOrganizationAccountIds, setSelectedOrganizationAccountIds] = useState<string[]>([])
  const trigger = useTriggerScan()
  const triggerOrganization = useTriggerOrganizationScan()

  const { data: accounts, isLoading: loadingAccounts, refetch, isError: accountsError } = useQuery({
    queryKey: ['aws-accounts'],
    queryFn: getAwsAccounts,
    enabled: open,
    staleTime: 30_000,
  })

  const {
    data: organizationData,
    isLoading: loadingOrganization,
    isError: organizationError,
  } = useQuery({
    queryKey: ['aws-organization-accounts', selectedProfile],
    queryFn: () => getOrganizationAccounts(selectedProfile),
    enabled: open && scanMode === 'organization' && !!selectedProfile,
    staleTime: 30_000,
  })

  const selectedAccount = accounts?.find(a => a.profile === selectedProfile)

  useEffect(() => {
    if (organizationData?.default_role_name) {
      setRoleName((current) =>
        current === DEFAULT_ROLE_NAME || current === '' ? organizationData.default_role_name : current,
      )
    }
  }, [organizationData])

  useEffect(() => {
    setSelectedOrganizationAccountIds([])
  }, [selectedProfile, scanMode])

  if (!open) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (scanMode === 'organization') {
        if (!selectedProfile) return
        await triggerOrganization.mutateAsync({
          profile: selectedProfile,
          region,
          role_name: roleName.trim() || organizationData?.default_role_name || DEFAULT_ROLE_NAME,
          account_ids: selectedOrganizationAccountIds,
        })
      } else {
        if (!selectedAccount) return
        await trigger.mutateAsync({
          account_id: selectedAccount.account_id,
          account_name: selectedAccount.alias ?? selectedAccount.profile,
          region,
          profile: selectedAccount.profile,
        })
      }
      onClose()
      setScanMode('single')
      setSelectedProfile('')
      setRoleName(DEFAULT_ROLE_NAME)
      setSelectedOrganizationAccountIds([])
    } catch (err) {
      console.error('Failed to trigger scan', err)
    }
  }

  const organizationAccounts = organizationData?.accounts ?? []
  const toggleOrganizationAccount = (accountId: string) => {
    setSelectedOrganizationAccountIds((current) =>
      current.includes(accountId)
        ? current.filter((id) => id !== accountId)
        : [...current, accountId],
    )
  }

  const selectAllOrganizationAccounts = () => {
    setSelectedOrganizationAccountIds(organizationAccounts.map((account) => account.account_id))
  }

  const clearOrganizationAccounts = () => {
    setSelectedOrganizationAccountIds([])
  }

  const orgSubmitDisabled =
    triggerOrganization.isPending ||
    !selectedProfile ||
    !roleName.trim() ||
    !selectedOrganizationAccountIds.length ||
    loadingOrganization
  const submitDisabled =
    scanMode === 'organization' ? orgSubmitDisabled : trigger.isPending || !selectedAccount

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-md mx-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-white">Run Security Scan</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Scan Scope</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setScanMode('single')}
                className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                  scanMode === 'single'
                    ? 'border-red-500/40 bg-red-500/10 text-white'
                    : 'border-gray-700 bg-gray-800 text-gray-400 hover:text-gray-200'
                }`}
              >
                Single Account
              </button>
              <button
                type="button"
                onClick={() => setScanMode('organization')}
                className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                  scanMode === 'organization'
                    ? 'border-red-500/40 bg-red-500/10 text-white'
                    : 'border-gray-700 bg-gray-800 text-gray-400 hover:text-gray-200'
                }`}
              >
                Organization
              </button>
            </div>
          </div>

          {/* Account dropdown */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-gray-300">
                {scanMode === 'organization' ? 'Management Profile' : 'AWS Account'}
              </label>
              <button
                type="button"
                onClick={() => refetch()}
                className="text-gray-500 hover:text-gray-300 transition-colors"
                title="Refresh accounts"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {loadingAccounts ? (
              <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading accounts...
              </div>
            ) : accountsError || !accounts?.length ? (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-3 py-2 text-sm text-yellow-400">
                No accounts found. Check that ~/.aws/credentials is configured.
              </div>
            ) : (
              <select
                value={selectedProfile}
                onChange={(e) => setSelectedProfile(e.target.value)}
                required
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gray-500 transition-colors"
              >
                <option value="">Select an account...</option>
                {accounts.map((a) => (
                  <option key={a.profile} value={a.profile}>
                    {a.label} — {a.profile}
                  </option>
                ))}
              </select>
            )}

            {selectedAccount && (
              <p className="mt-1.5 text-xs text-gray-500">
                Account ID: <span className="text-gray-400 font-mono">{selectedAccount.account_id}</span>
                {' · '}Profile: <span className="text-gray-400 font-mono">{selectedAccount.profile}</span>
              </p>
            )}
          </div>

          {scanMode === 'organization' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Member Account Role Name
                </label>
                <input
                  value={roleName}
                  onChange={(e) => setRoleName(e.target.value)}
                  placeholder="OrganizationAccountAccessRole"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gray-500 transition-colors"
                />
                <p className="mt-1.5 text-xs text-gray-500">
                  This role must exist in each member account and trust the selected profile.
                </p>
              </div>

              <div className="rounded-lg border border-gray-800 bg-gray-800/50 p-3">
                {!selectedProfile ? (
                  <p className="text-sm text-gray-500">
                    Select a management profile to load organization accounts.
                  </p>
                ) : loadingOrganization ? (
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading organization accounts...
                  </div>
                ) : organizationError ? (
                  <div className="text-sm text-yellow-400">
                    Could not load organization accounts. The selected profile needs access to AWS Organizations.
                  </div>
                ) : !organizationAccounts.length ? (
                  <div className="text-sm text-yellow-400">
                    No active organization accounts were found for this profile.
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm text-gray-200">
                        Select the accounts to scan in <span className="font-mono text-gray-300">{region}</span>.
                      </p>
                      <div className="flex items-center gap-2 text-xs">
                        <button
                          type="button"
                          onClick={selectAllOrganizationAccounts}
                          className="text-gray-400 hover:text-gray-200 transition-colors"
                        >
                          Select all
                        </button>
                        <span className="text-gray-700">|</span>
                        <button
                          type="button"
                          onClick={clearOrganizationAccounts}
                          className="text-gray-400 hover:text-gray-200 transition-colors"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">
                      {selectedOrganizationAccountIds.length} of {organizationAccounts.length} accounts selected
                    </p>
                    <div className="max-h-52 space-y-2 overflow-y-auto pr-1">
                      {organizationAccounts.map((account) => {
                        const checked = selectedOrganizationAccountIds.includes(account.account_id)
                        return (
                          <label
                            key={account.account_id}
                            className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2 transition-colors ${
                              checked
                                ? 'border-red-500/30 bg-red-500/10'
                                : 'border-gray-800 bg-gray-900/40 hover:border-gray-700'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleOrganizationAccount(account.account_id)}
                              className="mt-0.5 h-4 w-4 rounded border-gray-600 bg-gray-800 text-red-500 focus:ring-red-500"
                            />
                            <span className="min-w-0">
                              <span className="block text-sm text-gray-200">{account.label}</span>
                              <span className="block text-xs text-gray-500">
                                {account.is_management ? 'Source profile account' : 'Member account'}
                                {account.email ? ` · ${account.email}` : ''}
                              </span>
                            </span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Region */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Region</label>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gray-500 transition-colors"
            >
              {COMMON_REGIONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {(trigger.isError || triggerOrganization.isError) && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 text-sm text-red-400">
              Failed to start scan. Check backend logs and AWS permissions.
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-400 hover:text-gray-200 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitDisabled}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
            >
              {trigger.isPending || triggerOrganization.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  {scanMode === 'organization' ? 'Start Org Scan' : 'Start Scan'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
