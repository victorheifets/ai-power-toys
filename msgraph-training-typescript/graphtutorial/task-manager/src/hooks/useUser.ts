// Hook for user state management

import { useState, useCallback } from 'react';
import { DEFAULT_USER_EMAIL } from '../constants';
import { getUserEmail, getLLMEnabled, setLLMEnabled as saveLLMEnabled } from '../utils/storage';

export function useUser() {
  const [userEmail] = useState(() => getUserEmail(DEFAULT_USER_EMAIL));
  const [llmEnabled, setLLMEnabledState] = useState(() => getLLMEnabled());

  const setLLMEnabled = useCallback((enabled: boolean) => {
    setLLMEnabledState(enabled);
    saveLLMEnabled(enabled);
  }, []);

  return {
    userEmail,
    llmEnabled,
    setLLMEnabled
  };
}
