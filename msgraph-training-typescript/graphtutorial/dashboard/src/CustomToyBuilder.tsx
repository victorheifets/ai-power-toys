import { useState, useEffect } from 'react'
import './CustomToyBuilder.css'

const API_BASE = 'http://localhost:3200'

interface CustomToy {
  id?: number
  user_email: string
  toy_name: string
  icon: string
  user_description: string
  action_type: string
  action_config: {
    button_label: string
    url?: string
  }
  enabled: boolean
  created_at?: string
}

interface CustomToyBuilderProps {
  userEmail: string
  token: string
}

interface ActionTemplate {
  id: string
  icon: string
  name: string
  description: string
  defaultLabel: string
  requiresUrl: boolean
}

const ACTION_TEMPLATES: ActionTemplate[] = [
  {
    id: 'open_url',
    icon: '🌐',
    name: 'Open URL',
    description: 'Open a website in browser',
    defaultLabel: '🌐 Open Portal',
    requiresUrl: true
  },
  {
    id: 'create_task',
    icon: '✅',
    name: 'Create Task',
    description: 'Add to Microsoft To Do',
    defaultLabel: '✅ Create Task',
    requiresUrl: false
  },
  {
    id: 'create_calendar',
    icon: '📅',
    name: 'Create Calendar Event',
    description: 'Add to Outlook calendar',
    defaultLabel: '📅 Add to Calendar',
    requiresUrl: false
  },
  {
    id: 'set_reminder',
    icon: '⏰',
    name: 'Set Reminder',
    description: 'Get notified later',
    defaultLabel: '⏰ Set Reminder',
    requiresUrl: false
  },
  {
    id: 'send_reply',
    icon: '✉️',
    name: 'Send Reply',
    description: 'Auto-reply with template',
    defaultLabel: '✉️ Send Reply',
    requiresUrl: false
  },
  {
    id: 'flag_important',
    icon: '🚩',
    name: 'Flag Important',
    description: 'Mark email as important',
    defaultLabel: '🚩 Flag Important',
    requiresUrl: false
  }
]

const BUILTIN_TOYS = [
  { id: 'follow_up', icon: '📅', name: 'Follow-up', builtin: true },
  { id: 'kudos', icon: '🏆', name: 'Kudos', builtin: true },
  { id: 'task', icon: '✅', name: 'Task', builtin: true },
  { id: 'urgent', icon: '⚠️', name: 'Urgent', builtin: true }
]

