import { useState, useEffect, useMemo } from 'react'
import axios from 'axios'
import { getToken } from '../utils/auth'
import { 
  FiShield, 
  FiLock, 
  FiAlertTriangle, 
  FiCheckCircle, 
  FiRefreshCw,
  FiDownload,
  FiFile,
  FiVideo,
  FiSettings
} from 'react-icons/fi'
import { FaRobot, FaExclamationTriangle, FaTimes, FaClock, FaLightbulb, FaInfoCircle } from 'react-icons/fa'
import { Toast, Modal } from '../components/common'
import { getJSON, setJSON, uuid, nowISO } from '../data/storage'
import { SECURITY_LOGS_KEY, SECURITY_SETTINGS_KEY } from '../data/keys'
import { SecurityLog } from '../types/models'

interface SecuritySettings {
  quantumProofMode: boolean
  mfaEnabled: boolean
  riskScore: number
  lastSecurityScan: string
}

interface ThreatAlert {
  type: string
  severity: string
  details: string
  timestamp: string
}

export default function SecurityCenter() {
  const [settings, setSettings] = useState<SecuritySettings>(() => {
    const saved = getJSON<SecuritySettings>(SECURITY_SETTINGS_KEY, null)
    return saved || {
      quantumProofMode: false,
      mfaEnabled: false,
      riskScore: 15,
      lastSecurityScan: ''
    }
  })
  const [securityLogs, setSecurityLogs] = useState<SecurityLog[]>([])
  const [alerts, setAlerts] = useState<ThreatAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [showDetectionLogs, setShowDetectionLogs] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning' } | null>(null)
  const [showAIExplainModal, setShowAIExplainModal] = useState(false)
  const [selectedAlert, setSelectedAlert] = useState<ThreatAlert | null>(null)
  const [aiExplanation, setAIExplanation] = useState('')
  const [compliance, setCompliance] = useState({
    gdpr: 95,
    pdpl: 0,
    sama: 0
  })
  const [ksaCompliance, setKsaCompliance] = useState<any>(null)

  // Load security logs and alerts from localStorage
  useEffect(() => {
    const savedLogs = getJSON<SecurityLog[]>(SECURITY_LOGS_KEY, []) || []
    setSecurityLogs(savedLogs)
    
    // Convert logs to alerts for display
    const recentLogs = savedLogs.slice(0, 10).reverse()
    const alertsFromLogs: ThreatAlert[] = recentLogs.map(log => ({
      type: log.event,
      severity: log.severity,
      details: log.details || log.event,
      timestamp: log.timestamp
    }))
    setAlerts(alertsFromLogs)
    
    setLoading(false)
  }, [])

  // Save settings to localStorage whenever they change
  useEffect(() => {
    setJSON(SECURITY_SETTINGS_KEY, settings)
  }, [settings])

  // Save logs to localStorage whenever they change
  useEffect(() => {
    if (securityLogs.length >= 0) {
      setJSON(SECURITY_LOGS_KEY, securityLogs)
    }
  }, [securityLogs])

  // Generate fake security log
  const generateSecurityLog = (event: string, severity: SecurityLog['severity'], source: string, details?: string): SecurityLog => {
    return {
      id: uuid(),
      timestamp: nowISO(),
      event,
      severity,
      source,
      status: severity === 'critical' || severity === 'high' ? 'Investigating' : 'Completed',
      details
    }
  }

  // Security scan simulation
  const handleScanRoom = async () => {
    setScanning(true)
    setTimeout(() => {
      const log = generateSecurityLog(
        'Room Security Scan',
        'low',
        'Room Scanner',
        'Current room scanned successfully. No threats detected.'
      )
      setSecurityLogs(prev => [log, ...prev])
      setAlerts(prev => [{
        type: 'Room Scan',
        severity: 'low',
        details: log.details || log.event,
        timestamp: log.timestamp
      }, ...prev.slice(0, 9)])
      setSettings(prev => ({ ...prev, lastSecurityScan: log.timestamp }))
      setToast({ message: 'Room scan completed successfully', type: 'success' })
      setScanning(false)
    }, 1500)
  }

  const handleScanFiles = async () => {
    setScanning(true)
    setTimeout(() => {
      const log = generateSecurityLog(
        'File Security Scan',
        'low',
        'File Scanner',
        'Selected files scanned. All files are secure.'
      )
      setSecurityLogs(prev => [log, ...prev])
      setAlerts(prev => [{
        type: 'File Scan',
        severity: 'low',
        details: log.details || log.event,
        timestamp: log.timestamp
      }, ...prev.slice(0, 9)])
      setSettings(prev => ({ ...prev, lastSecurityScan: log.timestamp }))
      setToast({ message: 'File scan completed successfully', type: 'success' })
      setScanning(false)
    }, 2000)
  }

  const handleFullSystemScan = async () => {
    setScanning(true)
    setTimeout(() => {
      const logs: SecurityLog[] = [
        generateSecurityLog('Full System Scan Started', 'low', 'System Scanner', 'Initiating comprehensive security scan'),
        generateSecurityLog('Network Analysis Complete', 'low', 'Network Monitor', 'Network connections verified'),
        generateSecurityLog('File System Check Complete', 'low', 'File Scanner', 'All files scanned and verified'),
        generateSecurityLog('Authentication Audit Complete', 'low', 'Auth System', 'User access patterns analyzed'),
        generateSecurityLog('Full System Scan Completed', 'low', 'System Scanner', 'System scan completed. No critical threats detected.')
      ]
      setSecurityLogs(prev => [...logs, ...prev])
      setAlerts(prev => [
        ...logs.slice(0, 3).map(log => ({
          type: log.event,
          severity: log.severity,
          details: log.details || log.event,
          timestamp: log.timestamp
        })),
        ...prev.slice(0, 7)
      ])
      setSettings(prev => ({ ...prev, lastSecurityScan: logs[logs.length - 1].timestamp }))
      setToast({ message: 'Full system scan completed successfully', type: 'success' })
      setScanning(false)
    }, 3000)
  }

  // Anomaly detection calculation
  const anomalyStats = useMemo(() => {
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const recentLogs = securityLogs.filter(log => new Date(log.timestamp) >= last24Hours)
    const anomalies = recentLogs.filter(log => 
      log.severity === 'high' || log.severity === 'critical' || 
      log.event.toLowerCase().includes('anomaly') ||
      log.event.toLowerCase().includes('suspicious')
    )
    return {
      isActive: recentLogs.length > 0,
      anomalyCount: anomalies.length,
      totalScans: recentLogs.filter(log => log.event.toLowerCase().includes('scan')).length
    }
  }, [securityLogs])

  const toggleQuantumMode = () => {
    const newValue = !settings.quantumProofMode
    setSettings(prev => ({ ...prev, quantumProofMode: newValue }))
    setToast({ 
      message: newValue ? 'Quantum Mode enabled' : 'Quantum Mode disabled', 
      type: 'success' 
    })
  }

  const toggleMFA = () => {
    const newValue = !settings.mfaEnabled
    setSettings(prev => ({ ...prev, mfaEnabled: newValue }))
    setToast({ 
      message: newValue ? 'MFA enabled' : 'MFA disabled', 
      type: 'success' 
    })
  }

  // AI explanation functions
  const explainAlert = (alert: ThreatAlert): string => {
    const severity = alert.severity
    const details = alert.details.toLowerCase()
    
    let explanation = `This ${severity}-severity alert indicates: `
    
    if (details.includes('login') || details.includes('authentication')) {
      explanation += `An authentication-related event was detected. This could be a legitimate login from a new location or a potential unauthorized access attempt. `
    } else if (details.includes('scan')) {
      explanation += `A security scan was performed. This is a routine security check to ensure your system is protected. `
    } else if (details.includes('anomaly') || details.includes('suspicious')) {
      explanation += `Unusual activity patterns were detected that deviate from normal system behavior. This requires investigation. `
    } else if (details.includes('failed')) {
      explanation += `Multiple failed attempts were detected. This could indicate a brute force attack or a user having trouble logging in. `
    } else {
      explanation += `${alert.details}. `
    }

    if (severity === 'critical') {
      explanation += `This is a critical issue that requires immediate attention.`
    } else if (severity === 'high') {
      explanation += `This is a high-priority issue that should be addressed soon.`
    } else {
      explanation += `This is a low-priority informational alert.`
    }

    return explanation
  }

  const recommendAction = (alert: ThreatAlert): string => {
    const severity = alert.severity
    const details = alert.details.toLowerCase()
    
    if (severity === 'critical') {
      return 'Immediate Action: Review the alert details, check system logs, and consider temporarily blocking suspicious IP addresses. Contact your security team if needed.'
    } else if (severity === 'high') {
      return 'Recommended Action: Investigate the alert within the next few hours. Review related logs and verify if this is expected behavior.'
    } else if (details.includes('scan')) {
      return 'No action needed: This is a routine security scan. The system is operating normally.'
    } else {
      return 'Monitor: Keep an eye on this alert. If similar alerts appear frequently, consider investigating further.'
    }
  }

  const summarizeSecurityStatus = (): string => {
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const todayLogs = securityLogs.filter(log => new Date(log.timestamp) >= last24Hours)
    const critical = todayLogs.filter(log => log.severity === 'critical').length
    const high = todayLogs.filter(log => log.severity === 'high').length
    const scans = todayLogs.filter(log => log.event.toLowerCase().includes('scan')).length

    let summary = `Today's Security Summary: `
    summary += `${scans} security scan${scans !== 1 ? 's' : ''} completed. `
    
    if (critical > 0) {
      summary += `${critical} critical alert${critical !== 1 ? 's' : ''} detected - immediate attention required. `
    } else if (high > 0) {
      summary += `${high} high-priority alert${high !== 1 ? 's' : ''} detected - review recommended. `
    } else {
      summary += `No critical or high-priority alerts. System appears secure. `
    }

    summary += `Overall risk score: ${settings.riskScore}/100. `
    
    if (settings.quantumProofMode && settings.mfaEnabled) {
      summary += `Security features are fully enabled with quantum-resistant encryption and multi-factor authentication.`
    } else if (settings.mfaEnabled) {
      summary += `Multi-factor authentication is enabled. Consider enabling quantum mode for enhanced protection.`
    } else {
      summary += `Consider enabling MFA and quantum mode for enhanced security.`
    }

    return summary
  }

  const handleExplainAlert = (alert: ThreatAlert) => {
    setSelectedAlert(alert)
    setAIExplanation(explainAlert(alert))
    setShowAIExplainModal(true)
  }


  const exportAuditLogs = async (format: 'json' | 'csv') => {
    try {
      const token = getToken() || 'mock-token'
      const response = await axios.get(`/api/audit/export?format=${format}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      })
      
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `audit-logs.${format}`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (error) {
      console.error('Error exporting logs:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-white text-xl">Loading security center...</div>
      </div>
    )
  }

  return (
    <div className="page-content">
      <div className="page-container">
        <div className="page-header">
          <h1 className="page-title flex items-center gap-3">
            <FiShield className="text-green-600 dark:text-green-400" />
            Security Center
          </h1>
          <p className="page-subtitle">Advanced security monitoring and controls</p>
        </div>

        {/* AI Security Features */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Threat Detection */}
          <div className="card">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-green-600 rounded-xl flex items-center justify-center">
                <FiShield className="text-white text-xl" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Threat Detection</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">AI-powered real-time threat analysis and behavioral pattern detection with automated response capabilities.</p>
            <div className="space-y-2">
              <button
                onClick={() => {
                  setSelectedAlert({
                    type: 'Security Summary',
                    severity: 'low',
                    details: 'Today\'s Security Status',
                    timestamp: nowISO()
                  })
                  setAIExplanation(summarizeSecurityStatus())
                  setShowAIExplainModal(true)
                }}
                className="w-full btn-secondary text-sm py-2.5"
              >
                <FaRobot className="text-sm" />
                Summarize Security Status Today
              </button>
              <div className="p-2 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 rounded-lg text-xs text-gray-700 dark:text-gray-300">
                ✓ Real-time threat analysis
              </div>
              <div className="p-2 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 rounded-lg text-xs text-gray-700 dark:text-gray-300">
                ✓ Behavioral pattern detection
              </div>
              <div className="p-2 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 rounded-lg text-xs text-gray-700 dark:text-gray-300">
                ✓ Automated response system
              </div>
            </div>
          </div>

          {/* Anomaly Detection */}
          <div className="card">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-blue-600 rounded-xl flex items-center justify-center">
                <FiAlertTriangle className="text-white text-xl" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Anomaly Detection</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">AI continuously monitors system activity to detect unusual patterns and behaviors that may indicate security threats.</p>
            <div className="space-y-2">
              <div className={`p-3 bg-gradient-to-r rounded-lg ${
                anomalyStats.isActive
                  ? 'from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20'
                  : 'from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800'
              }`}>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  Status: {anomalyStats.isActive ? 'Active' : 'Inactive'}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {anomalyStats.anomalyCount} anomal{anomalyStats.anomalyCount !== 1 ? 'ies' : 'y'} detected in last 24h
                </p>
              </div>
               <div className="mb-3 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                 <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                   <FaClock className="text-sm" />
                   <span>Last scan: {settings.lastSecurityScan ? new Date(settings.lastSecurityScan).toLocaleString() : 'Never'}</span>
                 </div>
               </div>
               <button 
                 onClick={() => setShowDetectionLogs(true)}
                 className="w-full btn-primary text-sm py-2.5"
               >
                 View Detection Logs
               </button>
            </div>
          </div>
        </div>

        {/* Security Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl p-6 border-2 border-blue-200/50 dark:border-blue-800/50 shadow-xl shadow-blue-500/10 hover:shadow-2xl hover:shadow-blue-500/20 transition-all">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-900 dark:text-white font-bold text-lg">Encryption Status</h3>
              {settings?.quantumProofMode ? (
                <FiCheckCircle className="text-green-600 dark:text-green-400 text-3xl" />
              ) : (
                <FiLock className="text-blue-600 dark:text-blue-400 text-3xl" />
              )}
            </div>
            <p className="text-gray-700 dark:text-gray-300 text-sm mb-3 font-medium">
              {settings?.quantumProofMode ? 'Quantum-Resistant' : 'Standard AES-256'}
            </p>
              <button
                onClick={toggleQuantumMode}
                className="mt-4 btn-primary text-sm py-2.5"
              >
                {settings.quantumProofMode ? 'Disable Quantum Mode' : 'Enable Quantum Mode'}
              </button>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-3">
              Quantum-resistant encryption protects against future quantum attacks
            </p>
          </div>

          <div className="card-hover">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-900 dark:text-white font-bold text-lg">Risk Score</h3>
              <FiAlertTriangle className="text-yellow-500 dark:text-yellow-400 text-3xl" />
            </div>
            <div className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-green-600 dark:from-blue-400 dark:to-green-400 bg-clip-text text-transparent mb-3">{settings?.riskScore || 0}/100</div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 shadow-inner">
              <div
                className="bg-gradient-to-r from-green-500 via-green-400 to-blue-500 h-3 rounded-full shadow-lg"
                style={{ width: `${settings?.riskScore || 0}%` }}
              />
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-3 font-medium">Lower is better</p>
          </div>

          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl p-6 border-2 border-blue-200/50 dark:border-blue-800/50 shadow-xl shadow-blue-500/10 hover:shadow-2xl hover:shadow-blue-500/20 transition-all">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-900 dark:text-white font-bold text-lg">MFA Status</h3>
              {settings?.mfaEnabled ? (
                <FiCheckCircle className="text-green-600 dark:text-green-400 text-3xl" />
              ) : (
                <FiLock className="text-gray-500 dark:text-gray-400 text-3xl" />
              )}
            </div>
            <p className="text-gray-700 dark:text-gray-300 text-sm mb-3 font-medium">
              {settings.mfaEnabled ? 'Enabled' : 'Disabled'}
            </p>
              <button
                onClick={toggleMFA}
                className="mt-4 btn-primary text-sm py-2.5"
              >
                {settings.mfaEnabled ? 'Disable MFA' : 'Enable MFA'}
              </button>
          </div>
        </div>

            {/* Compliance Overview */}
            <div className="card mb-6">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-green-600 dark:from-blue-400 dark:to-green-400 bg-clip-text text-transparent mb-6">Compliance Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(compliance).map(([standard, score]) => (
              <div key={standard} className="bg-gradient-to-br from-blue-50 to-green-50 dark:from-gray-700 dark:to-gray-700 rounded-xl p-5 border-2 border-blue-200/50 dark:border-blue-800/50 shadow-lg">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-gray-900 dark:text-white font-bold uppercase text-sm">{standard}</span>
                  <span className="text-green-600 dark:text-green-400 font-bold text-lg">{score}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3 shadow-inner">
                  <div
                    className="bg-gradient-to-r from-blue-600 via-blue-500 to-green-600 dark:from-blue-500 dark:via-blue-400 dark:to-green-500 h-3 rounded-full shadow-lg"
                    style={{ width: `${score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          {ksaCompliance && (
            <div className="mt-6 pt-6 border-t border-blue-200/50 dark:border-blue-800/50">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">KSA Compliance Score: {ksaCompliance.overallScore}%</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-blue-500/10 rounded-xl p-4 border border-blue-200/50 dark:border-blue-800/50 shadow-md">
                  <p className="text-blue-600 dark:text-blue-400 font-bold text-lg">PDPL: {ksaCompliance.pdpl.compliant ? '100%' : '0%'}</p>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">Personal Data Protection Law</p>
                </div>
                <div className="bg-purple-500/10 rounded-xl p-4 border border-purple-200/50 dark:border-purple-800/50 shadow-md">
                  <p className="text-purple-600 dark:text-purple-400 font-bold text-lg">SAMA: {ksaCompliance.sama.compliant ? '100%' : '0%'}</p>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">SAMA Cyber Security Framework</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <button
            onClick={handleScanRoom}
            disabled={scanning}
            className="btn-primary disabled:opacity-50"
          >
            <FiVideo className="text-base" />
            {scanning ? 'Scanning...' : 'Scan Current Room'}
          </button>
          <button
            onClick={handleScanFiles}
            disabled={scanning}
            className="btn-primary disabled:opacity-50"
          >
            <FiFile className="text-base" />
            {scanning ? 'Scanning...' : 'Scan Selected Files'}
          </button>
          <button
            onClick={handleFullSystemScan}
            disabled={scanning}
            className="btn-primary disabled:opacity-50"
          >
            <FiRefreshCw className="text-base" />
            {scanning ? 'Scanning...' : 'Run Full System Scan'}
          </button>
          <button
            onClick={() => exportAuditLogs('csv')}
            className="btn-primary"
          >
            <FiDownload className="text-base" />
            Export Audit Logs
          </button>
        </div>

        {/* Recent Alerts */}
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl p-6 border-2 border-blue-200/50 dark:border-blue-800/50 shadow-xl shadow-blue-500/10">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-green-600 dark:from-blue-400 dark:to-green-400 bg-clip-text text-transparent mb-6">Recent Security Alerts</h2>
          {alerts.length === 0 ? (
            <p className="text-gray-600 dark:text-gray-400 font-medium">No recent alerts. System is secure.</p>
          ) : (
            <div className="space-y-4">
              {alerts.map((alert, index) => (
                <div
                  key={index}
                  className="bg-gradient-to-br from-white to-blue-50/30 dark:from-gray-700 dark:to-gray-700 rounded-xl p-5 border-2 border-blue-200/50 dark:border-blue-800/50 shadow-lg"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-gray-900 dark:text-white font-bold">{alert.details}</p>
                      <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                        {new Date(alert.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-4 py-2 rounded-xl text-xs font-bold shadow-lg ${
                          alert.severity === 'critical'
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-2 border-red-500'
                            : alert.severity === 'high'
                            ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-2 border-orange-500'
                            : alert.severity === 'medium'
                            ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-2 border-yellow-500'
                            : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-2 border-green-500'
                        }`}
                      >
                        {alert.severity}
                      </span>
                      <button
                        onClick={() => handleExplainAlert(alert)}
                        className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        title="AI Explanation"
                      >
                        <FaLightbulb className="text-lg" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detection Logs Modal */}
        {showDetectionLogs && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowDetectionLogs(false)}>
            <div 
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col animate-fade-in"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Detection Logs</h2>
                <button
                  onClick={() => setShowDetectionLogs(false)}
                  className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <FaTimes className="text-xl" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-100 dark:bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Timestamp</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Event</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Severity</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Source</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {securityLogs.slice(0, 50).map((log) => (
                        <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                            {log.event}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              log.severity === 'critical' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' :
                              log.severity === 'high' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300' :
                              log.severity === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' :
                              'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                            }`}>
                              {log.severity}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                            {log.source}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              log.status === 'Resolved' || log.status === 'Completed' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                              log.status === 'Blocked' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' :
                              'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                            }`}>
                              {log.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* AI Explanation Modal */}
        <Modal
          isOpen={showAIExplainModal}
          onClose={() => {
            setShowAIExplainModal(false)
            setSelectedAlert(null)
            setAIExplanation('')
          }}
          title="AI Security Explanation"
          size="lg"
        >
          {selectedAlert && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                  {selectedAlert.details}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Severity: <span className="font-semibold capitalize">{selectedAlert.severity}</span> | 
                  Time: {new Date(selectedAlert.timestamp).toLocaleString()}
                </p>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FaInfoCircle className="text-blue-600 dark:text-blue-400" />
                  <h4 className="font-semibold text-gray-900 dark:text-white">Explain this alert in simple language</h4>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {aiExplanation}
                </p>
              </div>

              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FaLightbulb className="text-green-600 dark:text-green-400" />
                  <h4 className="font-semibold text-gray-900 dark:text-white">Recommend next action</h4>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {recommendAction(selectedAlert)}
                </p>
              </div>

              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FaRobot className="text-purple-600 dark:text-purple-400" />
                  <h4 className="font-semibold text-gray-900 dark:text-white">Summarize security status today</h4>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {summarizeSecurityStatus()}
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowAIExplainModal(false)
                    setSelectedAlert(null)
                    setAIExplanation('')
                  }}
                  className="btn-primary flex-1"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </Modal>

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

