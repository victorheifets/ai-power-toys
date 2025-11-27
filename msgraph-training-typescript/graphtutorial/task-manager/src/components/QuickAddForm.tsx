import { useState, useRef, useEffect } from 'react';
import type { VoiceLanguage, TaskFilters } from '../types';
import './QuickAddForm.css';

interface QuickAddFormProps {
  userEmail: string;
  llmEnabled: boolean;
  onLLMEnabledChange: (enabled: boolean) => void;
  onTaskCreated: () => void;
  searchValue: string;
  onSearchChange: (search: string) => void;
  timeframe: TaskFilters['timeframe'];
  onTimeframeChange: (timeframe: TaskFilters['timeframe']) => void;
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
  const isManualStopRef = useRef(false);
  const finalTranscriptRef = useRef('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const silenceTimerRef = useRef<any>(null);

  // Initialize speech recognition
  useEffect(() => {
    if (!isVoiceSupported) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = false; // Auto-stops after 3 seconds of silence
    recognition.interimResults = true;
    recognition.lang = language;
    recognition.maxAlternatives = 3; // Get top 3 alternatives for better accuracy
    
    console.log('🔧 Recognition object created:', {
      type: recognition.constructor.name,
      lang: recognition.lang,
      continuous: recognition.continuous,
      interimResults: recognition.interimResults,
      serviceURI: (recognition as any).serviceURI || 'default',
      grammars: recognition.grammars
    });

    recognition.onresult = (event: any) => {
      console.log('🎤🎤🎤 SPEECH DETECTED! 🎤🎤🎤');
      console.log('Event:', event);
      console.log('Results length:', event.results.length);
      console.log('Result index:', event.resultIndex);
      
      setIsSpeaking(true);
      
      // Clear any existing silence timer
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
      
      // Set timer to detect when speaking stops
      silenceTimerRef.current = setTimeout(() => {
        setIsSpeaking(false);
      }, 1000);
      
      let interim = '';
      
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];

        // Get the best alternative (highest confidence)
        let bestTranscript = result[0].transcript;
        let bestConfidence = result[0].confidence;

        // Check all alternatives and pick the best one
        for (let j = 1; j < result.length; j++) {
          const altConfidence = result[j].confidence;
          if (altConfidence > bestConfidence) {
            bestTranscript = result[j].transcript;
            bestConfidence = altConfidence;
          }
        }

        console.log(`Result ${i}:`, {
          transcript: bestTranscript,
          isFinal: result.isFinal,
          confidence: bestConfidence,
          alternatives: result.length
        });

        if (result.isFinal) {
          console.log('✅✅✅ FINAL:', bestTranscript, `(confidence: ${(bestConfidence * 100).toFixed(1)}%)`);
          finalTranscriptRef.current += bestTranscript + ' ';
          setInput(finalTranscriptRef.current);
        } else {
          interim += bestTranscript;
        }
      }
      
      if (interim) {
        console.log('⏳ Interim:', interim);
        setInput(finalTranscriptRef.current + interim);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('');
      console.error('❌❌❌ SPEECH RECOGNITION ERROR ❌❌❌');
      console.error('Error type:', event.error);
      console.error('Error message:', event.message);
      console.error('Full event object:', event);
      console.error('Event keys:', Object.keys(event));
      console.error('Recognition state:', {
        lang: recognition.lang,
        continuous: recognition.continuous,
        interimResults: recognition.interimResults,
        maxAlternatives: recognition.maxAlternatives
      });
      console.error('');
      
      setIsListening(false);
      setIsSpeaking(false);

      if (event.error === 'not-allowed' || event.error === 'permission-denied') {
        alert('❌ Microphone access denied!\n\nPlease:\n1. Click the 🎤 icon in your browser address bar\n2. Allow microphone access\n3. Refresh the page\n4. Try again');
      } else if (event.error === 'no-speech') {
        console.log('ℹ️ No speech detected - this is normal if you paused');
      } else if (event.error === 'audio-capture') {
        alert('❌ No microphone found!\n\nPlease:\n1. Connect a microphone\n2. Check browser settings\n3. Try again');
      } else if (event.error === 'network') {
        console.error('🔍 NETWORK ERROR DEBUGGING:');
        console.error('- Location:', window.location.href);
        console.error('- Is secure context:', window.isSecureContext);
        console.error('- User agent:', navigator.userAgent);
        console.error('- Online status:', navigator.onLine);
        console.error('');
        console.error('Chrome Speech API requires connection to Google servers.');
        console.error('This is likely being blocked by:');
        console.error('  1. Corporate firewall');
        console.error('  2. Network proxy/VPN');
        console.error('  3. Chrome security settings');
        console.error('');
        console.error('SOLUTION: Use Safari instead - it has on-device speech recognition!');
        
        alert('❌ Chrome cannot connect to Google Speech servers\n\nThis is a Chrome limitation - it requires internet access to Google\'s cloud speech API.\n\n✅ RECOMMENDED SOLUTION:\nOpen this app in Safari - it uses on-device speech recognition that doesn\'t need internet!\n\nOther options:\n1. Check if VPN/Proxy is blocking\n2. Try on different network\n3. Contact IT about firewall rules');
      } else {
        console.error('Unknown error:', event.error);
        alert('❌ Speech recognition error: ' + event.error);
      }
    };

    recognition.onstart = () => {
      console.log('');
      console.log('='.repeat(60));
      console.log('✅ SPEECH RECOGNITION STARTED');
      console.log('='.repeat(60));
      console.log('Language:', language);
      console.log('Continuous:', recognition.continuous);
      console.log('Interim Results:', recognition.interimResults);
      console.log('');
      console.log('🎤 MICROPHONE IS ACTIVE - PLEASE SPEAK NOW');
      console.log('');
      
      setIsListening(true);
      isManualStopRef.current = false;
      finalTranscriptRef.current = '';
      setIsSpeaking(false);
    };

    recognition.onend = () => {
      console.log('🛑 Speech recognition ended');
      console.log('Final recognized text:', finalTranscriptRef.current);
      setIsListening(false);

      // Don't auto-restart - let it stop naturally after silence
      if (!isManualStopRef.current) {
        console.log('✅ Auto-stopped after pause (this is normal)');
        console.log('💡 TIP: You can edit the text above before pressing Enter or clicking Add');
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        try {
          isManualStopRef.current = true;
          recognitionRef.current.stop();
        } catch (e) {
          console.log('Recognition already stopped');
        }
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

  const checkMicrophonePermission = async () => {
    try {
      console.log('🔍 Checking microphone permission...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('✅ Microphone permission granted');
      console.log('Audio tracks:', stream.getAudioTracks());
      
      // Stop the test stream
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error: any) {
      console.error('❌ Microphone permission denied or not available');
      console.error('Error:', error);
      
      if (error.name === 'NotAllowedError') {
        alert('🎤 Microphone Permission Required\n\nPlease allow microphone access:\n1. Click the 🎤 or 🔒 icon in browser address bar\n2. Select "Allow"\n3. Refresh the page if needed');
      } else if (error.name === 'NotFoundError') {
        alert('❌ No Microphone Found\n\nPlease:\n1. Connect a microphone\n2. Check system settings\n3. Restart browser');
      } else {
        alert('❌ Microphone Error: ' + error.message);
      }
      return false;
    }
  };

  const toggleVoiceInput = async () => {
    if (!isVoiceSupported) {
      alert('Voice recognition is not supported in your browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    if (isListening) {
      // Stop listening
      try {
        isManualStopRef.current = true;
        recognitionRef.current?.stop();
        setIsListening(false);
    console.log('🛑 Stopped listening manually');
      } catch (error) {
        console.error('Failed to stop recognition:', error);
        setIsListening(false);
      }
    } else {
      // Check microphone permission first
      const hasPermission = await checkMicrophonePermission();
      if (!hasPermission) {
        return;
      }
      
      // Start listening
      try {
        isManualStopRef.current = false;
        finalTranscriptRef.current = '';
    setIsSpeaking(false);
        
        console.log('');
        console.log('🎤 ATTEMPTING TO START...');
        console.log('Browser:', navigator.userAgent);
        console.log('Language:', language);
        
        recognitionRef.current?.start();
        
        console.log('✅ Start command sent');
        console.log('Waiting for onstart event...');
      } catch (error: any) {
        console.error('Failed to start recognition:', error);
        
        if (error.message && error.message.includes('already started')) {
          console.log('Recognition already running, stopping and retrying...');
          isManualStopRef.current = true;
          recognitionRef.current?.stop();
          
          setTimeout(() => {
            try {
              isManualStopRef.current = false;
              recognitionRef.current?.start();
            } catch (e) {
              console.error('Retry failed:', e);
              setIsListening(false);
            }
          }, 200);
        } else {
          setIsListening(false);
          alert('Failed to start voice recognition. Please try again.');
        }
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim()) return;

    // Stop recognition if it's still running
    if (isListening) {
      try {
        isManualStopRef.current = true;
        recognitionRef.current?.stop();
        setIsListening(false);
      } catch (e) {
        console.log('Recognition already stopped');
      }
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_email: userEmail,
          title: input,
          raw_input: input,
          input_method: 'voice',
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
            onKeyDown={(e) => {
              if (e.key === 'Enter' && input.trim()) {
                e.preventDefault();
                handleSubmit(e as any);
              }
            }}
            placeholder={
              isListening
                ? (isSpeaking ? '🎤 SPEAKING... (I hear you!)' : '🎤 Listening... (waiting for speech)')
                : 'Type or speak task... (Press Enter to add)'
            }
            disabled={isSubmitting}
            className={`${isListening ? 'listening' : ''} ${isSpeaking ? 'speaking' : ''}`}
            style={isSpeaking ? { backgroundColor: '#fef3c7', borderColor: '#f59e0b' } : {}}
            autoFocus
          />

          {isVoiceSupported && (
            <>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as VoiceLanguage)}
                className="language-selector-inline"
                title="Voice language"
                disabled={isListening}
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
                title={isListening ? 'Stop listening (⏸)' : 'Start voice input (🎤)'}
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
          ℹ️ Voice input not available in this browser. Please use Chrome, Edge, or Safari.
        </div>
      )}
    </form>
  );
};

export default QuickAddForm;
