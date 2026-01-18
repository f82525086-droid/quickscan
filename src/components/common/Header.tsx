import { useTranslation } from 'react-i18next';
import { Cpu } from 'lucide-react';

export function Header() {
  const { t, i18n } = useTranslation();

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('language', lang);
  };

  return (
    <header className="app-header">
      <div className="container">
        <div className="app-logo">
          <Cpu size={32} />
          <span>{t('app.name')}</span>
        </div>
        <div className="language-switch">
          <button
            className={i18n.language === 'zh' ? 'active' : ''}
            onClick={() => changeLanguage('zh')}
          >
            中文
          </button>
          <button
            className={i18n.language === 'en' ? 'active' : ''}
            onClick={() => changeLanguage('en')}
          >
            EN
          </button>
        </div>
      </div>
    </header>
  );
}
