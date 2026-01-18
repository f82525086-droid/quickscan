import { useTranslation } from 'react-i18next';
import { Cpu, Battery, HardDrive, Monitor } from 'lucide-react';

interface HomePageProps {
  onStartDetection: () => void;
}

export function HomePage({ onStartDetection }: HomePageProps) {
  const { t } = useTranslation();

  const features = [
    { icon: Cpu, key: 'hardware' },
    { icon: Battery, key: 'battery' },
    { icon: HardDrive, key: 'storage' },
    { icon: Monitor, key: 'interactive' },
  ];

  return (
    <div className="home-page">
      <section className="hero section">
        <div className="container" style={{ textAlign: 'center', padding: '60px 0' }}>
          <h1 style={{ fontSize: '36px', marginBottom: '16px' }}>{t('home.title')}</h1>
          <p style={{ fontSize: '18px', color: 'var(--color-text-secondary)', marginBottom: '32px' }}>
            {t('home.description')}
          </p>
          <button className="btn btn-primary" onClick={onStartDetection} style={{ fontSize: '18px', padding: '16px 48px' }}>
            {t('home.startButton')}
          </button>
        </div>
      </section>

      <section className="features section">
        <div className="container">
          <div className="grid grid-4">
            {features.map(({ icon: Icon, key }) => (
              <div key={key} className="card feature-card">
                <div className="icon">
                  <Icon size={32} />
                </div>
                <h3>{t(`home.features.${key}`)}</h3>
                <p>{t(`home.features.${key}Desc`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