function CustomToyBuilder({ userEmail, token }: CustomToyBuilderProps) {
  const [customToys, setCustomToys] = useState<CustomToy[]>([])
  const [selectedToyId, setSelectedToyId] = useState<number | null>(null)
  const [isNewToy, setIsNewToy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [toyName, setToyName] = useState('')
  const [icon, setIcon] = useState('⏰')
  const [userDescription, setUserDescription] = useState('')
  const [actionType, setActionType] = useState('open_url')
  const [buttonLabel, setButtonLabel] = useState('🌐 Open Portal')
  const [actionUrl, setActionUrl] = useState('')

  // Test state
  const [testEmail, setTestEmail] = useState('')
  const [testResult, setTestResult] = useState<{ match: boolean; analysis: string } | null>(null)
  const [testing, setTesting] = useState(false)

  // Save state
  const [saving, setSaving] = useState(false)
  const [saveResult, setSaveResult] = useState<string | null>(null)

  const selectedTemplate = ACTION_TEMPLATES.find(t => t.id === actionType)

  // Load custom toys on mount
  useEffect(() => {
    loadCustomToys()
  }, [userEmail])

  const loadCustomToys = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`${API_BASE}/api/custom-toys/${userEmail}`)
      if (!res.ok) {
        throw new Error('Failed to load custom toys')
      }
      const data = await res.json()
      setCustomToys(data)
    } catch (err: any) {
      console.error('Error loading custom toys:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleNewToy = () => {
    setIsNewToy(true)
    setSelectedToyId(null)
    setToyName('')
    setIcon('⏰')
    setUserDescription('')
    setActionType('open_url')
    setButtonLabel('🌐 Open Portal')
    setActionUrl('')
    setTestResult(null)
    setSaveResult(null)
  }

  const handleActionTypeChange = (templateId: string) => {
    setActionType(templateId)
    const template = ACTION_TEMPLATES.find(t => t.id === templateId)
    if (template) {
      setButtonLabel(template.defaultLabel)
    }
  }

  const handleTest = async () => {
    if (!userDescription.trim() || !testEmail.trim()) {
      setTestResult({ match: false, analysis: 'Please provide both a description and test email' })
      return
    }

    if (!token.trim()) {
      setTestResult({ match: false, analysis: 'Token required. Please add your token in Settings tab.' })
      return
    }

    setTesting(true)
    setTestResult(null)

    try {
      const res = await fetch(`${API_BASE}/api/custom-toys/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_description: userDescription,
          test_email: testEmail,
          token: token.trim()
        })
      })

      if (!res.ok) {
        throw new Error('Test failed')
      }

      const result = await res.json()
      setTestResult({
        match: result.match,
        analysis: result.analysis
      })
    } catch (err: any) {
      setTestResult({ match: false, analysis: `Error: ${err.message}` })
    } finally {
      setTesting(false)
    }
  }

  const handleSave = async () => {
    if (!toyName.trim() || !userDescription.trim() || !buttonLabel.trim()) {
      setSaveResult('Please fill in all required fields')
      return
    }

    if (selectedTemplate?.requiresUrl && !actionUrl.trim()) {
      setSaveResult('URL is required for this action type')
      return
    }

    setSaving(true)
    setSaveResult(null)

    try {
      const customToy: CustomToy = {
        user_email: userEmail,
        toy_name: toyName,
        icon: icon,
        user_description: userDescription,
        action_type: actionType,
        action_config: {
          button_label: buttonLabel,
          ...(selectedTemplate?.requiresUrl ? { url: actionUrl } : {})
        },
        enabled: true
      }

      const res = await fetch(`${API_BASE}/api/custom-toys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customToy)
      })

      if (!res.ok) {
        throw new Error('Failed to save custom toy')
      }

      const savedToy = await res.json()
      setSaveResult('✅ Custom Toy saved successfully!')

      // Reload custom toys
      await loadCustomToys()

      // Reset form after 2 seconds
      setTimeout(() => {
        setIsNewToy(false)
        setSaveResult(null)
      }, 2000)
    } catch (err: any) {
      setSaveResult(`Error: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleSelectToy = (toyId: number) => {
    const toy = customToys.find(t => t.id === toyId)
    if (!toy) return

    setSelectedToyId(toyId)
    setIsNewToy(false)
    setToyName(toy.toy_name)
    setIcon(toy.icon)
    setUserDescription(toy.user_description)
    setActionType(toy.action_type)
    setButtonLabel(toy.action_config.button_label)
    setActionUrl(toy.action_config.url || '')
    setTestResult(null)
    setSaveResult(null)
  }

  const handleDelete = async (toyId: number) => {
    if (!confirm('Are you sure you want to delete this custom toy?')) return

    try {
      const res = await fetch(`${API_BASE}/api/custom-toys/${toyId}`, {
        method: 'DELETE'
      })

      if (!res.ok) {
        throw new Error('Failed to delete custom toy')
      }

      await loadCustomToys()
      setIsNewToy(false)
      setSelectedToyId(null)
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleCancel = () => {
    setIsNewToy(false)
    setSelectedToyId(null)
    setSaveResult(null)
    setTestResult(null)
  }

  return (
    <div className="custom-toy-builder">
      {error && (
        <div className="error-banner">
          Error: {error}
          <button onClick={() => setError(null)} className="close-btn">×</button>
        </div>
      )}

      <div className="builder-grid">
        {/* Left Sidebar - Toy List */}
        <aside className="toy-sidebar">
          <h2>My Power Toys</h2>
          <div className="toy-list">
            {BUILTIN_TOYS.map(toy => (
              <div key={toy.id} className="toy-item builtin">
                <span className="toy-icon">{toy.icon}</span>
                <div className="toy-info">
                  <div className="toy-name">{toy.name}</div>
                  <span className="toy-badge">Built-in</span>
                </div>
              </div>
            ))}

            {loading ? (
              <div className="loading-item">Loading...</div>
            ) : (
              customToys.map(toy => (
                <div
                  key={toy.id}
                  className={`toy-item ${selectedToyId === toy.id ? 'active' : ''}`}
                  onClick={() => handleSelectToy(toy.id!)}
                >
                  <span className="toy-icon">{toy.icon}</span>
                  <div className="toy-info">
                    <div className="toy-name">{toy.toy_name}</div>
                    <span className="toy-badge">Custom</span>
                  </div>
                </div>
              ))
            )}
          </div>
          <button className="new-toy-btn" onClick={handleNewToy}>
            + New Custom Toy
          </button>
        </aside>

        {/* Main Builder Area */}
        <div className="builder-area">
          {!isNewToy && !selectedToyId ? (
            <div className="empty-state">
              <div className="empty-icon">🤖</div>
              <h2>Welcome to AI Power Toy Builder</h2>
              <p>Create custom email detections using natural language</p>
              <button className="btn-primary" onClick={handleNewToy}>
                + Create Your First Custom Toy
              </button>
            </div>
          ) : (
            <>
              <h2 className="builder-title">Create Custom Power Toy</h2>
              <p className="builder-subtitle">Tell the AI what to look for in your emails</p>

              {/* Description Section */}
              <div className="form-section">
                <label className="section-label">What should this Power Toy detect?</label>
                <textarea
                  className="description-input"
                  placeholder="Describe in plain English what kind of emails you want to detect..."
                  value={userDescription}
                  onChange={(e) => {
                    setUserDescription(e.target.value)
                    setTestResult(null) // Clear test results when user edits
                  }}
                  rows={5}
                />
                <div className="help-text">
                  Be specific about sender, subject, content, or any pattern. The AI will use this exact description to match emails at runtime.
                </div>
                <div className="example-box">
                  <div className="example-title">Examples:</div>
                  <div className="example-item">Emails from GitHub about pull requests that mention my username</div>
                  <div className="example-item">Client emails containing "urgent" or "ASAP" in subject</div>
                  <div className="example-item">Weekly reports from team members sent on Fridays</div>
                  <div className="example-item">Expense receipts from finance@company.com with attachments</div>
                </div>
              </div>

              {/* Basic Info */}
              <div className="form-section">
                <label className="section-label">Basic Information</label>
                <div className="inline-group">
                  <div className="form-group">
                    <label>Power Toy Name</label>
                    <input
                      type="text"
                      value={toyName}
                      onChange={(e) => setToyName(e.target.value)}
                      placeholder="Give it a name"
                    />
                  </div>
                  <div className="form-group">
                    <label>Icon Emoji</label>
                    <input
                      type="text"
                      value={icon}
                      onChange={(e) => setIcon(e.target.value)}
                      placeholder="⏰"
                    />
                  </div>
                </div>
              </div>

              {/* Actions Section */}
              <div className="form-section">
                <label className="section-label">What should happen when detected?</label>
                <div className="help-text" style={{ marginBottom: '15px' }}>
                  Choose from predefined action templates
                </div>

                <div className="action-templates">
                  {ACTION_TEMPLATES.map(template => (
                    <div
                      key={template.id}
                      className="template-option"
                      onClick={() => handleActionTypeChange(template.id)}
                    >
                      <input
                        type="radio"
                        name="action_template"
                        value={template.id}
                        checked={actionType === template.id}
                        onChange={() => handleActionTypeChange(template.id)}
                      />
                      <div className="template-content">
                        <div className="template-icon">{template.icon}</div>
                        <div className="template-info">
                          <div className="template-name">{template.name}</div>
                          <div className="template-desc">{template.description}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Action Config */}
                <div className="action-config">
                  <div className="form-group">
                    <label>Button Label</label>
                    <input
                      type="text"
                      value={buttonLabel}
                      onChange={(e) => setButtonLabel(e.target.value)}
                    />
                  </div>
                  {selectedTemplate?.requiresUrl && (
                    <div className="form-group">
                      <label>URL</label>
                      <input
                        type="text"
                        value={actionUrl}
                        onChange={(e) => setActionUrl(e.target.value)}
                        placeholder="https://..."
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Preview */}
              <div className="preview-box">
                <div className="preview-title">📱 Notification Preview</div>
                <div className="notification-preview">
                  <div className="preview-header">
                    <div className="preview-icon">{icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '15px' }}>{toyName || 'Custom Power Toy'}</div>
                      <div style={{ fontSize: '12px', opacity: 0.8 }}>sender@example.com</div>
                    </div>
                  </div>
                  <div className="preview-content">
                    <strong>Subject:</strong> Sample email subject
                  </div>
                  <div className="preview-actions">
                    <button className="preview-action-btn primary">{buttonLabel}</button>
                    <button className="preview-action-btn">Dismiss</button>
                  </div>
                </div>
              </div>

              {/* Test Section */}
              <div className="test-section">
                <div className="test-title">🧪 Test Your Power Toy</div>
                <div className="test-subtitle">Paste a sample email to see if it would trigger</div>
                <textarea
                  className="test-input"
                  placeholder="From: sender@example.com&#10;Subject: Sample subject&#10;Body: Email content..."
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  rows={8}
                />
                <button className="test-btn" onClick={handleTest} disabled={testing}>
                  {testing ? '⏳ Testing...' : '▶ Test Detection'}
                </button>

                {testResult && (
                  <div className={`test-result ${testResult.match ? 'match' : 'no-match'}`}>
                    <div className="result-title">
                      {testResult.match ? '✅ MATCH! This email would trigger your Power Toy' : '❌ NO MATCH - This email would not trigger'}
                    </div>
                    <div className="result-details">
                      <strong>AI Analysis:</strong><br />
                      {testResult.analysis}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="action-buttons">
                <button className="btn btn-secondary" onClick={handleCancel}>
                  Cancel
                </button>
                {selectedToyId && (
                  <button
                    className="btn btn-danger"
                    onClick={() => handleDelete(selectedToyId)}
                  >
                    🗑 Delete
                  </button>
                )}
                <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                  {saving ? '⏳ Saving...' : '💾 Save & Activate'}
                </button>
              </div>

              {saveResult && (
                <div className={`save-result ${saveResult.includes('Error') ? 'error' : 'success'}`}>
                  {saveResult}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default CustomToyBuilder
