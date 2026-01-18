interface ProgressBarProps {
  value: number;
  max?: number;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

export function ProgressBar({ value, max = 100, variant = 'default' }: ProgressBarProps) {
  const percentage = Math.min((value / max) * 100, 100);
  
  return (
    <div className="progress-bar">
      <div 
        className={`progress-bar-fill ${variant !== 'default' ? variant : ''}`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}
