import { useState, useEffect } from 'react'
import './App.css'

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

interface TestResults {
  success: boolean
  fetched: number
  processed: number
  errors: number
  results: Array<{ subject: string; detections: number }>
}

interface TokenInfo {
  name?: string
  email?: string
  upn?: string
  scopes: string[]
  exp?: number
  iat?: number
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
  const [userEmail, setUserEmail] = useState('heifets@merck.com')
  const [stats, setStats] = useState<Stats | null>(null)
  const [pending, setPending] = useState<EmailWithDetections[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [testToken, setTestToken] = useState('')
  const [testCount, setTestCount] = useState(10)
  const [testResults, setTestResults] = useState<TestResults | null>(null)
  const [testing, setTesting] = useState(false)
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null)
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>('')
  const [testingSubscription, setTestingSubscription] = useState(false)
  const [subscriptions, setSubscriptions] = useState<any[]>([])
  const [loadingSubscriptions, setLoadingSubscriptions] = useState(false)
  const [notificationUrl, setNotificationUrl] = useState('')
  const [creatingSubscription, setCreatingSubscription] = useState(false)

  // Parse JWT token when testToken changes
  useEffect(() => {
    if (testToken.trim()) {
      const payload = parseJwt(testToken.trim())
      if (payload) {
        setTokenInfo({
          name: payload.name,
          email: payload.email,
          upn: payload.upn,
          scopes: payload.scp ? payload.scp.split(' ') : [],
          exp: payload.exp,
          iat: payload.iat
        })
      } else {
        setTokenInfo(null)
      }
    } else {
      setTokenInfo(null)
    }
  }, [testToken])

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

  useEffect(() => {
    fetchData()
  }, [userEmail])

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

  const handleTestSimulation = async () => {
    if (!testToken.trim()) {
      setError('Bearer token is required for testing')
      return
    }

    if (!userEmail) {
      setError('User email is required')
      return
    }

    setTesting(true)
    setError(null)
    setTestResults(null)

    try {
      const res = await fetch(`${API_BASE}/api/test/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: testToken,
          userEmail: userEmail,
          count: testCount
        })
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to run test simulation')
      }

      const results = await res.json()
      setTestResults(results)

      // Refresh data to show new detections
      await fetchData()

    } catch (err: any) {
      setError(err.message || 'Failed to run test simulation')
      console.error('Error running test:', err)
    } finally {
      setTesting(false)
    }
  }

  const handleActionClick = async (detectionId: number, action: string, toyType: string) => {
    try {
      // Update detection status
      const statusRes = await fetch(`${API_BASE}/api/detection/${detectionId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: action === 'mark_actioned' ? 'actioned' : action })
      })

      if (!statusRes.ok) throw new Error('Failed to update detection status')

      // Record user action
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

      // Refresh data to show updated state
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

