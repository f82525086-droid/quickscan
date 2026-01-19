import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { SkipForward } from 'lucide-react';

interface TrackpadTestProps {
  onComplete: (result: { click: boolean; drag: boolean; gesture: boolean }) => void;
  onSkip: () => void;
}

interface Point {
  x: number;
  y: number;
}

export function TrackpadTest({ onComplete, onSkip }: TrackpadTestProps) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [clickCount, setClickCount] = useState(0);
  const [dragPath, setDragPath] = useState<Point[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [gestureDetected, setGestureDetected] = useState(false);

  const clickPassed = clickCount >= 3;
  const dragPassed = dragPath.length > 20;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw drag path
    if (dragPath.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = 'var(--color-primary)';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      ctx.moveTo(dragPath[0].x, dragPath[0].y);
      for (let i = 1; i < dragPath.length; i++) {
        ctx.lineTo(dragPath[i].x, dragPath[i].y);
      }
      ctx.stroke();
    }
  }, [dragPath]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      setDragPath([{ x: e.clientX - rect.left, y: e.clientY - rect.top }]);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      setDragPath(prev => [...prev, { x: e.clientX - rect.left, y: e.clientY - rect.top }]);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleClick = () => {
    setClickCount(prev => prev + 1);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setGestureDetected(true);
  };

  const handleFinish = () => {
    onComplete({
      click: clickPassed,
      drag: dragPassed,
      gesture: gestureDetected,
    });
  };

  return (
    <div className="trackpad-test section">
      <div className="container">
        <div className="card" style={{ maxWidth: '700px', margin: '0 auto', padding: '32px' }}>
          <h2 style={{ marginBottom: '8px', textAlign: 'center' }}>{t('trackpad.title')}</h2>
          <p style={{ marginBottom: '24px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            {t('trackpad.instruction')}
          </p>

          {/* Status indicators */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginBottom: '24px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: clickPassed ? 'var(--color-success)' : 'var(--color-background)',
                color: clickPassed ? 'white' : 'var(--color-text)',
                fontSize: '20px',
                fontWeight: 'bold',
                margin: '0 auto 8px',
              }}>
                {clickCount}
              </div>
              <span style={{ fontSize: '14px' }}>{t('trackpad.click')}</span>
            </div>
            
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: dragPassed ? 'var(--color-success)' : 'var(--color-background)',
                color: dragPassed ? 'white' : 'var(--color-text)',
                fontSize: '20px',
                margin: '0 auto 8px',
              }}>
                {dragPassed ? '✓' : '—'}
              </div>
              <span style={{ fontSize: '14px' }}>{t('trackpad.drag')}</span>
            </div>
            
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: gestureDetected ? 'var(--color-success)' : 'var(--color-background)',
                color: gestureDetected ? 'white' : 'var(--color-text)',
                fontSize: '20px',
                margin: '0 auto 8px',
              }}>
                {gestureDetected ? '✓' : '—'}
              </div>
              <span style={{ fontSize: '14px' }}>{t('trackpad.gesture')}</span>
            </div>
          </div>

          {/* Test area */}
          <div style={{ 
            border: '2px dashed var(--color-border)', 
            borderRadius: '12px', 
            marginBottom: '24px',
            overflow: 'hidden'
          }}>
            <canvas
              ref={canvasRef}
              width={600}
              height={300}
              style={{ display: 'block', width: '100%', cursor: 'crosshair' }}
              onClick={handleClick}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onWheel={handleWheel}
            />
          </div>

          <p style={{ textAlign: 'center', fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '24px' }}>
            {t('trackpad.hint')}
          </p>

          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={handleFinish}>
              {t('screen.finish')}
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
