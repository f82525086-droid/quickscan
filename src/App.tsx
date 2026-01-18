import { useState } from 'react';
import { Header } from './components/common';
import { HomePage } from './components/HomePage';
import { DetectionPage } from './components/detection/DetectionPage';
import { ReportPage } from './components/report/ReportPage';
import type { DetectionReport } from './types';
import './i18n';
import './styles/global.css';

type Page = 'home' | 'detection' | 'report';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [report, setReport] = useState<DetectionReport | null>(null);

  const handleStartDetection = () => {
    setCurrentPage('detection');
  };

  const handleDetectionComplete = (detectionReport: DetectionReport) => {
    setReport(detectionReport);
    setCurrentPage('report');
  };

  const handleBackToHome = () => {
    setCurrentPage('home');
    setReport(null);
  };

  return (
    <div className="app">
      <Header />
      <main>
        {currentPage === 'home' && (
          <HomePage onStartDetection={handleStartDetection} />
        )}
        {currentPage === 'detection' && (
          <DetectionPage onComplete={handleDetectionComplete} onBack={handleBackToHome} />
        )}
        {currentPage === 'report' && report && (
          <ReportPage report={report} onBack={handleBackToHome} />
        )}
      </main>
    </div>
  );
}

export default App;
