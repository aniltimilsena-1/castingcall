import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations, Language as LanguageType } from '../translations';
import { useAuth } from './AuthContext';
import { settingsService } from '../services/settingsService';

interface LanguageContextType {
  language: LanguageType;
  setLanguage: (lang: LanguageType) => void;
  t: (path: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [language, setLanguageState] = useState<LanguageType>('English');

  useEffect(() => {
    const loadLanguage = async () => {
      if (user) {
        const settings = await settingsService.getSettings(user.id);
        if (settings.advanced.language && translations[settings.advanced.language as LanguageType]) {
          setLanguageState(settings.advanced.language as LanguageType);
        }
      }
    };
    loadLanguage();
  }, [user]);

  const setLanguage = (lang: LanguageType) => {
    setLanguageState(lang);
  };

  const t = (path: string): string => {
    const keys = path.split('.');
    let result = translations[language];
    for (const key of keys) {
      if (result && result[key]) {
        result = result[key];
      } else {
        return path; // Return key if not found
      }
    }
    return result as unknown as string;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
};
