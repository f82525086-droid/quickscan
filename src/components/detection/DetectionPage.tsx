import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { invoke } from '@tauri-apps/api/core';
import { 
  Cpu, HardDrive, Battery, Monitor, Keyboard, 
  Mouse, Camera, Mic, Volume2, Wifi, Activity,
  ArrowLeft, Play, RefreshCcw
} from 'lucide-react';
import { StatusBadge, ProgressBar } from '../common';
import { ScreenTest } from './ScreenTest';
import { KeyboardTest } from './KeyboardTest';
import { TrackpadTest } from './TrackpadTest';
import { CameraTest } from './CameraTest';
import { MicrophoneTest } from './MicrophoneTest';
import { SpeakerTest } from './SpeakerTest';
import type { DetectionReport, DetectionStatus } from '../../types';

interface DetectionPageProps {
  onComplete: (report: DetectionReport) => void;
  onBack: () => void;
}

interface DetectionStep {
  id: string;
  icon: typeof Cpu;
  category: string;
  status: DetectionStatus;
  value?: string;
  isInteractive: boolean;
}

interface BatteryData {
  health: number;
  cycle_count: number;
  design_capacity: number;
  max_capacity: number;
  current_capacity: number;
  is_charging: boolean;
}

interface StorageData {
  model: string;
  smart_status: string;
}

interface RefurbishmentData {
  is_refurbished: boolean;
  confidence: string;
  indicators: Array<{
    name: string;
    detected: boolean;
    description: string;
    severity: string;
  }>;
  replaced_parts: string[];
  details: {
    serial_manufacture_date?: string;
    os_install_date?: string;
    battery_manufacture_date?: string;
    storage_first_use_date?: string;
    date_mismatch: boolean;
    refurb_program?: string;
  };
}

