import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface CameraTestProps {
  onComplete: (working: boolean) => void;
}

export function CameraTest({ onComplete }: CameraTestProps) {
  const { t, i18n } = useTranslation();
  const isZh = i18n.language === 'zh';
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setPermissionDenied(false);
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' } 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.error('Camera error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionDenied(true);
        setError(isZh ? '摄像头权限被拒绝' : 'Camera permission denied');
      } else {
        setError(isZh ? '无法访问摄像头' : 'Unable to access camera');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const handleFinish = (working: boolean) => {
    stopCamera();
    onComplete(working);
  };

  return (
    <div className="camera-test section">
      <div className="container">
        <div className="card" style={{ maxWidth: '600px', margin: '0 auto', padding: '32px' }}>
          <h2 style={{ marginBottom: '8px', textAlign: 'center' }}>{t('camera.title')}</h2>
          <p style={{ marginBottom: '24px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            {t('camera.instruction')}
          </p>

          {/* Camera preview */}
          <div style={{ 
            width: '100%',
            aspectRatio: '4/3',
            backgroundColor: 'var(--color-background)',
            borderRadius: '12px',
            overflow: 'hidden',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {isLoading && (
              <div style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                <Camera size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                <p>{t('common.loading')}</p>
              </div>
            )}
            {error && !permissionDenied && (
              <div style={{ textAlign: 'center', color: 'var(--color-danger)' }}>
                <XCircle size={48} style={{ marginBottom: '16px' }} />
                <p>{error}</p>
              </div>
            )}
            {permissionDenied && (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <AlertTriangle size={48} style={{ marginBottom: '16px', color: 'var(--color-warning)' }} />
                <p style={{ color: 'var(--color-warning)', fontWeight: 'bold', marginBottom: '12px' }}>
                  {isZh ? '需要摄像头权限' : 'Camera Permission Required'}
                </p>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', marginBottom: '16px' }}>
                  {isZh 
                    ? '请在系统弹窗中点击"允许"，或前往「系统设置 → 隐私与安全性 → 摄像头」中允许秒验访问摄像头。' 
                    : 'Please click "Allow" in the system dialog, or go to System Settings → Privacy & Security → Camera to allow QuickScan.'}
                </p>
                <button className="btn btn-primary" onClick={startCamera}>
                  {isZh ? '重新请求权限' : 'Request Permission Again'}
                </button>
              </div>
            )}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{ 
                width: '100%', 
                height: '100%', 
                objectFit: 'cover',
                display: isLoading || error ? 'none' : 'block',
                transform: 'scaleX(-1)', // Mirror
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
            <button 
              className="btn btn-success" 
              onClick={() => handleFinish(true)}
              disabled={isLoading}
            >
              <CheckCircle size={20} />
              {t('camera.working')}
            </button>
            <button 
              className="btn btn-danger" 
              onClick={() => handleFinish(false)}
            >
              <XCircle size={20} />
              {t('camera.notWorking')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
