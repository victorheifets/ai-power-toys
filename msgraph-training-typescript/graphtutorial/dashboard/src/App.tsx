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
  validated?: boolean
  validationError?: string
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

  // New email notification
  const [newEmailNotification, setNewEmailNotification] = useState<string | null>(null)

  // Validate token with Graph API
  const validateToken = async (tokenToValidate: string): Promise<void> => {
    try {
      const cleanToken = tokenToValidate.trim().replace(/^Bearer\s+/i, '')

      // Call Graph API /me endpoint to validate token
      const response = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: {
          'Authorization': `Bearer ${cleanToken}`
        }
      })

      if (response.ok) {
        // Token is valid
        const payload = parseJwt(cleanToken)
        if (payload) {
          setTokenInfo({
            name: payload.name,
            email: payload.email,
            upn: payload.upn,
            scopes: payload.scp ? payload.scp.split(' ') : [],
            exp: payload.exp,
            iat: payload.iat,
            validated: true,
            validationError: undefined
          })
        }
      } else {
        // Token is invalid
        const payload = parseJwt(cleanToken)
        const errorText = await response.text()
        setTokenInfo({
          name: payload?.name,
          email: payload?.email,
          upn: payload?.upn,
          scopes: payload?.scp ? payload.scp.split(' ') : [],
          exp: payload?.exp,
          iat: payload?.iat,
          validated: false,
          validationError: `API returned ${response.status}: ${errorText.substring(0, 100)}`
        })
      }
    } catch (err: any) {
      // Network error or parsing error
      const payload = parseJwt(tokenToValidate.trim())
      setTokenInfo({
        name: payload?.name,
        email: payload?.email,
        upn: payload?.upn,
        scopes: payload?.scp ? payload.scp.split(' ') : [],
        exp: payload?.exp,
        iat: payload?.iat,
        validated: false,
        validationError: `Validation failed: ${err.message || 'Network error'}`
      })
    }
  }

  // Parse JWT token when token changes
  useEffect(() => {
    if (token.trim()) {
      // Parse token and validate with Graph API
      validateToken(token)
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
  }, [token])

  // Fetch dashboard data
  const fetchData = async () => {
    if (!userEmail) return

    setLoading(true)
    setError(null)

    try {
      // Fetch stats
      const statsRes = await fetch(`${API_BASE}/api/stats/${userEmail}`)
      if (!statsRes.ok) {
        const errorText = await statsRes.text()
        throw new Error(`Failed to fetch stats (${statsRes.status}): ${errorText}`)
      }
      const statsData = await statsRes.json()
      setStats(statsData)

      // Fetch pending detections
      const pendingRes = await fetch(`${API_BASE}/api/pending/${userEmail}`)
      if (!pendingRes.ok) {
        const errorText = await pendingRes.text()
        throw new Error(`Failed to fetch pending detections (${pendingRes.status}): ${errorText}`)
      }
      const pendingData = await pendingRes.json()
      setPending(pendingData)
    } catch (err: any) {
      const errorMsg = err.message || err.toString() || 'Unknown error'
      const fullError = `${errorMsg}${err.stack ? '\n' + err.stack : ''}`
      setError(fullError)
      console.error('Error fetching data:', {
        message: err.message,
        name: err.name,
        stack: err.stack,
        error: err
      })
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

      // Refresh health status immediately to show updated diagnostics
      await checkHealth()
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

      if (!res.ok) {
        const errorText = await res.text()
        throw new Error(`Failed to fetch subscriptions (${res.status}): ${errorText}`)
      }

      const data = await res.json()
      setSubscriptions(data.value || [])
    } catch (err: any) {
      const errorMsg = err.message || err.toString() || 'Unknown error fetching subscriptions'
      const fullError = `${errorMsg}${err.stack ? '\n' + err.stack : ''}`
      console.error('Error fetching subscriptions:', {
        message: err.message,
        name: err.name,
        stack: err.stack,
        error: err
      })
      setError(fullError)
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
        clientState: 'AIPowerToysSecret123'
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

    // Get webhook URL
    let webhookUrl = notificationUrl.trim()

    if (!webhookUrl || webhookUrl === 'https://your-webhook-url.com/notifications') {
      // Try to get from existing subscriptions
      const existingSub = subscriptions.find(sub => sub.notificationUrl)
      if (existingSub && existingSub.notificationUrl) {
        webhookUrl = existingSub.notificationUrl
        setNotificationUrl(webhookUrl)
      } else {
        // Prompt user for URL
        webhookUrl = prompt('Enter your Cloudflare tunnel webhook URL:\n(e.g., https://your-tunnel.trycloudflare.com/webhook)')

        if (!webhookUrl || webhookUrl.trim() === '') {
          setSubscriptionResult('❌ Cancelled: Webhook URL is required')
          return
        }

        setNotificationUrl(webhookUrl.trim())
        webhookUrl = webhookUrl.trim()
      }
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
        notificationUrl: webhookUrl,
        resource: 'me/messages', // ALL messages (inbox + sent)
        expirationDateTime: expirationDateTime.toISOString(),
        clientState: 'AIPowerToysSecret123'
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

  // Delete subscription
  const deleteSubscription = async (subscriptionId: string) => {
    console.log('deleteSubscription called with ID:', subscriptionId)

    if (!confirm('Are you sure you want to delete this subscription?')) {
      return
    }

    try {
      const cleanToken = token.trim().replace(/^Bearer\s+/i, '')
      const response = await fetch(`https://graph.microsoft.com/v1.0/subscriptions/${subscriptionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${cleanToken}`
        }
      })

      if (response.ok) {
        setSubscriptionResult(`✅ Subscription deleted successfully`)
        await loadSubscriptions() // Reload the list
      } else {
        const errorText = await response.text()
        throw new Error(`Failed to delete subscription: ${errorText}`)
      }
    } catch (err: any) {
      console.error('Error deleting subscription:', err)
      setSubscriptionResult(`❌ Error: ${err.message || 'Failed to delete subscription'}`)
    }
  }

  // Resubscribe (delete old + create new with updated URL)
  const resubscribe = async (oldSubscription: any) => {
    console.log('resubscribe called with subscription:', oldSubscription)

    // Try to get webhook URL from multiple sources:
    // 1. Use the existing subscription's notification URL (just extend expiration)
    // 2. Use the notification URL field if it's set
    // 3. Ask user to enter it

    let webhookUrl = notificationUrl.trim()

    // If notification URL field is not set or is placeholder, use the existing subscription's URL
    if (!webhookUrl || webhookUrl === 'https://your-webhook-url.com/notifications') {
      if (oldSubscription.notificationUrl) {
        webhookUrl = oldSubscription.notificationUrl
        console.log('Using existing subscription URL:', webhookUrl)

        // Update the notification URL field for future use
        setNotificationUrl(webhookUrl)
      } else {
        // Ask user for their Cloudflare tunnel URL
        webhookUrl = prompt('Enter your Cloudflare tunnel webhook URL (e.g., https://your-tunnel.workers.dev/webhook):')

        if (!webhookUrl || webhookUrl.trim() === '') {
          setSubscriptionResult('❌ Cancelled: Webhook URL is required')
          return
        }

        // Update the notification URL field for future use
        setNotificationUrl(webhookUrl.trim())
      }
    }

    console.log('Using webhook URL:', webhookUrl)

    setCreatingSubscription(true)
    setSubscriptionResult(null)

    try {
      const cleanToken = token.trim().replace(/^Bearer\s+/i, '')

      // Delete old subscription
      console.log('Deleting old subscription:', oldSubscription.id)
      const deleteResponse = await fetch(`https://graph.microsoft.com/v1.0/subscriptions/${oldSubscription.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${cleanToken}`
        }
      })

      if (!deleteResponse.ok && deleteResponse.status !== 404) {
        throw new Error(`Failed to delete old subscription: ${deleteResponse.statusText}`)
      }

      console.log('Old subscription deleted, creating new one...')

      // Create new subscription with same resource
      const expirationDateTime = new Date()
      expirationDateTime.setDate(expirationDateTime.getDate() + 3)

      const subscriptionData = {
        changeType: oldSubscription.changeType,
        notificationUrl: webhookUrl,
        resource: oldSubscription.resource,
        expirationDateTime: expirationDateTime.toISOString(),
        clientState: 'AIPowerToysSecret123'
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
        throw new Error(`Failed to create new subscription: ${errorText}`)
      }

      const data = await response.json()
      setSubscriptionResult(`✅ Resubscribed successfully! New ID: ${data.id}`)
      await loadSubscriptions()
    } catch (err: any) {
      console.error('Error resubscribing:', err)
      setSubscriptionResult(`❌ Error: ${err.message || 'Failed to resubscribe'}`)
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

            // Show visual notification
            const subject = data.data?.subject || 'New email'
            const toyType = data.data?.toy_type
            const emoji = toyType === 'follow_up' ? '📅' : toyType === 'kudos' ? '🏆' : toyType === 'task' ? '✅' : toyType === 'urgent' ? '⚠️' : '📧'

            setNewEmailNotification(`${emoji} ${subject}`)

            // Auto-hide notification after 5 seconds
            setTimeout(() => setNewEmailNotification(null), 5000)

            // Refresh data
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
    if (!tokenInfo || !tokenInfo.exp) return true // No token or no expiration = treat as expired
    return Date.now() >= tokenInfo.exp * 1000
  }

  const getTokenStatus = (): { status: string; className: string } => {
    if (!tokenInfo) {
      return { status: 'No Token', className: 'expired' }
    }
    if (tokenInfo.validationError) {
      return { status: 'Invalid', className: 'expired' }
    }
    if (tokenInfo.validated === false) {
      return { status: 'Invalid', className: 'expired' }
    }
    if (isTokenExpired()) {
      return { status: 'Expired', className: 'expired' }
    }
    if (tokenInfo.validated === true) {
      return { status: 'Valid', className: 'valid' }
    }
    return { status: 'Validating...', className: 'validating' }
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

      {/* System Health Diagnostics Banner */}
      {systemHealth?.diagnostics && systemHealth.diagnostics.length > 0 && (
        <div className="system-health-banner">
          <div className="health-banner-content">
            <div className="health-banner-icon">
              {systemHealth.diagnostics.some((d: any) => d.severity === 'ERROR') ? '🔴' :
               systemHealth.diagnostics.some((d: any) => d.severity === 'WARNING') ? '⚠️' : 'ℹ️'}
            </div>
            <div className="health-banner-diagnostics">
              {systemHealth.diagnostics.map((diag: any, idx: number) => (
                <div key={idx} className={`diagnostic-item diagnostic-${diag.severity.toLowerCase()}`}>
                  <div className="diagnostic-header">
                    <span className="diagnostic-component">{diag.component}</span>
                    <span className="diagnostic-severity">{diag.severity}</span>
                  </div>
                  <div className="diagnostic-issue">Issue: {diag.issue}</div>
                  <div className="diagnostic-impact">Impact: {diag.impact}</div>
                  <div className="diagnostic-action">→ {diag.action}</div>
                </div>
              ))}
            </div>
            <div className="health-banner-status">
              Status: {systemHealth.status} |
              Emails: {systemHealth.notificationsReceived} |
              AU: {systemHealth.sseClients}
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

        {newEmailNotification && (
          <div className="new-email-banner">
            📬 New Email: {newEmailNotification}
            <button onClick={() => setNewEmailNotification(null)} className="close-btn">×</button>
          </div>
        )}

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
          <CustomToyBuilder userEmail={userEmail} />
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
                          <span className={`token-status ${getTokenStatus().className}`}>
                            {getTokenStatus().status}
                          </span>
                        </td>
                      </tr>
                      {tokenInfo.validationError && (
                        <tr>
                          <td><strong>Error:</strong></td>
                          <td style={{ color: '#e74c3c', fontSize: '0.9em' }}>{tokenInfo.validationError}</td>
                        </tr>
                      )}
                      {tokenInfo.exp && (
                        <tr>
                          <td><strong>Expires:</strong></td>
                          <td>{new Date(tokenInfo.exp * 1000).toLocaleString()}</td>
                        </tr>
                      )}
                      {tokenInfo.iat && (
                        <tr>
                          <td><strong>Issued At:</strong></td>
                          <td>{new Date(tokenInfo.iat * 1000).toLocaleString()}</td>
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
              <h2>System Monitoring & Diagnostics</h2>
              <p className="section-description">Real-time monitoring of webhook activity and email processing.</p>
              <table className="info-table">
                <tbody>
                  <tr>
                    <td><strong>Total Emails in Database:</strong></td>
                    <td style={{ fontSize: '1.2em', fontWeight: 'bold', color: '#2ecc71' }}>
                      {stats?.total_emails || '0'}
                    </td>
                  </tr>
                  <tr>
                    <td><strong>Webhooks Received (Since Server Start):</strong></td>
                    <td style={{ fontSize: '1.2em', fontWeight: 'bold', color: systemHealth?.notificationsReceived > 0 ? '#2ecc71' : '#e74c3c' }}>
                      {systemHealth?.notificationsReceived || 0}
                      {systemHealth?.notificationsReceived === 0 && (
                        <div style={{ fontSize: '0.85em', marginTop: '5px', color: '#e74c3c' }}>
                          ⚠️ <strong>NO WEBHOOKS RECEIVED</strong><br/>
                          <span style={{ fontSize: '0.9em' }}>Subscription exists but webhooks not arriving. Check if Cloudflare tunnel is running.</span>
                        </div>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td><strong>Last Webhook Received:</strong></td>
                    <td style={{ color: systemHealth?.lastWebhookReceived ? '#2ecc71' : '#e74c3c' }}>
                      {systemHealth?.lastWebhookReceived || '❌ Never'}
                    </td>
                  </tr>
                  <tr>
                    <td><strong>SSE Clients Connected:</strong></td>
                    <td>
                      {systemHealth?.sseClients || 0}
                      <div style={{ fontSize: '0.85em', marginTop: '5px', color: '#7f8c8d' }}>
                        Expected: 1 Dashboard + 1-4 AU instances
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td><strong>AU (Electron) Status:</strong></td>
                    <td>
                      <div style={{ marginBottom: '8px' }}>
                        <div>
                          <strong>AU Connected:</strong> {systemHealth?.sseClients >= 2 ?
                            <span style={{ color: '#2ecc71' }}>✅ Yes ({systemHealth.sseClients - 1} AU client(s))</span> :
                            <span style={{ color: '#e74c3c', fontSize: '1.1em', fontWeight: 'bold' }}>❌ NO AU DETECTED - POPUPS WILL NOT WORK</span>
                          }
                        </div>
                        {systemHealth?.sseClients < 2 && (
                          <div style={{
                            marginTop: '10px',
                            padding: '10px',
                            background: '#fff3cd',
                            border: '1px solid #ffc107',
                            borderRadius: '4px',
                            color: '#856404'
                          }}>
                            <strong>⚠️ ACTION REQUIRED:</strong><br/>
                            AU (Agent UI) is not running. Popups will not appear.<br/>
                            <strong>Fix:</strong> Restart AU from terminal:<br/>
                            <code style={{ background: '#fff', padding: '4px 8px', borderRadius: '3px', display: 'inline-block', marginTop: '5px' }}>
                              cd client-agent && npm exec electron .
                            </code>
                          </div>
                        )}
                        <div style={{ fontSize: '0.85em', marginTop: '5px', color: '#7f8c8d' }}>
                          Check /tmp/au.log for AU activity
                        </div>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td><strong>Dashboard Client State:</strong></td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.9em', color: '#2ecc71' }}>AIPowerToysSecret123</td>
                  </tr>
                  <tr>
                    <td><strong>Server Expected:</strong></td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.9em', color: '#2ecc71' }}>AIPowerToysSecret123</td>
                  </tr>
                  <tr>
                    <td><strong>Active Subscriptions:</strong></td>
                    <td>
                      {subscriptions.length === 0 ? (
                        <span style={{ color: '#e74c3c' }}>❌ No active subscriptions</span>
                      ) : (
                        subscriptions.map((sub, idx) => (
                          <div key={idx} style={{ marginBottom: '8px', fontSize: '0.9em' }}>
                            <div><strong>Resource:</strong> {sub.resource}</div>
                            <div><strong>Status:</strong> {new Date(sub.expirationDateTime) < new Date() ?
                              <span style={{ color: '#e74c3c' }}>⚠️ Expired</span> :
                              <span style={{ color: '#2ecc71' }}>✅ Active</span>
                            }</div>
                            {idx < subscriptions.length - 1 && <hr style={{ margin: '8px 0', borderColor: '#34495e' }} />}
                          </div>
                        ))
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td><strong>Security:</strong></td>
                    <td>Webhooks with mismatched client state are rejected. All must use "AIPowerToysSecret123".</td>
                  </tr>
                </tbody>
              </table>
            </section>

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
                      <th>Notification URL</th>
                      <th>Expires</th>
                      <th>Status & Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscriptions.map((sub) => {
                      const expiresDate = new Date(sub.expirationDateTime)
                      const isExpired = expiresDate < new Date()
                      return (
                        <tr key={sub.id}>
                          <td>{sub.resource}</td>
                          <td className="url-cell">{sub.notificationUrl}</td>
                          <td>{expiresDate.toLocaleString()}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span className={`status-badge ${isExpired ? 'expired' : 'active'}`}>
                                {isExpired ? 'Expired' : 'Active'}
                              </span>
                              <button
                                onClick={() => resubscribe(sub)}
                                disabled={creatingSubscription}
                                className="action-btn resubscribe-btn"
                                title="Delete and recreate with current Cloudflare URL"
                              >
                                🔄 Resubscribe
                              </button>
                              <button
                                onClick={() => deleteSubscription(sub.id)}
                                className="action-btn delete-btn"
                                title="Delete this subscription"
                              >
                                🗑️ Delete
                              </button>
                            </div>
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

            <section className="settings-section">
              <h2>🤖 AI Power Toys - System Prompts</h2>
              <p className="section-description">
                These are the prompts sent to Merck GPT-5 API for detecting Power Toys in emails.
              </p>

              <div style={{ marginTop: '20px' }}>
                <h3 style={{ color: '#6264A7', marginBottom: '10px' }}>📧 Email Detection Prompt</h3>
                <pre style={{
                  background: '#f8f9fa',
                  padding: '15px',
                  borderRadius: '8px',
                  border: '1px solid #dee2e6',
                  overflow: 'auto',
                  fontSize: '0.85em',
                  lineHeight: '1.5',
                  maxHeight: '400px'
                }}>
{`Analyze this email and detect any of these "Power Toys" (action patterns):

1. **Follow-Up Toy**: Email contains action items with deadlines
   - Keywords: "send by Friday", "get back to me", "waiting for", "remind me"

2. **Kudos Toy**: Email mentions achievements or good work
   - Keywords: "great work", "excellent job", "congratulations", "well done"

3. **Task Toy**: Email contains actionable items
   - Keywords: "please do", "can you", "need to", "make sure to"

4. **Urgent Request Toy**: Urgent requests (especially from boss)
   - Keywords: "urgent", "ASAP", "immediately", "by today", "critical"

Email details:
Subject: [email.subject]
From: [email.from.emailAddress.address]
Sent: [email.sentDateTime]
Body: [email.body.content]

Return JSON array with ALL detected toys (can be 0, 1, or multiple):
{
  "detections": [
    {
      "toy_type": "follow_up"|"kudos"|"task"|"urgent",
      "detection_data": {
        // For follow_up: {"action": "...", "deadline": "ISO date", "priority": "high|medium|low"}
        // For kudos: {"achievement": "...", "person": "...", "suggested_action": "..."}
        // For task: {"task_description": "...", "priority": "high|medium|low"}
        // For urgent: {"reason": "...", "deadline": "ISO date", "action_needed": "..."}
      },
      "confidence_score": 0.00-1.00
    }
  ]
}`}
                </pre>

                <h3 style={{ color: '#6264A7', marginTop: '25px', marginBottom: '10px' }}>✅ Task Parsing Prompt</h3>
                <pre style={{
                  background: '#f8f9fa',
                  padding: '15px',
                  borderRadius: '8px',
                  border: '1px solid #dee2e6',
                  overflow: 'auto',
                  fontSize: '0.85em',
                  lineHeight: '1.5',
                  maxHeight: '400px'
                }}>
{`Parse this natural language task input into structured data.

Input: [user input text]
User: [user email]
Current Date: [current date]

Extract and return JSON with:
{
  "title": "Clean, concise task title (remove time/date info from title)",
  "due_date": "ISO 8601 date string if deadline mentioned, otherwise null",
  "priority": "low" | "medium" | "high" (based on urgency keywords or context),
  "task_type": "task" | "follow_up" | "urgent" | "manual" (classify the type),
  "mentioned_people": ["Name1", "Name2"] (extract any person names mentioned),
  "tags": ["keyword1", "keyword2"] (extract important keywords/topics),
  "confidence": 0.0-1.0 (confidence in the extraction)
}

Examples:
- "Call Yan tomorrow about work plan"
  → title: "Call Yan about work plan", due_date: tomorrow's ISO date, mentioned_people: ["Yan"], tags: ["work plan"]

- "Review project proposal by Friday urgent"
  → title: "Review project proposal", due_date: next Friday ISO date, priority: "high", tags: ["project", "proposal"]

- "Buy groceries"
  → title: "Buy groceries", due_date: null, priority: "low"

Return only valid JSON.`}
                </pre>

                <div style={{
                  marginTop: '20px',
                  padding: '15px',
                  background: '#e8f5e9',
                  border: '1px solid #4caf50',
                  borderRadius: '8px'
                }}>
                  <strong>✅ LLM Provider:</strong> Merck GPT-5 (2025-08-07)<br/>
                  <strong>📍 Endpoint:</strong> https://iapi-test.merck.com/gpt/v2/gpt-5-2025-08-07/chat/completions<br/>
                  <strong>🔧 Status:</strong> {systemHealth?.features?.llmProvider || 'Loading...'}
                </div>
              </div>
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
