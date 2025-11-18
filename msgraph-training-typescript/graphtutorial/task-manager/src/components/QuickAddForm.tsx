import { useState, useRef, useEffect } from 'react';
import type { VoiceLanguage } from '../types';
import './QuickAddForm.css';

interface QuickAddFormProps {
  userEmail: string;
  llmEnabled: boolean;
  onLLMEnabledChange: (enabled: boolean) => void;
  onTaskCreated: () => void;
  searchValue: string;
  onSearchChange: (search: string) => void;
  timeframe: string;
  onTimeframeChange: (timeframe: string) => void;
}

// Check for Web Speech API support
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
const isVoiceSupported = !!SpeechRecognition;

const QuickAddForm: React.FC<QuickAddFormProps> = ({
  userEmail,
  llmEnabled,
  onLLMEnabledChange,
  onTaskCreated,
  searchValue,
  onSearchChange,
  timeframe,
  onTimeframeChange
}) => {
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [language, setLanguage] = useState<VoiceLanguage>(() => {
    return (localStorage.getItem('voiceLanguage') as VoiceLanguage) || 'en-US';
  });

  const recognitionRef = useRef<any>(null);

  // Initialize speech recognition
  useEffect(() => {
    if (!isVoiceSupported) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = language;

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0])
        .map((result: any) => result.transcript)
        .join('');

      setInput(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);

      if (event.error === 'not-allowed') {
        alert('Microphone access denied. Please allow microphone access in your browser settings.');
      } else if (event.error === 'no-speech') {
        alert('No speech detected. Please try again.');
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [language]);

  // Save language preference
  useEffect(() => {
    localStorage.setItem('voiceLanguage', language);
    if (recognitionRef.current) {
      recognitionRef.current.lang = language;
    }
  }, [language]);

  const toggleVoiceInput = () => {
    if (!isVoiceSupported) {
      alert('Voice recognition is not supported in your browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (error) {
        console.error('Failed to start recognition:', error);
        setIsListening(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim()) return;

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_email: userEmail,
          title: input,
          raw_input: input,
          input_method: isListening ? 'voice' : 'text',
          llm_enabled: llmEnabled
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create task');
      }

      // Clear input
      setInput('');

      // Notify parent
      onTaskCreated();

      console.log('✅ Task created successfully');
    } catch (error: any) {
      console.error('Error creating task:', error);
      alert('Failed to create task: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getLanguageLabel = (lang: VoiceLanguage): string => {
    switch (lang) {
      case 'en-US': return 'English';
      case 'he-IL': return 'עברית';
      case 'ru-RU': return 'Русский';
    }
  };

  return (
    <form className="quick-add-form" onSubmit={handleSubmit}>
      <div className="form-row">
        <div className="input-wrapper">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isListening ? 'Listening...' : 'Type or speak task...'}
            disabled={isSubmitting}
            className={isListening ? 'listening' : ''}
          />

          {isVoiceSupported && (
            <>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as VoiceLanguage)}
                className="language-selector-inline"
                title="Voice language"
              >
                <option value="en-US">🇺🇸 {getLanguageLabel('en-US')}</option>
                <option value="he-IL">🇮🇱 {getLanguageLabel('he-IL')}</option>
                <option value="ru-RU">🇷🇺 {getLanguageLabel('ru-RU')}</option>
              </select>

              <button
                type="button"
                className={`btn-microphone ${isListening ? 'listening' : ''}`}
                onClick={toggleVoiceInput}
                disabled={isSubmitting}
                title="Voice input"
              >
                {isListening ? '⏸' : '🎤'}
              </button>
            </>
          )}
        </div>

        <button
          type="submit"
          className="btn-add"
          disabled={!input.trim() || isSubmitting}
        >
          {isSubmitting ? '⏳' : '+ Add'}
        </button>
      </div>

      <div className="form-controls">
        <div className="controls-left">
          <input
            type="text"
            className="search-input-inline"
            placeholder="🔍 Search tasks..."
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
          />

          <div className="timeframe-badges">
            <button
              type="button"
              className={`timeframe-badge ${timeframe === 'all' ? 'active' : ''}`}
              onClick={() => onTimeframeChange('all')}
            >
              All
            </button>
            <button
              type="button"
              className={`timeframe-badge ${timeframe === 'overdue' ? 'active overdue' : ''}`}
              onClick={() => onTimeframeChange('overdue')}
            >
              Overdue
            </button>
            <button
              type="button"
              className={`timeframe-badge ${timeframe === 'today' ? 'active' : ''}`}
              onClick={() => onTimeframeChange('today')}
            >
              Today
            </button>
            <button
              type="button"
              className={`timeframe-badge ${timeframe === 'tomorrow' ? 'active' : ''}`}
              onClick={() => onTimeframeChange('tomorrow')}
            >
              Tomorrow
            </button>
            <button
              type="button"
              className={`timeframe-badge ${timeframe === 'this_week' ? 'active' : ''}`}
              onClick={() => onTimeframeChange('this_week')}
            >
              This Week
            </button>
            <button
              type="button"
              className={`timeframe-badge ${timeframe === 'later' ? 'active' : ''}`}
              onClick={() => onTimeframeChange('later')}
            >
              Later
            </button>
            <button
              type="button"
              className={`timeframe-badge ${timeframe === 'no_date' ? 'active' : ''}`}
              onClick={() => onTimeframeChange('no_date')}
            >
              No Date
            </button>
          </div>
        </div>

        <div className="controls-right">
          <label className="llm-toggle">
            <input
              type="checkbox"
              checked={llmEnabled}
              onChange={(e) => onLLMEnabledChange(e.target.checked)}
            />
            <span>🤖 AI Smart Parse</span>
            <span className="llm-hint">
              (Extracts due dates, people, tags)
            </span>
          </label>
        </div>
      </div>

      {!isVoiceSupported && (
        <div className="voice-not-supported">
          ℹ️ Voice input not available in this browser
        </div>
      )}
    </form>
  );
};

export default QuickAddForm;
