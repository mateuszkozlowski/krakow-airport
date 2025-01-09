import { useLanguage } from '@/contexts/LanguageContext';

export function LanguageSwitch() {
  const { language, setLanguage } = useLanguage();

  return (
    <button
      onClick={() => setLanguage(language === 'en' ? 'pl' : 'en')}
      className="px-2 py-1 rounded-md text-sm"
    >
      {language === 'en' ? 'PL' : 'EN'}
    </button>
  );
} 