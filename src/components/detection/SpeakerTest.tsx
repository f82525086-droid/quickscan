import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Volume2, CheckCircle, XCircle } from 'lucide-react';

interface SpeakerTestProps {
  onComplete: (result: { left: boolean; right: boolean }) => void;
}

export function SpeakerTest({ onComplete }: SpeakerTestProps) {
  const { t } = useTranslation();
  const [leftTested, setLeftTested] = useState(false);
  const [rightTested, setRightTested] = useState(false);
  const [currentChannel, setCurrentChannel] = useState<'left' | 'right' | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const playTestSound = (channel: 'left' | 'right') => {
    setCurrentChannel(channel);
    
    // Create audio context
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    const ctx = audioContextRef.current;
    
    // Create oscillator
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const panNode = ctx.createStereoPanner();
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(440, ctx.currentTime); // A4 note
    
    // Set pan (-1 = left, 1 = right)
    panNode.pan.setValueAtTime(channel === 'left' ? -1 : 1, ctx.currentTime);
    
    // Set volume
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1);
    
    // Connect nodes
    oscillator.connect(gainNode);
    gainNode.connect(panNode);
    panNode.connect(ctx.destination);
    
    // Play for 1 second
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 1);
    
    oscillator.onended = () => {
      setCurrentChannel(null);
      if (channel === 'left') setLeftTested(true);
      if (channel === 'right') setRightTested(true);
    };
  };

  return (
    <div className="speaker-test section">
      <div className="container">
        <div className="card" style={{ maxWidth: '500px', margin: '0 auto', padding: '32px' }}>
          <h2 style={{ marginBottom: '8px', textAlign: 'center' }}>{t('speaker.title')}</h2>
          <p style={{ marginBottom: '24px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            {t('speaker.instruction')}
          </p>

          {/* Speaker visualization */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            gap: '48px',
            marginBottom: '32px',
          }}>
            {/* Left speaker */}
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: '100px',
                height: '100px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: currentChannel === 'left' 
                  ? 'var(--color-primary)' 
                  : leftTested 
                    ? 'var(--color-success)' 
                    : 'var(--color-background)',
                color: currentChannel === 'left' || leftTested ? 'white' : 'var(--color-text)',
                transition: 'all 0.3s ease',
                animation: currentChannel === 'left' ? 'pulse 0.5s ease infinite' : 'none',
                marginBottom: '12px',
              }}>
                <Volume2 size={40} />
              </div>
              <button 
                className="btn btn-secondary"
                onClick={() => playTestSound('left')}
                disabled={currentChannel !== null}
                style={{ minWidth: '100px' }}
              >
                {t('speaker.leftChannel')}
              </button>
            </div>

            {/* Right speaker */}
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: '100px',
                height: '100px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: currentChannel === 'right' 
                  ? 'var(--color-primary)' 
                  : rightTested 
                    ? 'var(--color-success)' 
                    : 'var(--color-background)',
                color: currentChannel === 'right' || rightTested ? 'white' : 'var(--color-text)',
                transition: 'all 0.3s ease',
                animation: currentChannel === 'right' ? 'pulse 0.5s ease infinite' : 'none',
                marginBottom: '12px',
              }}>
                <Volume2 size={40} />
              </div>
              <button 
                className="btn btn-secondary"
                onClick={() => playTestSound('right')}
                disabled={currentChannel !== null}
                style={{ minWidth: '100px' }}
              >
                {t('speaker.rightChannel')}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
            <button 
              className="btn btn-success" 
              onClick={() => onComplete({ left: true, right: true })}
            >
              <CheckCircle size={20} />
              {t('speaker.bothNormal')}
            </button>
            <button 
              className="btn btn-danger" 
              onClick={() => onComplete({ left: leftTested, right: rightTested })}
            >
              <XCircle size={20} />
              {t('speaker.hasIssue')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
