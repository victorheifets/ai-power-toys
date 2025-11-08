import { useState, useEffect, useRef } from 'react'
import './App.css'
import CustomToyBuilder from './CustomToyBuilder'

const API_BASE = 'http://localhost:3200'

interface Stats {
  total_emails: string
  total_detections: string
  pending_detections: string
  actioned_detections: string
  follow_up_count: string
  kudos_count: string
  task_count: string
  urgent_count: string
}

interface Detection {
  id: number
  toy_type: string
  detection_data: any
  confidence_score: number
  status: string
  created_at: string
}

interface EmailWithDetections {
  id: number
  subject: string
  from_email: string
  body_preview: string
  received_at: string
  detections: Detection[]
}

interface TokenInfo {
  name?: string
  email?: string
  upn?: string
  scopes: string[]
  exp?: number
  iat?: number
}

interface Subscription {
  id: string
  resource: string
  changeType: string
  notificationUrl: string
  expirationDateTime: string
  clientState?: string
}

// Decode JWT token
function parseJwt(token: string): any {
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    return JSON.parse(jsonPayload)
  } catch (e) {
    console.error('Failed to parse JWT:', e)
    return null
  }
}

function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'settings' | 'custom-toys'>('dashboard')
  const [userEmail] = useState('heifets@merck.com')
  const [stats, setStats] = useState<Stats | null>(null)
  const [pending, setPending] = useState<EmailWithDetections[]>([])
  const [, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null)
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loadingSubscriptions, setLoadingSubscriptions] = useState(false)

  // Subscription creation state
  const [creatingSubscription, setCreatingSubscription] = useState(false)
  const [subscriptionResult, setSubscriptionResult] = useState<string | null>(null)
  const [notificationUrl, setNotificationUrl] = useState('https://your-webhook-url.com/notifications')

  // Email compose form state
  const [emailTo, setEmailTo] = useState('')
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [sendingEmail, setSendingEmail] = useState(false)
  const [sendResult, setSendResult] = useState<string | null>(null)

  // Token storage
  const [token, setToken] = useState(() => localStorage.getItem('graphToken') || '')
  const [pendingToken, setPendingToken] = useState(() => localStorage.getItem('graphToken') || '')

  // SSE connection
  const eventSourceRef = useRef<EventSource | null>(null)
  const [sseConnected, setSseConnected] = useState(false)

  // System health monitoring
  const [systemHealth, setSystemHealth] = useState<any>(null)

  // Parse JWT token when token changes
  useEffect(() => {
    if (token.trim()) {
      const payload = parseJwt(token.trim())
      if (payload) {
        setTokenInfo({
          name: payload.name,
          email: payload.email,
          upn: payload.upn,
          scopes: payload.scp ? payload.scp.split(' ') : [],
          exp: payload.exp,
          iat: payload.iat
        })
        localStorage.setItem('graphToken', token)

        // Auto-send token to webhook server on page load/token change
        fetch(`${API_BASE}/api/update-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: token.trim() })
        }).catch(err => console.error('Failed to update webhook server token:', err))
      } else {
        setTokenInfo(null)
      }
    } else {
      setTokenInfo(null)
    }
  }, [token])

  // Fetch dashboard data
  const fetchData = async () => {
    if (!userEmail) return

    setLoading(true)
    setError(null)

    try {
      // Fetch stats
      const statsRes = await fetch(`${API_BASE}/api/stats/${userEmail}`)
      if (!statsRes.ok) throw new Error('Failed to fetch stats')
      const statsData = await statsRes.json()
      setStats(statsData)

      // Fetch pending detections
      const pendingRes = await fetch(`${API_BASE}/api/pending/${userEmail}`)
      if (!pendingRes.ok) throw new Error('Failed to fetch pending detections')
      const pendingData = await pendingRes.json()
      setPending(pendingData)
    } catch (err: any) {
      setError(err.message || 'Failed to fetch data')
      console.error('Error fetching data:', err)
    } finally {
      setLoading(false)
    }
  }

  // Check system health
  const checkHealth = async () => {
    try {
      const res = await fetch(`${API_BASE}/health`)
      if (res.ok) {
        const health = await res.json()
        setSystemHealth(health)
      }
    } catch (err) {
      setSystemHealth(null)
    }
  }

  // Poll system health every 10 seconds
  useEffect(() => {
    checkHealth()
    const interval = setInterval(checkHealth, 10000)
    return () => clearInterval(interval)
  }, [])

  // Apply token
  const applyToken = async () => {
    setToken(pendingToken)
    
    // Send token to webhook server so it can fetch messages
    try {
      await fetch(`${API_BASE}/api/update-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: pendingToken })
      })
    } catch (err) {
      console.error('Failed to update webhook server token:', err)
    }
  }

  // Load subscriptions
  const loadSubscriptions = async () => {
    if (!token.trim()) return

    setLoadingSubscriptions(true)
    try {
      const cleanToken = token.trim().replace(/^Bearer\s+/i, '')
      const res = await fetch(`${API_BASE}/api/subscriptions`, {
        headers: {
          'Authorization': `Bearer ${cleanToken}`
        }
      })

      if (!res.ok) throw new Error('Failed to fetch subscriptions')

      const data = await res.json()
      setSubscriptions(data.value || [])
    } catch (err: any) {
      console.error('Error fetching subscriptions:', err)
      setError(err.message || 'Failed to fetch subscriptions')
    } finally {
      setLoadingSubscriptions(false)
    }
  }

  // Create subscription
  const createSubscription = async () => {
    if (!token.trim() || !notificationUrl.trim()) return

    setCreatingSubscription(true)
    setSubscriptionResult(null)

    try {
      const cleanToken = token.trim().replace(/^Bearer\s+/i, '')

      // Create subscription for mail messages (expires in 3 days max)
      const expirationDateTime = new Date()
      expirationDateTime.setDate(expirationDateTime.getDate() + 3)

      const subscriptionData = {
        changeType: 'created',
        notificationUrl: notificationUrl.trim(),
        resource: 'me/mailFolders(\'Inbox\')/messages',
        expirationDateTime: expirationDateTime.toISOString(),
        clientState: 'secretClientValue'
      }

      const response = await fetch('https://graph.microsoft.com/v1.0/subscriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${cleanToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(subscriptionData)
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to create subscription: ${errorText}`)
      }

      const data = await response.json()
      setSubscriptionResult(`Subscription created successfully! ID: ${data.id}`)

      // Reload subscriptions to show the new one
      await loadSubscriptions()
    } catch (err: any) {
      console.error('Error creating subscription:', err)
      setSubscriptionResult(`Error: ${err.message || 'Failed to create subscription'}`)
      setError(err.message || 'Failed to create subscription')
    } finally {
      setCreatingSubscription(false)
    }
  }

  // Quick subscribe to messages (both incoming and outgoing)
  const quickSubscribeToMessages = async () => {
    if (!token.trim()) {
      setSubscriptionResult('Error: Please add your access token first')
      return
    }

    if (!notificationUrl.trim() || notificationUrl === 'https://your-webhook-url.com/notifications') {
      setSubscriptionResult('Error: Please configure your Cloudflare tunnel URL first')
      return
    }

    setCreatingSubscription(true)
    setSubscriptionResult(null)

    try {
      const cleanToken = token.trim().replace(/^Bearer\s+/i, '')

      // Check if subscription already exists for me/messages
      const existingMessagesSub = subscriptions.find(
        sub => sub.resource === 'me/messages' || sub.resource.includes('me/messages')
      )

      if (existingMessagesSub) {
        setSubscriptionResult(`✅ Message subscription already exists! ID: ${existingMessagesSub.id}`)
        setCreatingSubscription(false)
        return
      }

      // Create subscription for ALL messages (incoming + outgoing)
      const expirationDateTime = new Date()
      expirationDateTime.setDate(expirationDateTime.getDate() + 3) // 3 days max for messages

      const subscriptionData = {
        changeType: 'created',
        notificationUrl: notificationUrl.trim(),
        resource: 'me/messages', // ALL messages (inbox + sent)
        expirationDateTime: expirationDateTime.toISOString(),
        clientState: 'secretClientValue'
      }

      const response = await fetch('https://graph.microsoft.com/v1.0/subscriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${cleanToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(subscriptionData)
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to create subscription: ${errorText}`)
      }

      const data = await response.json()
      setSubscriptionResult(`🎉 Message subscription created successfully!\n\nID: ${data.id}\nResource: me/messages (all incoming & outgoing)\nExpires: ${new Date(data.expirationDateTime).toLocaleString()}`)

      // Reload subscriptions to show the new one
      await loadSubscriptions()
    } catch (err: any) {
      console.error('Error creating subscription:', err)
      setSubscriptionResult(`❌ Error: ${err.message || 'Failed to create subscription'}`)
      setError(err.message || 'Failed to create subscription')
    } finally {
      setCreatingSubscription(false)
    }
  }

  // SSE connection management
  useEffect(() => {
    // Connect to SSE
    const connectSSE = () => {
      console.log('Connecting to SSE...')
      const eventSource = new EventSource(`${API_BASE}/api/events`)

      eventSource.onopen = () => {
        console.log('SSE connected')
        setSseConnected(true)
      }

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          console.log('SSE event received:', data)

          if (data.type === 'new_email') {
            console.log('New email detected, refreshing data...')
            fetchData()
          }
        } catch (err) {
          console.error('Error parsing SSE message:', err)
        }
      }

      eventSource.onerror = (err) => {
        console.error('SSE error:', err)
        setSseConnected(false)
        eventSource.close()

        // Reconnect after 5 seconds
        setTimeout(() => {
          console.log('Attempting to reconnect SSE...')
          connectSSE()
        }, 5000)
      }

      eventSourceRef.current = eventSource
    }

    connectSSE()

    // Cleanup on unmount
    return () => {
      if (eventSourceRef.current) {
        console.log('Closing SSE connection')
        eventSourceRef.current.close()
      }
    }
  }, [])

  // Initial data load
  useEffect(() => {
    fetchData()
  }, [userEmail])

  // Load settings on Settings tab mount
  useEffect(() => {
    if (activeTab === 'settings' && token.trim()) {
      loadSubscriptions()
    }
  }, [activeTab])

  const getToyEmoji = (toyType: string): string => {
    switch (toyType) {
      case 'follow_up': return '📅'
      case 'kudos': return '🏆'
      case 'task': return '✅'
      case 'urgent': return '⚠️'
      default: return '📌'
    }
  }

  const getToyLabel = (toyType: string): string => {
    switch (toyType) {
      case 'follow_up': return 'Follow-Up'
      case 'kudos': return 'Kudos'
      case 'task': return 'Task'
      case 'urgent': return 'Urgent'
      default: return toyType
    }
  }

  const formatDate = (dateStr: string): string => {
    try {
      return new Date(dateStr).toLocaleString()
    } catch {
      return dateStr
    }
  }

  const handleActionClick = async (detectionId: number, action: string, toyType: string) => {
    try {
      const statusRes = await fetch(`${API_BASE}/api/detection/${detectionId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: action === 'mark_actioned' ? 'actioned' : action })
      })

      if (!statusRes.ok) throw new Error('Failed to update detection status')

      const actionRes = await fetch(`${API_BASE}/api/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          detection_id: detectionId,
          action_type: action,
          action_data: { toy_type: toyType, timestamp: new Date().toISOString() }
        })
      })

      if (!actionRes.ok) throw new Error('Failed to record action')

      await fetchData()
    } catch (err: any) {
      setError(err.message || 'Failed to perform action')
      console.error('Error performing action:', err)
    }
  }

  const handleDeleteDetection = async (detectionId: number) => {
    if (!confirm('Are you sure you want to delete this detection?')) return

    try {
      const res = await fetch(`${API_BASE}/api/detection/${detectionId}`, {
        method: 'DELETE'
      })

      if (!res.ok) throw new Error('Failed to delete detection')
      await fetchData()
    } catch (err: any) {
      setError(err.message || 'Failed to delete detection')
      console.error('Error deleting detection:', err)
    }
  }

  const handleSendEmail = async () => {
    if (!emailTo.trim() || !emailSubject.trim() || !emailBody.trim()) {
      setSendResult('Please fill in all fields')
      return
    }

    if (!token.trim()) {
      setSendResult('Token required. Please paste your token in Settings tab.')
      return
    }

    setSendingEmail(true)
    setSendResult(null)

    try {
      const res = await fetch(`${API_BASE}/api/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: emailTo,
          subject: emailSubject,
          body: emailBody,
          token: token.trim()
        })
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to send email')
      }

      setSendResult('Email sent successfully!')
      // Keep fields populated for easier testing
      // setEmailTo('')
      // setEmailSubject('')
      // setEmailBody('')
    } catch (err: any) {
      setSendResult(`Error: ${err.message}`)
      console.error('Error sending email:', err)
    } finally {
      setSendingEmail(false)
    }
  }

  const handleTestNotification = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/test-notification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toy_type: 'follow_up',
          subject: 'Test Email: Please send Q4 report by Friday',
          from: 'test@example.com'
        })
      })

      if (!res.ok) throw new Error('Failed to trigger test notification')

      setSendResult('Test notification triggered! Check Agent UI popup.')
    } catch (err: any) {
      setSendResult(`Error: ${err.message}`)
    }
  }

  const getScopeStatus = (scope: string): 'required' | 'optional' | 'extra' => {
    const required = ['Mail.Read', 'Mail.Send', 'MailboxSettings.Read', 'Calendars.ReadWrite']
    const optional = ['User.Read']

    if (required.includes(scope)) return 'required'
    if (optional.includes(scope)) return 'optional'
    return 'extra'
  }

  const getMandatoryScopes = () => {
    return ['Mail.Read', 'Mail.Send', 'MailboxSettings.Read', 'Calendars.ReadWrite']
  }

  const getAllScopes = () => {
    const grantedScopes = tokenInfo?.scopes || []
    const mandatoryScopes = getMandatoryScopes()
    const allScopes = new Set([...mandatoryScopes, ...grantedScopes])
    return Array.from(allScopes)
  }

  const isScopeGranted = (scope: string): boolean => {
    return tokenInfo?.scopes.includes(scope) || false
  }

  const isTokenExpired = (): boolean => {
    if (!tokenInfo || !tokenInfo.exp) return false
    return Date.now() >= tokenInfo.exp * 1000
  }

  return (
    <div className="app-wrapper">
      {/* Full-Width Tabs Bar */}
      <div className="tabs-bar">
        <button
          className={`tab-button ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          📊 Dashboard
        </button>
        <button
          className={`tab-button ${activeTab === 'custom-toys' ? 'active' : ''}`}
          onClick={() => setActiveTab('custom-toys')}
        >
          🤖 Custom Toys
        </button>
        <button
          className={`tab-button ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          ⚙️ Settings
        </button>
      </div>

      {/* System Health Warning Banner */}
      {systemHealth?.warnings && systemHealth.warnings.length > 0 && (
        <div className="system-health-banner">
          <div className="health-banner-content">
            <div className="health-banner-icon">⚠️</div>
            <div className="health-banner-messages">
              {systemHealth.warnings.map((warning: string, idx: number) => (
                <div key={idx} className="health-warning-item">{warning}</div>
              ))}
            </div>
            <div className="health-banner-details">
              <span className="health-detail">
                Graph API: {systemHealth.features?.graphAPIStatus || 'unknown'}
              </span>
              <span className="health-detail">
                AU Clients: {systemHealth.sseClients || 0}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="dashboard-container">
        {/* Left Sidebar - User Info */}
        <aside className="left-sidebar">
          <div className="sidebar-header">
            <h2>AI Power Toys</h2>
            <p className="sidebar-subtitle">Email Detection</p>
          </div>
          <div className="sidebar-content-left">
            <div className="info-section">
              <h3>User</h3>
              <div className="user-email">{userEmail}</div>
            </div>
            <div className="info-section">
              <h3>Connection</h3>
              <div className={`connection-status ${sseConnected ? 'connected' : 'disconnected'}`}>
                {sseConnected ? '🟢 Live Updates' : '🔴 Disconnected'}
              </div>
            </div>
            {stats && (
              <div className="info-section">
                <h3>Quick Stats</h3>
                <div className="quick-stat">
                  <span className="quick-stat-label">Total Emails</span>
                  <span className="quick-stat-value">{stats.total_emails}</span>
                </div>
                <div className="quick-stat">
                  <span className="quick-stat-label">Pending</span>
                  <span className="quick-stat-value highlight">{stats.pending_detections}</span>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="main-content-wrapper">

        {error && (
          <div className="error-banner">
            Error: {error}
            <button onClick={() => setError(null)} className="close-btn">×</button>
          </div>
        )}

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="dashboard-layout">
            <div className="dashboard-main">
              {/* Horizontal Stats Bar */}
              <div className="stats-bar">
                <section className="stats-card">
                  <h2>Statistics Overview</h2>
                  {stats ? (
                    <div className="stats-grid">
                      <div className="stat-item">
                        <span className="stat-label">Total Emails</span>
                        <span className="stat-value">{stats.total_emails}</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">Total Detections</span>
                        <span className="stat-value">{stats.total_detections}</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">Pending</span>
                        <span className="stat-value highlight">{stats.pending_detections}</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">Actioned</span>
                        <span className="stat-value">{stats.actioned_detections}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="loading">Loading...</p>
                  )}
                </section>

                <section className="stats-card">
                  <h2>Detection by Type</h2>
                  {stats ? (
                    <div className="detection-types">
                      <div className="type-item">
                        <span className="type-emoji">📅</span>
                        <div className="type-info">
                          <span className="type-label">Follow-Up</span>
                          <span className="type-count">{stats.follow_up_count}</span>
                        </div>
                      </div>
                      <div className="type-item">
                        <span className="type-emoji">🏆</span>
                        <div className="type-info">
                          <span className="type-label">Kudos</span>
                          <span className="type-count">{stats.kudos_count}</span>
                        </div>
                      </div>
                      <div className="type-item">
                        <span className="type-emoji">✅</span>
                        <div className="type-info">
                          <span className="type-label">Task</span>
                          <span className="type-count">{stats.task_count}</span>
                        </div>
                      </div>
                      <div className="type-item">
                        <span className="type-emoji">⚠️</span>
                        <div className="type-info">
                          <span className="type-label">Urgent</span>
                          <span className="type-count">{stats.urgent_count}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="loading">Loading...</p>
                  )}
                </section>
              </div>

              {/* Pending Detections */}
              <section className="pending-section">
                <h2>Pending Detections ({pending.length} emails)</h2>
                {pending.length === 0 ? (
                  <p className="no-data">No pending detections found</p>
                ) : (
                  <table className="data-table emails-table">
                    <thead>
                      <tr>
                        <th>Subject</th>
                        <th>From</th>
                        <th>Received</th>
                        <th>Preview</th>
                        <th>Detections</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pending.map((email) => (
                        email.detections.map((detection, dIndex) => (
                          <tr key={`${email.id}-${detection.id}`}>
                            {dIndex === 0 && (
                              <>
                                <td rowSpan={email.detections.length}>{email.subject}</td>
                                <td rowSpan={email.detections.length}>{email.from_email}</td>
                                <td rowSpan={email.detections.length}>{formatDate(email.received_at)}</td>
                                <td rowSpan={email.detections.length} className="preview-cell">{email.body_preview}</td>
                              </>
                            )}
                            <td>
                              <div className="detection-cell">
                                <span className="detection-emoji">{getToyEmoji(detection.toy_type)}</span>
                                <span className="detection-label">{getToyLabel(detection.toy_type)}</span>
                                <span className="detection-confidence">{(detection.confidence_score * 100).toFixed(0)}%</span>
                                <details className="detection-details">
                                  <summary>Show Data</summary>
                                  <pre>{JSON.stringify(detection.detection_data, null, 2)}</pre>
                                </details>
                              </div>
                            </td>
                            <td>
                              <div className="action-buttons">
                                <button
                                  className="btn-action"
                                  onClick={() => handleActionClick(detection.id, 'mark_actioned', detection.toy_type)}
                                >
                                  ✓ Action
                                </button>
                                <button
                                  className="btn-dismiss"
                                  onClick={() => handleActionClick(detection.id, 'dismissed', detection.toy_type)}
                                >
                                  ✕ Dismiss
                                </button>
                                <button
                                  className="btn-dismiss"
                                  onClick={() => handleDeleteDetection(detection.id)}
                                  style={{ background: '#e74c3c' }}
                                  title="Delete this detection permanently"
                                >
                                  🗑 Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ))}
                    </tbody>
                  </table>
                )}
              </section>
            </div>
          </div>
        )}

        {/* Custom Toys Tab */}
        {activeTab === 'custom-toys' && (
          <CustomToyBuilder userEmail={userEmail} token={token} />
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="settings-content">
            <section className="settings-section">
              <div className="section-header">
                <h2>Graph API Token</h2>
                <button
                  onClick={applyToken}
                  disabled={!pendingToken.trim() || pendingToken === token}
                  className="refresh-button"
                >
                  Apply Token
                </button>
              </div>
              <p className="section-description">Paste your Microsoft Graph API bearer token below. Click "Apply Token" to activate it.</p>
              <textarea
                value={pendingToken}
                onChange={(e) => setPendingToken(e.target.value)}
                placeholder="Paste your bearer token here..."
                rows={5}
                className="token-input"
              />
            </section>

            {tokenInfo && (
              <div className="settings-grid">
                <section className="settings-section">
                  <h2>Token Information</h2>
                  <table className="info-table">
                    <tbody>
                      <tr>
                        <td><strong>Name:</strong></td>
                        <td>{tokenInfo.name || 'N/A'}</td>
                      </tr>
                      <tr>
                        <td><strong>Email:</strong></td>
                        <td>{tokenInfo.upn || tokenInfo.email || 'N/A'}</td>
                      </tr>
                      <tr>
                        <td><strong>Status:</strong></td>
                        <td>
                          <span className={`token-status ${isTokenExpired() ? 'expired' : 'valid'}`}>
                            {isTokenExpired() ? 'Expired' : 'Valid'}
                          </span>
                        </td>
                      </tr>
                      {tokenInfo.exp && (
                        <tr>
                          <td><strong>Expires:</strong></td>
                          <td>{new Date(tokenInfo.exp * 1000).toLocaleString()}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </section>

                <section className="settings-section">
                  <h2>Token Permissions (Scopes)</h2>
                  <div className="scopes-list">
                    {getAllScopes().map((scope, index) => {
                      const status = getScopeStatus(scope)
                      const granted = isScopeGranted(scope)
                      const isMandatory = getMandatoryScopes().includes(scope)
                      return (
                        <div key={index} className="scope-item">
                          <span className="scope-name">{scope}</span>
                          <span className={`scope-badge scope-${granted ? status : 'missing'}`}>
                            {isMandatory 
                              ? (granted ? '✅ Required' : '❌ Missing')
                              : (granted ? (status === 'optional' ? '✓ Optional (Granted)' : '✓ Extra (Granted)') : '⚠️ Not Granted')
                            }
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </section>
              </div>
            )}

            <section className="settings-section">
              <div className="section-header">
                <h2>Subscription Status</h2>
                <div className="header-buttons">
                  <button
                    onClick={quickSubscribeToMessages}
                    disabled={creatingSubscription || !token.trim() || !notificationUrl.trim() || notificationUrl === 'https://your-webhook-url.com/notifications'}
                    className="quick-subscribe-button"
                  >
                    {creatingSubscription ? '⏳ Creating...' : '📬 Quick Subscribe to Messages'}
                  </button>
                  <button
                    onClick={loadSubscriptions}
                    disabled={loadingSubscriptions || !token.trim()}
                    className="refresh-button"
                  >
                    {loadingSubscriptions ? 'Loading...' : 'Refresh'}
                  </button>
                </div>
              </div>

              {subscriptions.length > 0 ? (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Resource</th>
                      <th>Change Type</th>
                      <th>Notification URL</th>
                      <th>Expires</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscriptions.map((sub) => {
                      const expiresDate = new Date(sub.expirationDateTime)
                      const isExpired = expiresDate < new Date()
                      return (
                        <tr key={sub.id}>
                          <td>{sub.resource}</td>
                          <td>{sub.changeType}</td>
                          <td className="url-cell">{sub.notificationUrl}</td>
                          <td>{expiresDate.toLocaleString()}</td>
                          <td>
                            <span className={`status-badge ${isExpired ? 'expired' : 'active'}`}>
                              {isExpired ? 'Expired' : 'Active'}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              ) : (
                <p className="no-data">
                  {loadingSubscriptions ? 'Loading subscriptions...' : 'No active subscriptions found'}
                </p>
              )}
            </section>

            <section className="settings-section">
              <h2>Create New Subscription</h2>
              <p className="section-description">Create a new subscription to receive notifications for new Inbox messages. Expires in 3 days.</p>

              <div className="form-group">
                <label>Notification URL:</label>
                <input
                  type="text"
                  value={notificationUrl}
                  onChange={(e) => setNotificationUrl(e.target.value)}
                  placeholder="https://your-webhook-url.com/notifications"
                />
              </div>

              <button
                onClick={createSubscription}
                disabled={creatingSubscription || !token.trim() || !notificationUrl.trim()}
                className="send-button"
              >
                {creatingSubscription ? 'Creating...' : 'Create Subscription'}
              </button>

              {subscriptionResult && (
                <div className={`send-result ${subscriptionResult.includes('Error') ? 'error' : 'success'}`}>
                  {subscriptionResult}
                </div>
              )}
            </section>
          </div>
        )}

        <footer className="main-footer">
          <p>Backend: <a href={API_BASE} target="_blank" rel="noreferrer">{API_BASE}</a></p>
          <p>Last updated: {new Date().toLocaleTimeString()}</p>
        </footer>
      </div>

      {/* Right Sidebar - Email Compose */}
      <aside className="right-sidebar">
        <div className="sidebar-header">
          <h2>Compose Email</h2>
        </div>

        <div className="sidebar-content">
          <div className="form-group">
            <label>To:</label>
            <input
              type="email"
              value={emailTo}
              onChange={(e) => setEmailTo(e.target.value)}
              placeholder="recipient@example.com"
            />
          </div>

          <div className="form-group">
            <label>Subject:</label>
            <input
              type="text"
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              placeholder="Email subject"
            />
          </div>

          <div className="form-group">
            <label>Body:</label>
            <textarea
              value={emailBody}
              onChange={(e) => setEmailBody(e.target.value)}
              placeholder="Email body..."
              rows={8}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
            <button
              onClick={handleSendEmail}
              disabled={sendingEmail || !emailTo || !emailSubject || !emailBody}
              className="send-button"
            >
              {sendingEmail ? 'Sending...' : '📤 Send Email'}
            </button>

            <button
              onClick={handleTestNotification}
              className="send-button"
              style={{ background: '#6264A7' }}
            >
              🧪 Test AU Notification
            </button>
          </div>

          {sendResult && (
            <div className={`send-result ${sendResult.includes('Error') ? 'error' : 'success'}`}>
              {sendResult}
            </div>
          )}
        </div>
      </aside>
    </div>
  </div>
  )
}

export default App
