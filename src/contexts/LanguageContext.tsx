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
    let active = true;
    const loadLanguage = async () => {
      if (user) {
        try {
          const settings = await settingsService.getSettings(user.id);
          if (active && settings?.advanced?.language) {
            const lang = settings.advanced.language as LanguageType;
            if (translations[lang]) {
              setLanguageState(lang);
            }
          }
        } catch (error) {
          console.error("Failed to load language settings:", error);
        }
      }
    };
    loadLanguage();
    return () => { active = false; };
  }, [user]);

  const setLanguage = (lang: LanguageType) => {
    setLanguageState(lang);
  };

  const t = (path: string): string => {
    const keys = path.split('.');
    let result: any = translations[language];
    for (const key of keys) {
      if (result !== null && typeof result === 'object' && Object.prototype.hasOwnProperty.call(result, key)) {
        result = result[key];
      } else {
        return path;
      }
    }
    return typeof result === 'string' ? result : path;
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
