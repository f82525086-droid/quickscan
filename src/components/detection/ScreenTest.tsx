import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SkipForward } from 'lucide-react';

interface ScreenTestProps {
  onComplete: (hasDeadPixel: boolean) => void;
  onSkip: () => void;
}

const COLORS = [
  { key: 'red', value: '#FF0000' },
  { key: 'green', value: '#00FF00' },
  { key: 'blue', value: '#0000FF' },
  { key: 'white', value: '#FFFFFF' },
  { key: 'black', value: '#000000' },
];

export function ScreenTest({ onComplete, onSkip }: ScreenTestProps) {
  const { t } = useTranslation();
  const [currentColorIndex, setCurrentColorIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const currentColor = COLORS[currentColorIndex];
  const isLastColor = currentColorIndex === COLORS.length - 1;

  const handleNextColor = () => {
    if (isLastColor) {
      setIsFullscreen(false);
    } else {
      setCurrentColorIndex(prev => prev + 1);
    }
  };

  const handleFinish = (hasDeadPixel: boolean) => {
    onComplete(hasDeadPixel);
  };

  if (isFullscreen) {
    return (
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: currentColor.value,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
        }}
        onClick={handleNextColor}
      >
        <div 
          style={{
            position: 'absolute',
            bottom: '40px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,0.7)',
            color: 'white',
            padding: '16px 32px',
            borderRadius: '12px',
            textAlign: 'center',
          }}
        >
          <p style={{ marginBottom: '8px' }}>{t(`screen.colors.${currentColor.key}`)}</p>
          <p style={{ fontSize: '14px', opacity: 0.8 }}>
            {isLastColor ? t('screen.finish') : t('screen.nextColor')} (Click)
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="screen-test section">
      <div className="container">
        <div className="card" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center', padding: '40px' }}>
          <h2 style={{ marginBottom: '16px' }}>{t('screen.title')}</h2>
          <p style={{ marginBottom: '32px', color: 'var(--color-text-secondary)' }}>
            {t('screen.instruction')}
          </p>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '32px' }}>
            {COLORS.map((color, index) => (
              <div
                key={color.key}
                style={{
                  width: '40px',
                  height: '40px',
                  backgroundColor: color.value,
                  borderRadius: '8px',
                  border: index === currentColorIndex ? '3px solid var(--color-primary)' : '1px solid var(--color-border)',
                }}
              />
            ))}
          </div>

          <button 
            className="btn btn-primary" 
            onClick={() => setIsFullscreen(true)}
            style={{ marginBottom: '24px' }}
          >
            {t('home.startButton')}
          </button>

          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-success" onClick={() => handleFinish(false)}>
              {t('screen.noDeadPixel')}
            </button>
            <button className="btn btn-danger" onClick={() => handleFinish(true)}>
              {t('screen.hasDeadPixel')}
            </button>
            <button className="btn btn-secondary" onClick={onSkip}>
              <SkipForward size={20} />
              {t('common.skip')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
