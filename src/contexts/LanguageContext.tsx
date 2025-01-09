'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'en' | 'pl';

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

function getBrowserLanguage(): Language {
    if (typeof window === 'undefined') return 'en';
    
    // Get browser language
    const browserLang = navigator.language.toLowerCase();
    
    // Check if it's Polish
    if (browserLang.startsWith('pl')) {
        return 'pl';
    }
    
    // Default to English for all other languages
    return 'en';
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    // Get initial language from: localStorage -> browser preference -> fallback to 'en'
    const [language, setLanguageState] = useState<Language>(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('language') as Language;
            if (stored) return stored;
            return getBrowserLanguage();
        }
        return 'en';
    });

    // Update localStorage when language changes
    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
        if (typeof window !== 'undefined') {
            localStorage.setItem('language', lang);
        }
    };

    // Initialize language from localStorage or browser preference on mount
    useEffect(() => {
        const storedLanguage = localStorage.getItem('language') as Language;
        if (storedLanguage) {
            setLanguageState(storedLanguage);
        } else {
            const browserLang = getBrowserLanguage();
            setLanguageState(browserLang);
            localStorage.setItem('language', browserLang);
        }
    }, []);

    return (
        <LanguageContext.Provider value={{ language, setLanguage }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
} 