import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Mic, Square, Play, CheckCircle, XCircle, AlertTriangle, ExternalLink, SkipForward } from 'lucide-react';
import { Command } from '@tauri-apps/plugin-shell';

interface MicrophoneTestProps {
  onComplete: (working: boolean) => void;
  onSkip: () => void;
}

export function MicrophoneTest({ onComplete, onSkip }: MicrophoneTestProps) {
  const { t, i18n } = useTranslation();
  const isZh = i18n.language === 'zh';
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [volume, setVolume] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const isMountedRef = useRef(true);

  // Cleanup function to stop all audio resources
  const cleanup = () => {
    try {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch (e) {
          console.error('Error stopping recorder:', e);
        }
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        try {
          audioContextRef.current.close();
        } catch (e) {
          console.error('Error closing audio context:', e);
        }
        audioContextRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          try {
            track.stop();
          } catch (e) {
            console.error('Error stopping track:', e);
          }
        });
        streamRef.current = null;
      }
      if (isMountedRef.current) {
        setVolume(0);
        setIsRecording(false);
      }
    } catch (e) {
      console.error('Error in cleanup:', e);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      cleanup();
    };
  }, []);

  const startRecording = async () => {
    try {
      cleanup(); // Clean up any existing resources first
      setError(null);
      setPermissionDenied(false);
      setAudioBlob(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      // Setup audio analysis for volume meter
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 256;
      
      // Start volume monitoring
      const updateVolume = () => {
        if (!analyserRef.current) return;
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b) / dataArray.length;
        setVolume(avg / 255 * 100);
        animationRef.current = requestAnimationFrame(updateVolume);
      };
      updateVolume();
      
      // Setup recorder with supported mime type
      chunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' 
        : MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' 
        : '';
      mediaRecorderRef.current = mimeType 
        ? new MediaRecorder(stream, { mimeType }) 
        : new MediaRecorder(stream);
      
      mediaRecorderRef.current.ondataavailable = (e) => {
        chunksRef.current.push(e.data);
      };
      
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mediaRecorderRef.current?.mimeType || 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
        if (audioContextRef.current) {
          audioContextRef.current.close();
        }
        setVolume(0);
      };
      
      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err: any) {
      console.error('Microphone error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionDenied(true);
        setError(isZh ? '麦克风权限被拒绝' : 'Microphone permission denied');
      } else {
        setError(isZh ? '无法访问麦克风' : 'Unable to access microphone');
      }
    }
  };

  const openSystemSettings = async () => {
    try {
      await Command.create('open', ['x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone']).execute();
    } catch (e) {
      console.error('Failed to open system settings:', e);
      try {
        await Command.create('open', ['-a', 'System Preferences']).execute();
      } catch {
        // ignore
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const playRecording = () => {
    if (!audioBlob) return;
    
    const audio = new Audio(URL.createObjectURL(audioBlob));
    audio.onended = () => setIsPlaying(false);
    audio.play();
    setIsPlaying(true);
  };

  return (
    <div className="microphone-test section">
      <div className="container">
        <div className="card" style={{ maxWidth: '500px', margin: '0 auto', padding: '32px' }}>
          <h2 style={{ marginBottom: '8px', textAlign: 'center' }}>{t('microphone.title')}</h2>
          <p style={{ marginBottom: '24px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            {t('microphone.instruction')}
          </p>

          {permissionDenied && (
            <div style={{ 
              backgroundColor: '#FEF3C7', 
              padding: '16px', 
              borderRadius: '8px',
              marginBottom: '24px',
              textAlign: 'center'
            }}>
              <AlertTriangle size={32} style={{ marginBottom: '8px', color: 'var(--color-warning)' }} />
              <p style={{ color: '#92400E', fontWeight: 'bold', marginBottom: '8px' }}>
                {isZh ? '需要麦克风权限' : 'Microphone Permission Required'}
              </p>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', marginBottom: '12px' }}>
                {isZh 
                  ? '请前往「系统设置 → 隐私与安全性 → 麦克风」中允许秒验访问麦克风，然后返回点击重试。' 
                  : 'Please go to System Settings → Privacy & Security → Microphone to allow QuickScan, then come back and retry.'}
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button className="btn btn-primary" onClick={openSystemSettings}>
                  <ExternalLink size={18} />
                  {isZh ? '打开系统设置' : 'Open System Settings'}
                </button>
                <button className="btn btn-secondary" onClick={startRecording}>
                  {isZh ? '重试' : 'Retry'}
                </button>
              </div>
            </div>
          )}

          {error && !permissionDenied && (
            <div style={{ 
              backgroundColor: '#FEE2E2', 
              color: '#991B1B', 
              padding: '12px', 
              borderRadius: '8px',
              marginBottom: '24px',
              textAlign: 'center'
            }}>
              {error}
            </div>
          )}

          {/* Volume meter */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '16px',
            marginBottom: '24px',
            padding: '20px',
            backgroundColor: 'var(--color-background)',
            borderRadius: '12px',
          }}>
            <Mic size={32} color={isRecording ? 'var(--color-danger)' : 'var(--color-text-secondary)'} />
            <div style={{ flex: 1 }}>
              <div style={{
                height: '12px',
                backgroundColor: 'var(--color-border)',
                borderRadius: '6px',
                overflow: 'hidden',
              }}>
                <div style={{
                  width: `${volume}%`,
                  height: '100%',
                  backgroundColor: isRecording ? 'var(--color-success)' : 'var(--color-border)',
                  transition: 'width 0.1s ease',
                }} />
              </div>
            </div>
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '24px' }}>
            {!isRecording && !audioBlob && (
              <button className="btn btn-primary" onClick={startRecording}>
                <Mic size={20} />
                {t('microphone.record')}
              </button>
            )}
            
            {isRecording && (
              <button className="btn btn-danger" onClick={stopRecording}>
                <Square size={20} />
                {t('microphone.stop')}
              </button>
            )}
            
            {audioBlob && !isRecording && (
              <>
                <button 
                  className="btn btn-secondary" 
                  onClick={playRecording}
                  disabled={isPlaying}
                >
                  <Play size={20} />
                  {t('microphone.play')}
                </button>
                <button className="btn btn-primary" onClick={startRecording}>
                  <Mic size={20} />
                  {t('microphone.rerecord')}
                </button>
              </>
            )}
          </div>

          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button 
              className="btn btn-success" 
              onClick={() => { cleanup(); setTimeout(() => onComplete(true), 50); }}
            >
              <CheckCircle size={20} />
              {t('common.normal')}
            </button>
            <button 
              className="btn btn-danger" 
              onClick={() => { cleanup(); setTimeout(() => onComplete(false), 50); }}
            >
              <XCircle size={20} />
              {t('common.abnormal')}
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={() => { cleanup(); setTimeout(() => onSkip(), 50); }}
            >
              <SkipForward size={20} />
              {t('common.skip')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
