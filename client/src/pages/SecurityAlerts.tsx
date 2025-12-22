import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  FiShield, 
  FiAlertTriangle, 
  FiCheckCircle, 
  FiClock,
  FiFilter,
  FiSearch,
  FiChevronLeft,
  FiX,
  FiTrash2
} from 'react-icons/fi'
import { getJSON, setJSON } from '../data/storage'
import { AUDIT_LOGS_KEY } from '../data/keys'
import { AuditLog } from '../types/models'
import { getScreenshotAttempts } from '../utils/screenshotProtection'
import { useUser } from '../contexts/UserContext'
import { Toast, ConfirmDialog } from '../components/common'

interface SecurityAlert {
  id: string
  type: 'critical' | 'high' | 'medium' | 'low'
  message: string
  timestamp: string
  status: 'Resolved' | 'Investigating' | 'Blocked' | 'Pending'
  location?: string
  userName?: string
  resourceName?: string
  action?: string
  classification?: string
}

const DELETED_ALERTS_KEY = 'deleted-security-alerts'

export default function SecurityAlerts() {
  const navigate = useNavigate()
  const { role } = useUser()
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [timeRange, setTimeRange] = useState<string>('all')
  const [deletedAlertIds, setDeletedAlertIds] = useState<Set<string>>(new Set())
  const [alertToDelete, setAlertToDelete] = useState<SecurityAlert | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning' } | null>(null)

  // Load deleted alert IDs from storage
  useEffect(() => {
    const deleted = getJSON<string[]>(DELETED_ALERTS_KEY, []) || []
    setDeletedAlertIds(new Set(deleted))
  }, [])

  // Get all security alerts from audit logs and screenshot attempts
  const allSecurityAlerts = useMemo(() => {
    const allAuditLogs = getJSON<AuditLog[]>(AUDIT_LOGS_KEY, []) || []
    const screenshotAttempts = getScreenshotAttempts()
    
    // Track seen alert IDs to prevent duplicates
    const seenIds = new Set<string>()
    const alerts: SecurityAlert[] = []
    
    // Create a map of screenshot attempt IDs from audit logs to avoid duplicates
    const screenshotAuditLogIds = new Set<string>()
    allAuditLogs
      .filter(log => log.action === 'screenshot_attempt')
      .forEach(log => {
        // Extract screenshot attempt ID from audit log details if available
        const screenshotId = log.details?.screenshotId || log.resourceId
        if (screenshotId) {
          screenshotAuditLogIds.add(screenshotId)
        }
      })
    
    // Get alerts from audit logs (excluding screenshot_attempt - handled separately)
    allAuditLogs
      .filter(log => {
        return (log.action === 'access' && !log.success) || 
               log.action === 'delete' || 
               log.classification === 'Restricted' ||
               log.action === 'modify'
      })
      .forEach(log => {
        if (!seenIds.has(log.id)) {
          seenIds.add(log.id)
          alerts.push({
            id: log.id,
            type: log.action === 'delete' ? 'critical' as const : 
                  log.classification === 'Restricted' ? 'high' as const : 
                  log.action === 'modify' ? 'medium' as const : 'medium' as const,
            message: `${log.action} attempt on ${log.resourceName || 'resource'}`,
            timestamp: log.timestamp,
            status: log.success ? 'Resolved' as const : 'Investigating' as const,
            location: log.details?.location || undefined,
            userName: log.userName,
            resourceName: log.resourceName,
            action: log.action,
            classification: log.classification
          })
        }
      })

    // Get alerts from screenshot attempts (only if not already in audit logs)
    screenshotAttempts
      .filter(attempt => attempt.blocked && !screenshotAuditLogIds.has(attempt.id))
      .forEach(attempt => {
        // Create a unique ID for screenshot alerts
        const alertId = `screenshot-${attempt.id}`
        if (!seenIds.has(alertId)) {
          seenIds.add(alertId)
          alerts.push({
            id: alertId,
            type: 'high' as const,
            message: `Screenshot attempt blocked at ${attempt.location}`,
            timestamp: attempt.timestamp,
            status: 'Blocked' as const,
            location: attempt.location,
            userName: attempt.userName
          })
        }
      })

    // Filter out deleted alerts and sort by timestamp (most recent first)
    const filtered = alerts
      .filter(alert => !deletedAlertIds.has(alert.id))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    return filtered
  }, [deletedAlertIds])

  // Filter alerts based on search, type, status, and time range
  const filteredAlerts = useMemo(() => {
    let filtered = allSecurityAlerts

    // Time range filter
    if (timeRange !== 'all') {
      const now = new Date()
      let cutoffDate: Date
      
      switch (timeRange) {
        case '24h':
          cutoffDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
          break
        case '7d':
          cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case '30d':
          cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          break
        default:
          cutoffDate = new Date(0)
      }
      
      filtered = filtered.filter(alert => new Date(alert.timestamp) >= cutoffDate)
    }

    // Type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(alert => alert.type === filterType)
    }

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(alert => alert.status === filterStatus)
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(alert =>
        alert.message.toLowerCase().includes(query) ||
        alert.userName?.toLowerCase().includes(query) ||
        alert.resourceName?.toLowerCase().includes(query) ||
        alert.location?.toLowerCase().includes(query)
      )
    }

    return filtered
  }, [allSecurityAlerts, searchQuery, filterType, filterStatus, timeRange])

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'critical':
        return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700'
      case 'high':
        return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-700'
      case 'medium':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700'
      default:
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Resolved':
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
      case 'Blocked':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
      case 'Investigating':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const alertCounts = useMemo(() => {
    return {
      total: allSecurityAlerts.length,
      critical: allSecurityAlerts.filter(a => a.type === 'critical').length,
      high: allSecurityAlerts.filter(a => a.type === 'high').length,
      medium: allSecurityAlerts.filter(a => a.type === 'medium').length,
      low: allSecurityAlerts.filter(a => a.type === 'low').length,
    }
  }, [allSecurityAlerts])

  const handleDeleteAlert = (alert: SecurityAlert) => {
    setAlertToDelete(alert)
    setShowDeleteConfirm(true)
  }

  const confirmDeleteAlert = () => {
    if (!alertToDelete) return

    const newDeletedIds = new Set(deletedAlertIds)
    newDeletedIds.add(alertToDelete.id)
    setDeletedAlertIds(newDeletedIds)
    
    // Save to localStorage
    setJSON(DELETED_ALERTS_KEY, Array.from(newDeletedIds))
    
    setToast({ message: 'Security alert deleted', type: 'success' })
    setShowDeleteConfirm(false)
    setAlertToDelete(null)
  }

  return (
    <div className="page-content">
      <div className="page-container">
        {/* Page Header */}
        <div className="page-header">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <FiChevronLeft className="text-xl" />
              </button>
              <div>
                <h1 className="page-title flex items-center gap-2">
                  <FiShield className="text-slate-600 dark:text-slate-400" />
                  Security Alerts
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {filteredAlerts.length} of {allSecurityAlerts.length} alerts
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="card p-4">
            <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Total</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{alertCounts.total}</div>
          </div>
          <div className="card p-4 border-l-4 border-l-red-600">
            <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Critical</div>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{alertCounts.critical}</div>
          </div>
          <div className="card p-4 border-l-4 border-l-orange-600">
            <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">High</div>
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{alertCounts.high}</div>
          </div>
          <div className="card p-4 border-l-4 border-l-yellow-600">
            <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Medium</div>
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{alertCounts.medium}</div>
          </div>
          <div className="card p-4 border-l-4 border-l-blue-600">
            <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Low</div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{alertCounts.low}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="card mb-6">
          <div className="grid md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search alerts..."
                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <FiX />
                </button>
              )}
            </div>

            {/* Type Filter */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="all">All Types</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="all">All Status</option>
              <option value="Investigating">Investigating</option>
              <option value="Blocked">Blocked</option>
              <option value="Resolved">Resolved</option>
              <option value="Pending">Pending</option>
            </select>

            {/* Time Range Filter */}
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-4 py-2 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="all">All Time</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
          </div>
        </div>

        {/* Alerts List */}
        <div className="card">
          {filteredAlerts.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <FiShield className="text-4xl mx-auto mb-3 opacity-50" />
              <p className="text-lg font-medium mb-1">No security alerts found</p>
              <p className="text-sm">
                {allSecurityAlerts.length === 0 
                  ? 'No security alerts have been recorded yet.'
                  : 'Try adjusting your filters to see more alerts.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-4 rounded-lg border-2 ${
                    alert.type === 'critical'
                      ? 'border-red-500 dark:border-red-400 bg-red-50 dark:bg-red-900/20'
                      : alert.type === 'high'
                      ? 'border-orange-500 dark:border-orange-400 bg-orange-50 dark:bg-orange-900/20'
                      : alert.type === 'medium'
                      ? 'border-yellow-500 dark:border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20'
                      : 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <FiAlertTriangle className={`text-lg ${
                          alert.type === 'critical' || alert.type === 'high'
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-yellow-600 dark:text-yellow-400'
                        }`} />
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full border-2 ${getTypeColor(alert.type)}`}>
                          {alert.type.toUpperCase()}
                        </span>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(alert.status)}`}>
                          {alert.status}
                        </span>
                        {alert.classification && (
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            alert.classification === 'Restricted' 
                              ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                              : alert.classification === 'Confidential'
                              ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                              : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                          }`}>
                            {alert.classification}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                        {alert.message}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400 mt-2 flex-wrap">
                        <div className="flex items-center gap-1">
                          <FiClock className="text-xs" />
                          <span>{formatDate(alert.timestamp)}</span>
                        </div>
                        {alert.userName && (
                          <div>
                            <span className="font-medium">User:</span> {alert.userName}
                          </div>
                        )}
                        {alert.resourceName && (
                          <div>
                            <span className="font-medium">Resource:</span> {alert.resourceName}
                          </div>
                        )}
                        {alert.location && (
                          <div>
                            <span className="font-medium">Location:</span> {alert.location}
                          </div>
                        )}
                        {alert.action && (
                          <div>
                            <span className="font-medium">Action:</span> {alert.action}
                          </div>
                        )}
                      </div>
                    </div>
                    {role === 'admin' && (
                      <button
                        onClick={() => handleDeleteAlert(alert)}
                        className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Delete alert"
                      >
                        <FiTrash2 className="text-sm" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          isOpen={showDeleteConfirm}
          onCancel={() => {
            setShowDeleteConfirm(false)
            setAlertToDelete(null)
          }}
          onConfirm={confirmDeleteAlert}
          title="Delete Security Alert"
          message={`Are you sure you want to delete this security alert? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          confirmVariant="danger"
        />

        {/* Toast */}
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </div>
    </div>
  )
}