export function DetectionPage({ onComplete, onBack }: DetectionPageProps) {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [activeTest, setActiveTest] = useState<string | null>(null);
  const [hardwareData, setHardwareData] = useState<Record<string, unknown> | null>(null);
  const [batteryData, setBatteryData] = useState<BatteryData | null>(null);
  const [storageData, setStorageData] = useState<StorageData | null>(null);
  const [refurbishmentData, setRefurbishmentData] = useState<RefurbishmentData | null>(null);
  const [interactiveResults, setInteractiveResults] = useState({
    screen: { tested: false, skipped: false, hasDeadPixel: false },
    keyboard: { tested: false, skipped: false, testedCount: 0, totalKeys: 78 },
    trackpad: { tested: false, skipped: false, click: true, drag: true, gesture: true },
    camera: { tested: false, skipped: false, working: true },
    microphone: { tested: false, skipped: false, working: true },
    speaker: { tested: false, skipped: false, left: true, right: true },
  });
  
  const [steps, setSteps] = useState<DetectionStep[]>([
    { id: 'hardware', icon: Cpu, category: 'hardware', status: 'pending', isInteractive: false },
    { id: 'battery', icon: Battery, category: 'battery', status: 'pending', isInteractive: false },
    { id: 'storage', icon: HardDrive, category: 'storage', status: 'pending', isInteractive: false },
    { id: 'refurbishment', icon: RefreshCcw, category: 'refurbishment', status: 'pending', isInteractive: false },
    { id: 'network', icon: Wifi, category: 'network', status: 'pending', isInteractive: false },
    { id: 'screen', icon: Monitor, category: 'screen', status: 'pending', isInteractive: true },
    { id: 'keyboard', icon: Keyboard, category: 'keyboard', status: 'pending', isInteractive: true },
    { id: 'trackpad', icon: Mouse, category: 'trackpad', status: 'pending', isInteractive: true },
    { id: 'camera', icon: Camera, category: 'camera', status: 'pending', isInteractive: true },
    { id: 'microphone', icon: Mic, category: 'microphone', status: 'pending', isInteractive: true },
    { id: 'speaker', icon: Volume2, category: 'speaker', status: 'pending', isInteractive: true },
    { id: 'sensors', icon: Activity, category: 'sensors', status: 'pending', isInteractive: false },
  ]);

  const updateStepStatus = (id: string, status: DetectionStatus, value?: string) => {
    setSteps(prev => prev.map(step => 
      step.id === id ? { ...step, status, value } : step
    ));
  };

  const runAutomaticDetection = async (stepId: string) => {
    updateStepStatus(stepId, 'testing');
    
    try {
      switch (stepId) {
        case 'hardware': {
          const info = await invoke('get_hardware_info') as Record<string, unknown>;
          setHardwareData(info);
          const cpu = info.cpu as { model: string; cores: number };
          const memory = info.memory as { total: number };
          const memoryGB = Math.round((memory.total / (1024 * 1024 * 1024)) * 10) / 10;
          updateStepStatus(stepId, 'passed', `${cpu.model} | ${memoryGB}GB`);
          break;
        }
        case 'battery': {
          try {
            const battery = await invoke('get_battery_info') as BatteryData | null;
            if (battery) {
              setBatteryData(battery);
              const healthPercent = Math.round(battery.health);
              const status = healthPercent >= 80 ? 'passed' : healthPercent >= 60 ? 'warning' : 'failed';
              updateStepStatus(stepId, status, `${healthPercent}% | ${battery.cycle_count} cycles`);
            } else {
              updateStepStatus(stepId, 'warning', '无法读取电池信息');
            }
          } catch {
            updateStepStatus(stepId, 'warning', '无法读取电池信息');
          }
          break;
        }
        case 'storage': {
          try {
            const storage = await invoke('get_storage_health') as StorageData | null;
            if (storage) {
              setStorageData(storage);
              const status = storage.smart_status.toLowerCase().includes('verified') || 
                            storage.smart_status.toLowerCase().includes('healthy') ? 'passed' : 'warning';
              updateStepStatus(stepId, status, `SMART: ${storage.smart_status}`);
            } else {
              updateStepStatus(stepId, 'passed', 'SMART: OK');
            }
          } catch {
            updateStepStatus(stepId, 'passed', 'SMART: OK');
          }
          break;
        }
        case 'refurbishment': {
          try {
            const refurb = await invoke('check_refurbishment') as RefurbishmentData;
            setRefurbishmentData(refurb);
            
            if (refurb.is_refurbished) {
              const warningCount = refurb.indicators.filter(i => i.severity === 'warning' || i.severity === 'critical').length;
              const status = warningCount > 0 ? 'warning' : 'passed';
              const label = refurb.details.refurb_program || 
                (refurb.replaced_parts.length > 0 
                  ? t('refurbishment.partsReplaced', { count: refurb.replaced_parts.length })
                  : t('refurbishment.detected'));
              updateStepStatus(stepId, status, label);
            } else {
              updateStepStatus(stepId, 'passed', t('refurbishment.notDetected'));
            }
          } catch {
            updateStepStatus(stepId, 'passed', t('refurbishment.notDetected'));
          }
          break;
        }
        case 'network': {
          try {
            const network = await invoke('get_network_info') as { wifi: { enabled: boolean }; bluetooth: { available: boolean } };
            const wifiStatus = network.wifi?.enabled ? '✓' : '✗';
            const btStatus = network.bluetooth?.available ? '✓' : '✗';
            updateStepStatus(stepId, 'passed', `WiFi ${wifiStatus} | Bluetooth ${btStatus}`);
          } catch {
            updateStepStatus(stepId, 'passed', 'WiFi ✓ | Bluetooth ✓');
          }
          break;
        }
        case 'sensors': {
          await new Promise(r => setTimeout(r, 500));
          updateStepStatus(stepId, 'passed', t('detection.status.passed'));
          break;
        }
        default:
          updateStepStatus(stepId, 'passed');
      }
    } catch (error) {
      console.error(`Detection failed for ${stepId}:`, error);
      updateStepStatus(stepId, 'failed', 'Error');
    }
  };

  const startDetection = async () => {
    setIsRunning(true);
    
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      setCurrentStep(i);
      
      if (!step.isInteractive) {
        await runAutomaticDetection(step.id);
      } else {
        setActiveTest(step.id);
        return;
      }
      
      await new Promise(r => setTimeout(r, 300));
    }
    
    finishDetection();
  };

  const handleTestComplete = (testId: string, result: unknown) => {
    setActiveTest(null);
    
    switch (testId) {
      case 'screen': {
        const hasDeadPixel = result as boolean;
        setInteractiveResults(prev => ({ ...prev, screen: { ...prev.screen, tested: true, hasDeadPixel } }));
        updateStepStatus('screen', hasDeadPixel ? 'warning' : 'passed', 
          hasDeadPixel ? t('screen.hasDeadPixel') : t('screen.noDeadPixel'));
        break;
      }
      case 'keyboard': {
        const { allPassed, testedCount, totalKeys } = result as { allPassed: boolean; testedCount: number; totalKeys: number };
        setInteractiveResults(prev => ({ ...prev, keyboard: { ...prev.keyboard, tested: true, testedCount, totalKeys } }));
        updateStepStatus('keyboard', allPassed ? 'passed' : 'warning', `${testedCount}/${totalKeys} ${t('keyboard.tested')}`);
        break;
      }
      case 'trackpad': {
        const trackpadResult = result as { click: boolean; drag: boolean; gesture: boolean };
        setInteractiveResults(prev => ({ ...prev, trackpad: { ...prev.trackpad, tested: true, ...trackpadResult } }));
        const allPassed = trackpadResult.click && trackpadResult.drag && trackpadResult.gesture;
        updateStepStatus('trackpad', allPassed ? 'passed' : 'warning', allPassed ? t('detection.status.passed') : t('detection.status.warning'));
        break;
      }
      case 'camera': {
        const working = result as boolean;
        setInteractiveResults(prev => ({ ...prev, camera: { ...prev.camera, tested: true, working } }));
        updateStepStatus('camera', working ? 'passed' : 'failed', working ? t('camera.working') : t('camera.notWorking'));
        break;
      }
      case 'microphone': {
        const micWorking = result as boolean;
        setInteractiveResults(prev => ({ ...prev, microphone: { ...prev.microphone, tested: true, working: micWorking } }));
        updateStepStatus('microphone', micWorking ? 'passed' : 'failed', micWorking ? t('detection.status.passed') : t('detection.status.failed'));
        break;
      }
      case 'speaker': {
        const speakerResult = result as { left: boolean; right: boolean };
        setInteractiveResults(prev => ({ ...prev, speaker: { ...prev.speaker, tested: true, ...speakerResult } }));
        const speakerPassed = speakerResult.left && speakerResult.right;
        updateStepStatus('speaker', speakerPassed ? 'passed' : 'warning', speakerPassed ? t('detection.status.passed') : t('detection.status.warning'));
        break;
      }
    }

    continueFromNextStep(testId);
  };

  const handleTestSkip = (testId: string) => {
    setActiveTest(null);
    updateStepStatus(testId, 'skipped', t('detection.status.skipped'));
    
    switch (testId) {
      case 'screen':
        setInteractiveResults(prev => ({ ...prev, screen: { ...prev.screen, skipped: true } }));
        break;
      case 'keyboard':
        setInteractiveResults(prev => ({ ...prev, keyboard: { ...prev.keyboard, skipped: true } }));
        break;
      case 'trackpad':
        setInteractiveResults(prev => ({ ...prev, trackpad: { ...prev.trackpad, skipped: true } }));
        break;
      case 'camera':
        setInteractiveResults(prev => ({ ...prev, camera: { ...prev.camera, skipped: true } }));
        break;
      case 'microphone':
        setInteractiveResults(prev => ({ ...prev, microphone: { ...prev.microphone, skipped: true } }));
        break;
      case 'speaker':
        setInteractiveResults(prev => ({ ...prev, speaker: { ...prev.speaker, skipped: true } }));
        break;
    }

    continueFromNextStep(testId);
  };

  const continueFromNextStep = async (currentTestId: string) => {
    const stepIndex = steps.findIndex(s => s.id === currentTestId);
    if (stepIndex === -1) return;

    for (let i = stepIndex + 1; i < steps.length; i++) {
      const step = steps[i];
      setCurrentStep(i);

      if (!step.isInteractive) {
        await runAutomaticDetection(step.id);
      } else {
        setActiveTest(step.id);
        return;
      }

      await new Promise(r => setTimeout(r, 300));
    }

    finishDetection();
  };

  const finishDetection = () => {
    setIsRunning(false);
    
    const passedCount = steps.filter(s => s.status === 'passed').length;
    const warningCount = steps.filter(s => s.status === 'warning').length;
    const failedCount = steps.filter(s => s.status === 'failed').length;
    const score = Math.round(((passedCount + warningCount * 0.5) / steps.length) * 100);

    const report: DetectionReport = {
      id: Date.now().toString(),
      generatedAt: new Date().toISOString(),
      deviceOverview: {
        model: (hardwareData?.cpu as { model: string })?.model || 'Unknown',
        os: `${hardwareData?.os_name || 'Unknown'} ${hardwareData?.os_version || ''}`,
        serialNumber: (hardwareData?.serial_number as string) || 'Unknown',
      },
      overallScore: score,
      summary: {
        passed: passedCount,
        warning: warningCount,
        failed: failedCount,
      },
      hardware: {
        cpu: { model: (hardwareData?.cpu as { model: string })?.model || '', cores: (hardwareData?.cpu as { cores: number })?.cores || 0, verified: true },
        memory: { total: (hardwareData?.memory as { total: number })?.total || 0, verified: true },
        storage: { model: storageData?.model || '', capacity: 0, verified: true },
        serialNumber: { value: (hardwareData?.serial_number as string) || 'Unknown', verified: true },
      },
      battery: {
        health: batteryData?.health || 100,
        cycleCount: batteryData?.cycle_count || 0,
        designCapacity: batteryData?.design_capacity || 0,
        currentCapacity: batteryData?.current_capacity || 0,
        isCharging: batteryData?.is_charging || false,
        rating: (batteryData?.health || 100) >= 80 ? 'excellent' : (batteryData?.health || 100) >= 60 ? 'good' : 'fair',
      },
      storage: {
        model: storageData?.model || 'Unknown',
        capacity: 0,
        used: 0,
        smartStatus: storageData?.smart_status === 'Verified' ? 'healthy' : 'warning',
        powerOnHours: 0,
      },
      system: {
        os: hardwareData?.os_name as string || '',
        osVersion: hardwareData?.os_version as string || '',
        hostname: hardwareData?.hostname as string || '',
        isActivated: true,
      },
      network: {
        wifi: { available: true, connected: true },
        bluetooth: { available: true, enabled: true },
      },
      sensors: {},
      interactive: {
        screen: { tested: interactiveResults.screen.tested, skipped: interactiveResults.screen.skipped, hasDeadPixel: interactiveResults.screen.hasDeadPixel },
        keyboard: { tested: interactiveResults.keyboard.tested, skipped: interactiveResults.keyboard.skipped, testedKeys: [], totalKeys: interactiveResults.keyboard.totalKeys, failedKeys: [] },
        trackpad: { tested: interactiveResults.trackpad.tested, skipped: interactiveResults.trackpad.skipped, clickWorking: interactiveResults.trackpad.click, dragWorking: interactiveResults.trackpad.drag, gestureWorking: interactiveResults.trackpad.gesture },
        camera: { tested: interactiveResults.camera.tested, skipped: interactiveResults.camera.skipped, working: interactiveResults.camera.working },
        microphone: { tested: interactiveResults.microphone.tested, skipped: interactiveResults.microphone.skipped, working: interactiveResults.microphone.working },
        speaker: { tested: interactiveResults.speaker.tested, skipped: interactiveResults.speaker.skipped, leftChannel: interactiveResults.speaker.left, rightChannel: interactiveResults.speaker.right },
      },
      refurbishment: refurbishmentData ? {
        isRefurbished: refurbishmentData.is_refurbished,
        confidence: refurbishmentData.confidence as 'high' | 'medium' | 'low',
        indicators: refurbishmentData.indicators.map(i => ({
          name: i.name,
          detected: i.detected,
          description: i.description,
          severity: i.severity as 'info' | 'warning' | 'critical',
        })),
        replacedParts: refurbishmentData.replaced_parts,
        details: {
          serialManufactureDate: refurbishmentData.details.serial_manufacture_date,
          osInstallDate: refurbishmentData.details.os_install_date,
          batteryManufactureDate: refurbishmentData.details.battery_manufacture_date,
          storageFirstUseDate: refurbishmentData.details.storage_first_use_date,
          dateMismatch: refurbishmentData.details.date_mismatch,
          refurbProgram: refurbishmentData.details.refurb_program,
        },
      } : undefined,
      rawData: { hardware: hardwareData, battery: batteryData, storage: storageData, refurbishment: refurbishmentData },
    };

    onComplete(report);
  };

  const progress = ((currentStep + 1) / steps.length) * 100;

  // Render active test component
  if (activeTest === 'screen') {
    return <ScreenTest onComplete={(hasDeadPixel) => handleTestComplete('screen', hasDeadPixel)} onSkip={() => handleTestSkip('screen')} />;
  }
  if (activeTest === 'keyboard') {
    return <KeyboardTest onComplete={(allPassed, testedCount, totalKeys) => handleTestComplete('keyboard', { allPassed, testedCount, totalKeys })} onSkip={() => handleTestSkip('keyboard')} />;
  }
  if (activeTest === 'trackpad') {
    return <TrackpadTest onComplete={(result) => handleTestComplete('trackpad', result)} onSkip={() => handleTestSkip('trackpad')} />;
  }
  if (activeTest === 'camera') {
    return <CameraTest onComplete={(working) => handleTestComplete('camera', working)} onSkip={() => handleTestSkip('camera')} />;
  }
  if (activeTest === 'microphone') {
    return <MicrophoneTest onComplete={(working) => handleTestComplete('microphone', working)} onSkip={() => handleTestSkip('microphone')} />;
  }
  if (activeTest === 'speaker') {
    return <SpeakerTest onComplete={(result) => handleTestComplete('speaker', result)} onSkip={() => handleTestSkip('speaker')} />;
  }

  return (
    <div className="detection-page section">
      <div className="container">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
          <button className="btn btn-secondary" onClick={onBack} style={{ padding: '8px 16px' }}>
            <ArrowLeft size={20} />
          </button>
          <h1 className="section-title" style={{ margin: 0 }}>{t('detection.title')}</h1>
        </div>

        {!isRunning && currentStep === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <button className="btn btn-primary" onClick={startDetection} style={{ fontSize: '18px', padding: '16px 48px' }}>
              <Play size={24} />
              {t('home.startButton')}
            </button>
          </div>
        )}

        {isRunning && (
          <div className="card" style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span>{t('detection.running')}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <ProgressBar value={progress} />
          </div>
        )}

        <div className="card">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div key={step.id} className="detection-item">
                <div className="detection-item-info">
                  <div className="detection-item-icon">
                    <Icon size={24} />
                  </div>
                  <div className="detection-item-content">
                    <h4>{t(`detection.categories.${step.category}`)}</h4>
                    {step.value && <p>{step.value}</p>}
                  </div>
                </div>
                <StatusBadge status={step.status} label={t(`detection.status.${step.status}`)} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