      // Refresh data to show updated state
      await fetchData()
    } catch (err: any) {
      setError(err.message || 'Failed to delete detection')
      console.error('Error deleting detection:', err)
    }
  }

  const handleClearAllData = async () => {
    if (!confirm('⚠️ WARNING: This will delete ALL emails, detections, and actions from the database. This cannot be undone. Are you sure?')) return

    try {
      const res = await fetch(`${API_BASE}/api/clear-db`, {
        method: 'POST'
      })

      if (!res.ok) throw new Error('Failed to clear database')

      // Refresh data to show empty state
      await fetchData()
    } catch (err: any) {
      setError(err.message || 'Failed to clear database')
      console.error('Error clearing database:', err)
    }
  }

  const isTokenExpired = (): boolean => {
    if (!tokenInfo || !tokenInfo.exp) return false
    return Date.now() >= tokenInfo.exp * 1000
  }

  const handleTestSubscription = async () => {
    if (!testToken.trim()) {
      setError('Bearer token is required for subscription test')
      return
    }

    setTestingSubscription(true)
    setError(null)
    setSubscriptionStatus('')

    // Clean the token - remove "Bearer " prefix if it exists
    const cleanToken = testToken.trim().replace(/^Bearer\s+/i, '')
    console.log('Testing Graph API with /v1.0/me endpoint...')
    console.log('Token length:', cleanToken.length)
    console.log('Token starts with:', cleanToken.substring(0, 50))

    try {
      const res = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: {
          'Authorization': `Bearer ${cleanToken}`,
          'Content-Type': 'application/json'
        }
      })

      console.log('Response status:', res.status, res.statusText)

      if (!res.ok) {
        const errorText = await res.text()
        console.log('Error response:', errorText)
        throw new Error(`Failed to connect to Microsoft Graph: ${res.status} ${res.statusText}`)
      }

      const data = await res.json()
      setSubscriptionStatus(`✅ Successfully connected to Microsoft Graph! User: ${data.displayName || data.userPrincipalName}`)
    } catch (err: any) {
      setSubscriptionStatus(`❌ ${err.message || 'Failed to test subscription'}`)
      console.error('Error testing subscription:', err)
    } finally {
      setTestingSubscription(false)
    }
  }

  const getScopeStatus = (scope: string): 'required' | 'optional' | 'extra' => {
    const required = ['Mail.Read', 'Mail.ReadWrite']
    const optional = ['Calendars.ReadWrite', 'User.Read']

    if (required.includes(scope)) return 'required'
    if (optional.includes(scope)) return 'optional'
    return 'extra'
  }

  const handleViewSubscriptions = async () => {
    if (!testToken.trim()) {
      setError('Bearer token is required')
      return
    }

    setLoadingSubscriptions(true)
    setError(null)

    const cleanToken = testToken.trim().replace(/^Bearer\s+/i, '')

    try {
      const res = await fetch('https://graph.microsoft.com/v1.0/subscriptions', {
        headers: {
          'Authorization': `Bearer ${cleanToken}`,
          'Content-Type': 'application/json'
        }
      })

      console.log('Subscriptions response status:', res.status)

      if (!res.ok) {
        const errorText = await res.text()
        console.log('Subscriptions error response:', errorText)
        throw new Error(`Failed to fetch subscriptions: ${res.status} ${res.statusText}`)
      }

      const data = await res.json()
      console.log('Subscriptions data:', data)
      setSubscriptions(data.value || [])
    } catch (err: any) {
      setError(err.message || 'Failed to fetch subscriptions')
      console.error('Error fetching subscriptions:', err)
    } finally {
      setLoadingSubscriptions(false)
    }
  }

  const handleCreateSubscription = async () => {
    if (!testToken.trim()) {
      setError('Bearer token is required')
      return
    }

    if (!notificationUrl.trim()) {
      setError('Notification URL is required (e.g., https://your-ngrok-url/webhook)')
      return
    }

    setCreatingSubscription(true)
    setError(null)

    const cleanToken = testToken.trim().replace(/^Bearer\s+/i, '')

    // Calculate expiration: 3 days from now (max for delegated permissions)
    const expirationDateTime = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()

    const subscriptionPayload = {
      changeType: 'created',
      notificationUrl: notificationUrl.trim(),
      resource: '/me/messages',
      expirationDateTime: expirationDateTime,
      clientState: 'AIPowerToysSecret123'
    }

    console.log('Creating subscription:', subscriptionPayload)

    try {
      const res = await fetch('https://graph.microsoft.com/v1.0/subscriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${cleanToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(subscriptionPayload)
      })

      console.log('Create subscription response status:', res.status)

      if (!res.ok) {
        const errorText = await res.text()
        console.log('Create subscription error response:', errorText)
        throw new Error(`Failed to create subscription: ${res.status} ${res.statusText}`)
      }

      const data = await res.json()
      console.log('Subscription created:', data)

      setSubscriptionStatus(`✅ Subscription created successfully! ID: ${data.id}`)

      // Refresh subscriptions list
      handleViewSubscriptions()
    } catch (err: any) {
      setError(err.message || 'Failed to create subscription')
      console.error('Error creating subscription:', err)
    } finally {
      setCreatingSubscription(false)
    }
  }

  return (
    <div className="dashboard-container">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>AI Power Toys</h2>
          <p>Multi-Toy Detection</p>
        </div>

        <div className="sidebar-section">
          <h3>User Email</h3>
          <input
            type="email"
            value={userEmail}
            onChange={(e) => setUserEmail(e.target.value)}
            placeholder="Enter email"
          />
          <button onClick={fetchData} disabled={loading}>
            {loading ? 'Loading...' : 'Refresh Data'}
          </button>
        </div>

        <div className="sidebar-section">
          <h3>Test Simulation</h3>
          <label>Bearer Token:</label>
          <textarea
            value={testToken}
            onChange={(e) => setTestToken(e.target.value)}
            placeholder="Paste Microsoft Graph token..."
            rows={5}
          />
          <label>Email Count:</label>
          <input
            type="number"
            value={testCount}
            onChange={(e) => setTestCount(parseInt(e.target.value) || 10)}
            min="1"
            max="50"
          />
          <button
            onClick={handleTestSimulation}
            disabled={testing || !testToken.trim()}
          >
            {testing ? 'Running...' : 'Run Test'}
          </button>
          <button
            onClick={handleTestSubscription}
            disabled={testingSubscription || !testToken.trim()}
            style={{ marginTop: '10px', background: '#3498db' }}
          >
            {testingSubscription ? 'Testing...' : 'Test Subscription'}
          </button>
          <button
            onClick={handleViewSubscriptions}
            disabled={loadingSubscriptions || !testToken.trim()}
            style={{ marginTop: '10px', background: '#9b59b6' }}
          >
            {loadingSubscriptions ? 'Loading...' : 'View Subscriptions'}
          </button>

          <label style={{ marginTop: '15px' }}>Notification URL (ngrok):</label>
          <input
            type="text"
            value={notificationUrl}
            onChange={(e) => setNotificationUrl(e.target.value)}
            placeholder="https://your-ngrok-url.ngrok.io/webhook"
          />
          <button
            onClick={handleCreateSubscription}
            disabled={creatingSubscription || !testToken.trim() || !notificationUrl.trim()}
            style={{ marginTop: '10px', background: '#e67e22' }}
          >
            {creatingSubscription ? 'Creating...' : 'Create Email Subscription'}
          </button>

          {subscriptionStatus && (
            <p style={{ marginTop: '10px', fontSize: '0.85rem', lineHeight: '1.4' }}>
              {subscriptionStatus}
            </p>
          )}
        </div>

        {tokenInfo && (
          <div className="sidebar-section token-info">
            <h3>Token Info</h3>
            <p><strong>Name:</strong> {tokenInfo.name || 'N/A'}</p>
            <p><strong>Email:</strong> {tokenInfo.upn || tokenInfo.email || 'N/A'}</p>
            <p><strong>Status:</strong> <span className={isTokenExpired() ? 'expired' : 'valid'}>
              {isTokenExpired() ? 'Expired' : 'Valid'}
            </span></p>
            {tokenInfo.exp && (
              <p><strong>Expires:</strong> {new Date(tokenInfo.exp * 1000).toLocaleString()}</p>
            )}
          </div>
        )}

        {testResults && (
          <div className="sidebar-section test-results-mini">
            <h3>Test Results</h3>
            <p>Fetched: {testResults.fetched}</p>
            <p>Processed: {testResults.processed}</p>
            <p>Errors: {testResults.errors}</p>
          </div>
        )}

        <div className="sidebar-section" style={{ marginTop: '20px', borderTop: '2px solid #e74c3c', paddingTop: '15px' }}>
          <h3 style={{ color: '#e74c3c' }}>⚠️ Database Management</h3>
          <button
            onClick={handleClearAllData}
            style={{
              background: '#e74c3c',
              width: '100%',
              padding: '10px',
              marginTop: '10px',
              fontWeight: 'bold'
            }}
          >
            🗑️ Clear All Database Data
          </button>
          <p style={{ fontSize: '0.8rem', color: '#bdc3c7', marginTop: '10px', lineHeight: '1.4' }}>
            Warning: This will permanently delete all emails, detections, and actions from the database. This action cannot be undone.
          </p>
        </div>
      </aside>

      <main className="main-content">
        <header className="main-header">
          <h1>Dashboard</h1>
          <p>Real-time email detection and analysis</p>
        </header>

        {error && (
          <div className="error-banner">
            Error: {error}
          </div>
        )}

        <div className="stats-grid-container">
          <section className="stats-section">
            <h2>Statistics Overview</h2>
            {stats ? (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Metric</th>
                    <th>Count</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Total Emails</td>
                    <td>{stats.total_emails}</td>
                  </tr>
                  <tr>
                    <td>Total Detections</td>
                    <td>{stats.total_detections}</td>
                  </tr>
                  <tr>
                    <td>Pending Detections</td>
                    <td>{stats.pending_detections}</td>
                  </tr>
                  <tr>
                    <td>Actioned Detections</td>
                    <td>{stats.actioned_detections}</td>
                  </tr>
                </tbody>
              </table>
            ) : (
              <p className="loading">Loading stats...</p>
            )}
          </section>

          <section className="stats-section">
            <h2>Detections by Type</h2>
            {stats ? (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Icon</th>
                    <th>Count</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Follow-Up</td>
                    <td className="emoji-cell">📅</td>
                    <td>{stats.follow_up_count}</td>
                  </tr>
                  <tr>
                    <td>Kudos</td>
                    <td className="emoji-cell">🏆</td>
                    <td>{stats.kudos_count}</td>
                  </tr>
                  <tr>
                    <td>Task</td>
                    <td className="emoji-cell">✅</td>
                    <td>{stats.task_count}</td>
                  </tr>
                  <tr>
                    <td>Urgent</td>
                    <td className="emoji-cell">⚠️</td>
                    <td>{stats.urgent_count}</td>
                  </tr>
                </tbody>
              </table>
            ) : (
              <p className="loading">Loading detection types...</p>
            )}
          </section>

          {tokenInfo && (
            <section className="permissions-section">
              <h2>Token Permissions (Scopes)</h2>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Permission</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {tokenInfo.scopes.map((scope, index) => {
                    const status = getScopeStatus(scope)
                    return (
                      <tr key={index}>
                        <td>{index + 1}</td>
                        <td>{scope}</td>
                        <td>
                          <span className={`scope-badge scope-${status}`}>
                            {status === 'required' ? '✓ Required' : status === 'optional' ? '○ Optional' : '• Extra'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </section>
          )}
        </div>

        {subscriptions.length > 0 && (
          <section className="pending-section">
            <h2>Microsoft Graph Subscriptions ({subscriptions.length})</h2>
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Resource</th>
                  <th>Change Type</th>
                  <th>Notification URL</th>
                  <th>Expires</th>
                  <th>Client State</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map((sub: any) => (
                  <tr key={sub.id}>
                    <td style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>{sub.id}</td>
                    <td>{sub.resource}</td>
                    <td>{sub.changeType}</td>
                    <td style={{ fontSize: '0.75rem', wordBreak: 'break-all' }}>{sub.notificationUrl}</td>
                    <td>{new Date(sub.expirationDateTime).toLocaleString()}</td>
                    <td>{sub.clientState || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

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
                            🗑️ Delete
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

        <footer className="main-footer">
          <p>Backend: <a href={API_BASE} target="_blank" rel="noreferrer">{API_BASE}</a></p>
          <p>Last updated: {new Date().toLocaleTimeString()}</p>
        </footer>
      </main>
    </div>
  )
}

export default App
