import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { 
  Download, ArrowLeft, CheckCircle, AlertCircle, XCircle,
  Cpu, Battery, HardDrive, Monitor, Keyboard, Wifi, Mouse, Camera, Mic, Volume2,
  Info, RefreshCcw
} from 'lucide-react';
import { ScoreCircle } from '../common';
import type { DetectionReport } from '../../types';

interface ReportPageProps {
  report: DetectionReport;
  onBack: () => void;
}

interface IssueItem {
  category: string;
  icon: typeof Cpu;
  level: 'warning' | 'failed';
  title: string;
  description: string;
  suggestion: string;
  data?: string;
}

export function ReportPage({ report, onBack }: ReportPageProps) {
  const { t, i18n } = useTranslation();
  const reportRef = useRef<HTMLDivElement>(null);
  const [showDownloadSuccess, setShowDownloadSuccess] = useState(false);
  const isZh = i18n.language === 'zh';

  // Translate indicator description from key
  const translateIndicatorDesc = (desc: string): string => {
    // Check if it contains a colon (e.g., "third_party_storage:SAMSUNG SSD")
    if (desc.includes(':')) {
      const [key, value] = desc.split(':');
      const translatedKey = t(`refurbishment.indicatorDesc.${key}`, { defaultValue: '' });
      if (translatedKey) {
        return `${translatedKey}: ${value}`;
      }
    }
    // Try direct translation
    const translated = t(`refurbishment.indicatorDesc.${desc}`, { defaultValue: '' });
    return translated || desc;
  };

  // Translate part name
  const translatePartName = (part: string): string => {
    const translated = t(`refurbishment.parts.${part}`, { defaultValue: '' });
    return translated || part;
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return t('battery.rating.excellent');
    if (score >= 70) return t('battery.rating.good');
    if (score >= 50) return t('battery.rating.fair');
    return t('battery.rating.poor');
  };

  // Collect all issues (warnings and failures)
  const collectIssues = (): IssueItem[] => {
    const issues: IssueItem[] = [];

    // Battery issues
    if (report.battery.health < 80) {
      issues.push({
        category: 'battery',
        icon: Battery,
        level: report.battery.health < 60 ? 'failed' : 'warning',
        title: isZh ? '电池健康度偏低' : 'Low Battery Health',
        description: isZh 
          ? `当前电池健康度为 ${Math.round(report.battery.health)}%，低于 80% 的良好标准。`
          : `Current battery health is ${Math.round(report.battery.health)}%, below the 80% good standard.`,
        suggestion: isZh 
          ? '建议：电池续航可能不如新机，考虑更换电池或在价格上适当议价。'
          : 'Suggestion: Battery life may be shorter than new. Consider battery replacement or price negotiation.',
        data: `${Math.round(report.battery.health)}%`,
      });
    }

    if (report.battery.cycleCount > 500) {
      issues.push({
        category: 'battery',
        icon: Battery,
        level: report.battery.cycleCount > 800 ? 'failed' : 'warning',
        title: isZh ? '电池循环次数较高' : 'High Battery Cycle Count',
        description: isZh
          ? `当前循环次数为 ${report.battery.cycleCount} 次。macOS 设计寿命为 1000 次，Windows 通常 300-500 次。`
          : `Current cycle count is ${report.battery.cycleCount}. macOS designed for 1000 cycles, Windows typically 300-500.`,
        suggestion: isZh
          ? '建议：电池已使用较久，可能影响续航表现，建议测试实际使用时长。'
          : 'Suggestion: Battery has been heavily used. Test actual usage time before purchase.',
        data: `${report.battery.cycleCount} cycles`,
      });
    }

    // Storage issues
    if (report.storage.smartStatus !== 'healthy') {
      issues.push({
        category: 'storage',
        icon: HardDrive,
        level: 'failed',
        title: isZh ? '硬盘健康状态异常' : 'Storage Health Issue',
        description: isZh
          ? `硬盘 SMART 状态为 "${report.storage.smartStatus}"，可能存在潜在故障风险。`
          : `Storage SMART status is "${report.storage.smartStatus}", indicating potential failure risk.`,
        suggestion: isZh
          ? '⚠️ 重要：硬盘可能即将损坏，强烈建议不要购买或要求更换硬盘。'
          : '⚠️ Important: Storage may fail soon. Strongly recommend not purchasing or requesting replacement.',
        data: report.storage.smartStatus,
      });
    }

    // Screen issues
    if (report.interactive.screen.hasDeadPixel) {
      issues.push({
        category: 'screen',
        icon: Monitor,
        level: 'warning',
        title: isZh ? '屏幕存在坏点' : 'Dead Pixels Detected',
        description: isZh
          ? '在屏幕坏点检测中发现亮点或暗点。'
          : 'Bright or dark spots were found during the dead pixel test.',
        suggestion: isZh
          ? '建议：坏点无法修复，只能更换屏幕。考虑是否影响日常使用，并据此议价。'
          : 'Suggestion: Dead pixels cannot be fixed, only screen replacement. Consider impact on daily use and negotiate accordingly.',
      });
    }

    // Keyboard issues
    const keyboardTestedRatio = report.interactive.keyboard.totalKeys > 0 
      ? (report.interactive.keyboard.testedKeys?.length || 0) / report.interactive.keyboard.totalKeys 
      : 1;
    if (keyboardTestedRatio < 1 && report.interactive.keyboard.tested) {
      issues.push({
        category: 'keyboard',
        icon: Keyboard,
        level: 'warning',
        title: isZh ? '键盘未完全测试' : 'Keyboard Not Fully Tested',
        description: isZh
          ? `仅测试了部分按键，可能存在未检测到的问题按键。`
          : `Only some keys were tested. There may be untested problematic keys.`,
        suggestion: isZh
          ? '建议：重新进行完整的键盘测试，确保所有按键正常工作。'
          : 'Suggestion: Perform a complete keyboard test to ensure all keys work properly.',
      });
    }

    // Trackpad issues
    if (report.interactive.trackpad.tested) {
      const trackpadIssues = [];
      if (!report.interactive.trackpad.clickWorking) trackpadIssues.push(isZh ? '点击' : 'click');
      if (!report.interactive.trackpad.dragWorking) trackpadIssues.push(isZh ? '拖拽' : 'drag');
      if (!report.interactive.trackpad.gestureWorking) trackpadIssues.push(isZh ? '手势' : 'gesture');
      
      if (trackpadIssues.length > 0) {
        issues.push({
          category: 'trackpad',
          icon: Mouse,
          level: 'warning',
          title: isZh ? '触控板功能异常' : 'Trackpad Issues',
          description: isZh
            ? `以下功能测试未通过：${trackpadIssues.join('、')}`
            : `The following functions failed: ${trackpadIssues.join(', ')}`,
          suggestion: isZh
            ? '建议：触控板问题可能需要维修，建议议价或要求卖家修复。'
            : 'Suggestion: Trackpad issues may need repair. Negotiate price or request seller to fix.',
        });
      }
    }

    // Camera issues
    if (report.interactive.camera.tested && !report.interactive.camera.working) {
      issues.push({
        category: 'camera',
        icon: Camera,
        level: 'failed',
        title: isZh ? '摄像头无法工作' : 'Camera Not Working',
        description: isZh
          ? '摄像头检测失败，无法正常获取画面。'
          : 'Camera test failed. Unable to capture video.',
        suggestion: isZh
          ? '建议：摄像头损坏需要维修，如果需要视频通话功能，建议议价或放弃购买。'
          : 'Suggestion: Camera needs repair. If video calls are needed, negotiate or reconsider purchase.',
      });
    }

    // Microphone issues
    if (report.interactive.microphone.tested && !report.interactive.microphone.working) {
      issues.push({
        category: 'microphone',
        icon: Mic,
        level: 'failed',
        title: isZh ? '麦克风无法工作' : 'Microphone Not Working',
        description: isZh
          ? '麦克风检测失败，无法正常录音。'
          : 'Microphone test failed. Unable to record audio.',
        suggestion: isZh
          ? '建议：麦克风损坏会影响语音通话和录音，建议维修后再购买。'
          : 'Suggestion: Microphone damage affects calls and recording. Recommend repair before purchase.',
      });
    }

    // Speaker issues
    if (report.interactive.speaker.tested) {
      const speakerIssues = [];
      if (!report.interactive.speaker.leftChannel) speakerIssues.push(isZh ? '左声道' : 'left channel');
      if (!report.interactive.speaker.rightChannel) speakerIssues.push(isZh ? '右声道' : 'right channel');
      
      if (speakerIssues.length > 0) {
        issues.push({
          category: 'speaker',
          icon: Volume2,
          level: 'warning',
          title: isZh ? '扬声器异常' : 'Speaker Issues',
          description: isZh
            ? `以下声道测试未通过：${speakerIssues.join('、')}`
            : `The following channels failed: ${speakerIssues.join(', ')}`,
          suggestion: isZh
            ? '建议：扬声器问题可能需要更换，会影响音频播放体验。'
            : 'Suggestion: Speaker issues may require replacement, affecting audio playback.',
        });
      }
    }

    // Refurbishment issues
    if (report.refurbishment?.isRefurbished) {
      const refurb = report.refurbishment;
      
      // Add replaced parts as issues
      for (const part of refurb.replacedParts) {
        const translatedPart = translatePartName(part);
        issues.push({
          category: 'refurbishment',
          icon: RefreshCcw,
          level: 'warning',
          title: isZh ? `检测到更换部件: ${translatedPart}` : `Replaced Part Detected: ${translatedPart}`,
          description: isZh
            ? `该设备的 ${translatedPart} 可能已被更换为非原装部件。`
            : `The ${translatedPart} of this device may have been replaced with non-original parts.`,
          suggestion: isZh
            ? '建议：非原装部件可能影响设备性能和兼容性，请确认部件质量并考虑议价。'
            : 'Suggestion: Non-original parts may affect performance and compatibility. Verify quality and consider negotiating.',
        });
      }
      
      // Add refurbishment program info
      if (refurb.details.refurbProgram) {
        issues.push({
          category: 'refurbishment',
          icon: RefreshCcw,
          level: 'warning',
          title: isZh ? '官方翻新机' : 'Certified Refurbished',
          description: isZh
            ? `该设备为 ${refurb.details.refurbProgram}。`
            : `This device is ${refurb.details.refurbProgram}.`,
          suggestion: isZh
            ? '建议：官方翻新机通常有质量保证，但价格应低于全新设备。'
            : 'Suggestion: Certified refurbished devices usually have quality guarantees, but should be priced lower than new.',
          data: refurb.details.refurbProgram,
        });
      }
      
      // Add warning indicators
      for (const indicator of refurb.indicators.filter(i => i.severity === 'warning' || i.severity === 'critical')) {
        const translatedDesc = translateIndicatorDesc(indicator.description);
        issues.push({
          category: 'refurbishment',
          icon: RefreshCcw,
          level: indicator.severity === 'critical' ? 'failed' : 'warning',
          title: translatedDesc.split(':')[0] || indicator.name,
          description: translatedDesc,
          suggestion: isZh
            ? '建议：请仔细检查相关部件，考虑是否影响购买决定。'
            : 'Suggestion: Please carefully check the related parts and consider if it affects your purchase decision.',
        });
      }
    }

    return issues;
  };

  const issues = collectIssues();
  const warnings = issues.filter(i => i.level === 'warning');
  const failures = issues.filter(i => i.level === 'failed');

  const downloadPDF = async () => {
    if (!reportRef.current) return;

    const canvas = await html2canvas(reportRef.current, {
      scale: 2,
      useCORS: true,
      logging: false,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    // Handle multi-page if content is too long
    if (pdfHeight > pdf.internal.pageSize.getHeight()) {
      let position = 0;
      const pageHeight = pdf.internal.pageSize.getHeight();
      while (position < pdfHeight) {
        if (position > 0) pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, -position, pdfWidth, pdfHeight);
        position += pageHeight;
      }
    } else {
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    }
    
    pdf.save(`QuickScan_Report_${report.id}.pdf`);
    
    // Show download success notification
    setShowDownloadSuccess(true);
    setTimeout(() => setShowDownloadSuccess(false), 3000);
  };

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleString();
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getBatteryStatus = () => {
    if (report.battery.health >= 80) return 'passed';
    if (report.battery.health >= 60) return 'warning';
    return 'failed';
  };

  const getStorageStatus = () => {
    return report.storage.smartStatus === 'healthy' ? 'passed' : 'warning';
  };

  return (
    <div className="report-page section">
      {/* Download Success Notification */}
      {showDownloadSuccess && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'var(--color-success)',
          color: 'white',
          padding: '12px 24px',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          zIndex: 1000,
          animation: 'fadeIn 0.3s ease-out',
        }}>
          <CheckCircle size={20} />
          {t('report.downloadComplete')}
        </div>
      )}
      <div className="container">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button className="btn btn-secondary" onClick={onBack} style={{ padding: '8px 16px' }}>
              <ArrowLeft size={20} />
            </button>
            <h1 className="section-title" style={{ margin: 0 }}>{t('report.title')}</h1>
          </div>
          <button className="btn btn-primary" onClick={downloadPDF}>
            <Download size={20} />
            {t('report.downloadPdf')}
          </button>
        </div>

        <div ref={reportRef} style={{ backgroundColor: 'var(--color-surface)', padding: '32px', borderRadius: '12px' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '24px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Cpu size={32} color="var(--color-primary)" />
              <div>
                <h2 style={{ margin: 0 }}>{t('app.name')} {t('report.title')}</h2>
                <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: '14px' }}>
                  {t('report.generated')}: {formatDate(report.generatedAt)}
                </p>
              </div>
            </div>
          </div>

          {/* Device Overview & Score */}
          <div className="grid grid-2" style={{ marginBottom: '32px' }}>
            <div className="card" style={{ boxShadow: 'none', border: '1px solid var(--color-border)' }}>
              <h3 style={{ marginBottom: '16px' }}>{t('report.deviceOverview')}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>{t('hardware.cpu')}</span>
                  <span>{report.deviceOverview.model}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>OS</span>
                  <span>{report.deviceOverview.os}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>{t('hardware.serialNumber')}</span>
                  <span>{report.deviceOverview.serialNumber} ✓</span>
                </div>
              </div>
            </div>

            <div className="card" style={{ boxShadow: 'none', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '24px' }}>
              <ScoreCircle score={report.overallScore} label={getScoreLabel(report.overallScore)} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle size={18} color="var(--color-success)" />
                  <span>{t('report.passed')}: {report.summary.passed}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertCircle size={18} color="var(--color-warning)" />
                  <span>{t('report.warning')}: {report.summary.warning}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <XCircle size={18} color="var(--color-danger)" />
                  <span>{t('report.failed')}: {report.summary.failed}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Issues Section - Only show if there are issues */}
          {issues.length > 0 && (
            <>
              <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={20} color="var(--color-warning)" />
                {isZh ? '需要注意的问题' : 'Issues to Note'}
                <span style={{ fontSize: '14px', fontWeight: 'normal', color: 'var(--color-text-secondary)' }}>
                  ({failures.length > 0 ? `${failures.length} ${isZh ? '项异常' : ' critical'}` : ''}{failures.length > 0 && warnings.length > 0 ? ', ' : ''}{warnings.length > 0 ? `${warnings.length} ${isZh ? '项注意' : ' warnings'}` : ''})
                </span>
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
                {issues.map((issue, index) => {
                  const Icon = issue.icon;
                  const isFailure = issue.level === 'failed';
                  return (
                    <div 
                      key={index}
                      style={{ 
                        border: `1px solid ${isFailure ? 'var(--color-danger)' : 'var(--color-warning)'}`,
                        borderLeft: `4px solid ${isFailure ? 'var(--color-danger)' : 'var(--color-warning)'}`,
                        borderRadius: '8px',
                        padding: '16px',
                        backgroundColor: isFailure ? '#FEF2F2' : '#FFFBEB',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                        <div style={{ 
                          padding: '8px', 
                          borderRadius: '8px', 
                          backgroundColor: isFailure ? '#FEE2E2' : '#FEF3C7',
                        }}>
                          <Icon size={24} color={isFailure ? 'var(--color-danger)' : 'var(--color-warning)'} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <h4 style={{ margin: 0, color: isFailure ? 'var(--color-danger)' : '#92400E' }}>
                              {issue.title}
                            </h4>
                            <span className={`status-badge ${isFailure ? 'status-failed' : 'status-warning'}`}>
                              {isFailure ? (isZh ? '异常' : 'Critical') : (isZh ? '注意' : 'Warning')}
                            </span>
                            {issue.data && (
                              <span style={{ 
                                marginLeft: 'auto', 
                                fontWeight: 'bold',
                                color: isFailure ? 'var(--color-danger)' : 'var(--color-warning)',
                              }}>
                                {issue.data}
                              </span>
                            )}
                          </div>
                          <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: 'var(--color-text)' }}>
                            {issue.description}
                          </p>
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'flex-start', 
                            gap: '6px',
                            padding: '8px 12px',
                            backgroundColor: 'rgba(255,255,255,0.6)',
                            borderRadius: '6px',
                            fontSize: '13px',
                          }}>
                            <Info size={16} style={{ flexShrink: 0, marginTop: '2px' }} color="var(--color-primary)" />
                            <span>{issue.suggestion}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Detailed Results */}
          <h3 style={{ marginBottom: '16px' }}>{t('report.details')}</h3>
          
          <div className="grid grid-2" style={{ marginBottom: '32px' }}>
            {/* Hardware */}
            <div className="card" style={{ boxShadow: 'none', border: '1px solid var(--color-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <Cpu size={20} />
                <h4 style={{ margin: 0 }}>{t('detection.categories.hardware')}</h4>
                <span className="status-badge status-passed" style={{ marginLeft: 'auto' }}>✓ {t('detection.status.passed')}</span>
              </div>
              <div style={{ fontSize: '14px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <p>{t('hardware.cpu')}: {report.hardware.cpu.model} ({report.hardware.cpu.cores} cores)</p>
                <p>{t('hardware.memory')}: {formatBytes(report.hardware.memory.total)}</p>
              </div>
            </div>

            {/* Battery */}
            <div className="card" style={{ boxShadow: 'none', border: '1px solid var(--color-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <Battery size={20} />
                <h4 style={{ margin: 0 }}>{t('detection.categories.battery')}</h4>
                <span className={`status-badge status-${getBatteryStatus()}`} style={{ marginLeft: 'auto' }}>
                  {getBatteryStatus() === 'passed' ? '✓' : getBatteryStatus() === 'warning' ? '⚠' : '✗'} {t(`detection.status.${getBatteryStatus()}`)}
                </span>
              </div>
              <div style={{ fontSize: '14px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <p>{t('battery.health')}: {Math.round(report.battery.health)}%</p>
                <p>{t('battery.cycleCount')}: {report.battery.cycleCount}</p>
                <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>{t('battery.reference.cycle')}</p>
              </div>
            </div>

            {/* Storage */}
            <div className="card" style={{ boxShadow: 'none', border: '1px solid var(--color-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <HardDrive size={20} />
                <h4 style={{ margin: 0 }}>{t('detection.categories.storage')}</h4>
                <span className={`status-badge status-${getStorageStatus()}`} style={{ marginLeft: 'auto' }}>
                  {getStorageStatus() === 'passed' ? '✓' : '⚠'} {t(`detection.status.${getStorageStatus()}`)}
                </span>
              </div>
              <div style={{ fontSize: '14px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <p>{t('storage.smart')}: {report.storage.smartStatus}</p>
                {report.storage.powerOnHours > 0 && <p>{t('storage.powerOnHours')}: {report.storage.powerOnHours} h</p>}
              </div>
            </div>

            {/* Network */}
            <div className="card" style={{ boxShadow: 'none', border: '1px solid var(--color-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <Wifi size={20} />
                <h4 style={{ margin: 0 }}>{t('detection.categories.network')}</h4>
                <span className="status-badge status-passed" style={{ marginLeft: 'auto' }}>✓ {t('detection.status.passed')}</span>
              </div>
              <div style={{ fontSize: '14px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <p>WiFi: {report.network.wifi.available ? '✓' : '✗'}</p>
                <p>Bluetooth: {report.network.bluetooth.available ? '✓' : '✗'}</p>
              </div>
            </div>
          </div>

          {/* Refurbishment Check Results */}
          {report.refurbishment && (
            <>
              <h3 style={{ marginBottom: '16px' }}>{t('refurbishment.title')}</h3>
              <div className="card" style={{ boxShadow: 'none', border: '1px solid var(--color-border)', marginBottom: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <RefreshCcw size={20} />
                  <h4 style={{ margin: 0 }}>{t('detection.categories.refurbishment')}</h4>
                  <span className={`status-badge status-${report.refurbishment.isRefurbished ? 'warning' : 'passed'}`} style={{ marginLeft: 'auto' }}>
                    {report.refurbishment.isRefurbished ? '⚠' : '✓'} {report.refurbishment.isRefurbished ? t('refurbishment.detected') : t('refurbishment.notDetected')}
                  </span>
                </div>
                
                <div style={{ fontSize: '14px' }}>
                  {/* Confidence - only show if refurbished */}
                  {report.refurbishment.isRefurbished && (
                    <div style={{ marginBottom: '12px', padding: '8px 12px', backgroundColor: '#FFFBEB', borderRadius: '6px' }}>
                      <span style={{ color: '#92400E' }}>{t('refurbishment.confidence.' + report.refurbishment.confidence)}</span>
                    </div>
                  )}
                  
                  {/* Refurbishment Program */}
                  {report.refurbishment.details.refurbProgram && (
                    <div style={{ marginBottom: '12px' }}>
                      <strong>{t('refurbishment.refurbProgram')}:</strong> {report.refurbishment.details.refurbProgram}
                    </div>
                  )}
                  
                  {/* Replaced Parts */}
                  {report.refurbishment.replacedParts.length > 0 && (
                    <div style={{ marginBottom: '12px' }}>
                      <strong>{t('refurbishment.replacedParts')}:</strong>
                      <ul style={{ margin: '8px 0 0 20px', padding: 0 }}>
                        {report.refurbishment.replacedParts.map((part, idx) => (
                          <li key={idx} style={{ color: 'var(--color-warning)' }}>{translatePartName(part)}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {/* Indicators - show all, not just when refurbished */}
                  {report.refurbishment.indicators.length > 0 && (
                    <div style={{ marginBottom: '12px' }}>
                      <strong>{t('refurbishment.indicators')}:</strong>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                        {report.refurbishment.indicators.map((indicator, idx) => (
                          <div key={idx} style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '8px',
                            padding: '8px',
                            backgroundColor: indicator.severity === 'warning' ? '#FFFBEB' : indicator.severity === 'critical' ? '#FEF2F2' : '#F3F4F6',
                            borderRadius: '6px',
                            borderLeft: `3px solid ${indicator.severity === 'warning' ? 'var(--color-warning)' : indicator.severity === 'critical' ? 'var(--color-danger)' : 'var(--color-primary)'}`,
                          }}>
                            {indicator.severity === 'critical' ? <XCircle size={16} color="var(--color-danger)" /> : 
                             indicator.severity === 'warning' ? <AlertCircle size={16} color="var(--color-warning)" /> :
                             <Info size={16} color="var(--color-primary)" />}
                            <span>{translateIndicatorDesc(indicator.description)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Detection Details - always show */}
                  <div style={{ marginTop: '12px', padding: '12px', backgroundColor: 'var(--color-background)', borderRadius: '6px', fontSize: '13px' }}>
                    <p style={{ margin: '0 0 8px', fontWeight: 'bold', color: 'var(--color-text-secondary)' }}>
                      {isZh ? '检测详情' : 'Detection Details'}
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div>
                        <span style={{ color: 'var(--color-text-secondary)' }}>{isZh ? '序列号检测' : 'Serial Number'}:</span>
                        <span style={{ marginLeft: '8px', color: report.refurbishment.details.refurbProgram ? 'var(--color-warning)' : 'var(--color-success)' }}>
                          {report.refurbishment.details.refurbProgram ? '⚠ ' + (isZh ? '官方翻新' : 'Refurbished') : '✓ ' + (isZh ? '正常' : 'Normal')}
                        </span>
                      </div>
                      <div>
                        <span style={{ color: 'var(--color-text-secondary)' }}>{isZh ? '存储设备' : 'Storage'}:</span>
                        <span style={{ marginLeft: '8px', color: report.refurbishment.replacedParts.includes('storage') ? 'var(--color-warning)' : 'var(--color-success)' }}>
                          {report.refurbishment.replacedParts.includes('storage') ? '⚠ ' + (isZh ? '非原装' : 'Third-party') : '✓ ' + (isZh ? '原装' : 'Original')}
                        </span>
                      </div>
                      <div>
                        <span style={{ color: 'var(--color-text-secondary)' }}>{isZh ? '显示屏' : 'Display'}:</span>
                        <span style={{ marginLeft: '8px', color: report.refurbishment.replacedParts.includes('display') ? 'var(--color-warning)' : 'var(--color-success)' }}>
                          {report.refurbishment.replacedParts.includes('display') ? '⚠ ' + (isZh ? '非原装' : 'Third-party') : '✓ ' + (isZh ? '原装' : 'Original')}
                        </span>
                      </div>
                      <div>
                        <span style={{ color: 'var(--color-text-secondary)' }}>{isZh ? '企业管理' : 'Enterprise'}:</span>
                        <span style={{ marginLeft: '8px', color: report.refurbishment.indicators.some(i => i.name === 'enterprise_managed') ? 'var(--color-warning)' : 'var(--color-success)' }}>
                          {report.refurbishment.indicators.some(i => i.name === 'enterprise_managed') ? '⚠ ' + (isZh ? '是' : 'Yes') : '✓ ' + (isZh ? '否' : 'No')}
                        </span>
                      </div>
                    </div>
                    
                    {/* Date Info */}
                    {(report.refurbishment.details.osInstallDate || report.refurbishment.details.batteryManufactureDate) && (
                      <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--color-border)' }}>
                        {report.refurbishment.details.osInstallDate && (
                          <p style={{ margin: '4px 0' }}>
                            <span style={{ color: 'var(--color-text-secondary)' }}>{t('refurbishment.details.osInstallDate')}:</span>
                            <span style={{ marginLeft: '8px' }}>{report.refurbishment.details.osInstallDate}</span>
                          </p>
                        )}
                        {report.refurbishment.details.batteryManufactureDate && (
                          <p style={{ margin: '4px 0' }}>
                            <span style={{ color: 'var(--color-text-secondary)' }}>{t('refurbishment.details.batteryDate')}:</span>
                            <span style={{ marginLeft: '8px' }}>{report.refurbishment.details.batteryManufactureDate}</span>
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* No issues message */}
                  {!report.refurbishment.isRefurbished && (
                    <p style={{ fontSize: '14px', color: 'var(--color-success)', marginTop: '12px' }}>
                      ✓ {t('refurbishment.noIssues')}
                    </p>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Interactive Test Results */}
          <h3 style={{ marginBottom: '16px' }}>{isZh ? '交互测试结果' : 'Interactive Test Results'}</h3>
          <div className="grid grid-3" style={{ marginBottom: '32px' }}>
            <div style={{ padding: '12px', border: '1px solid var(--color-border)', borderRadius: '8px', textAlign: 'center' }}>
              <Monitor size={24} style={{ marginBottom: '8px' }} />
              <p style={{ margin: 0, fontWeight: 500 }}>{t('detection.categories.screen')}</p>
              <p style={{ margin: '4px 0 0', fontSize: '14px', color: report.interactive.screen.hasDeadPixel ? 'var(--color-warning)' : 'var(--color-success)' }}>
                {report.interactive.screen.hasDeadPixel ? t('screen.hasDeadPixel') : t('screen.noDeadPixel')}
              </p>
            </div>
            <div style={{ padding: '12px', border: '1px solid var(--color-border)', borderRadius: '8px', textAlign: 'center' }}>
              <Keyboard size={24} style={{ marginBottom: '8px' }} />
              <p style={{ margin: 0, fontWeight: 500 }}>{t('detection.categories.keyboard')}</p>
              <p style={{ margin: '4px 0 0', fontSize: '14px', color: 'var(--color-success)' }}>
                {report.interactive.keyboard.tested ? t('detection.status.passed') : t('detection.status.pending')}
              </p>
            </div>
            <div style={{ padding: '12px', border: '1px solid var(--color-border)', borderRadius: '8px', textAlign: 'center' }}>
              <Mouse size={24} style={{ marginBottom: '8px' }} />
              <p style={{ margin: 0, fontWeight: 500 }}>{t('detection.categories.trackpad')}</p>
              <p style={{ margin: '4px 0 0', fontSize: '14px', color: report.interactive.trackpad.clickWorking ? 'var(--color-success)' : 'var(--color-warning)' }}>
                {report.interactive.trackpad.clickWorking && report.interactive.trackpad.dragWorking && report.interactive.trackpad.gestureWorking 
                  ? t('detection.status.passed') 
                  : t('detection.status.warning')}
              </p>
            </div>
            <div style={{ padding: '12px', border: '1px solid var(--color-border)', borderRadius: '8px', textAlign: 'center' }}>
              <Camera size={24} style={{ marginBottom: '8px' }} />
              <p style={{ margin: 0, fontWeight: 500 }}>{t('detection.categories.camera')}</p>
              <p style={{ margin: '4px 0 0', fontSize: '14px', color: report.interactive.camera.working ? 'var(--color-success)' : 'var(--color-danger)' }}>
                {report.interactive.camera.working ? t('camera.working') : t('camera.notWorking')}
              </p>
            </div>
            <div style={{ padding: '12px', border: '1px solid var(--color-border)', borderRadius: '8px', textAlign: 'center' }}>
              <Mic size={24} style={{ marginBottom: '8px' }} />
              <p style={{ margin: 0, fontWeight: 500 }}>{t('detection.categories.microphone')}</p>
              <p style={{ margin: '4px 0 0', fontSize: '14px', color: report.interactive.microphone.working ? 'var(--color-success)' : 'var(--color-danger)' }}>
                {report.interactive.microphone.working ? t('detection.status.passed') : t('detection.status.failed')}
              </p>
            </div>
            <div style={{ padding: '12px', border: '1px solid var(--color-border)', borderRadius: '8px', textAlign: 'center' }}>
              <Volume2 size={24} style={{ marginBottom: '8px' }} />
              <p style={{ margin: 0, fontWeight: 500 }}>{t('detection.categories.speaker')}</p>
              <p style={{ margin: '4px 0 0', fontSize: '14px', color: report.interactive.speaker.leftChannel && report.interactive.speaker.rightChannel ? 'var(--color-success)' : 'var(--color-warning)' }}>
                {report.interactive.speaker.leftChannel && report.interactive.speaker.rightChannel 
                  ? t('detection.status.passed') 
                  : `${!report.interactive.speaker.leftChannel ? (isZh ? '左声道异常' : 'Left issue') : ''} ${!report.interactive.speaker.rightChannel ? (isZh ? '右声道异常' : 'Right issue') : ''}`}
              </p>
            </div>
          </div>

          {/* Disclaimer */}
          <div style={{ 
            backgroundColor: 'var(--color-background)', 
            padding: '16px', 
            borderRadius: '8px',
            borderLeft: '4px solid var(--color-warning)'
          }}>
            <h4 style={{ marginBottom: '8px' }}>{t('report.disclaimer')}</h4>
            <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-text-secondary)' }}>
              {t('report.disclaimerText')}
            </p>
          </div>

          {/* Footer */}
          <div style={{ marginTop: '24px', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '12px' }}>
            <p>{t('app.name')} v0.1.0 | QuickScan</p>
          </div>
        </div>
      </div>
    </div>
  );
}
