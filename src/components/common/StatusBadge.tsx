import { CheckCircle, AlertCircle, XCircle, Clock, Loader } from 'lucide-react';
import type { DetectionStatus } from '../../types';

interface StatusBadgeProps {
  status: DetectionStatus;
  label?: string;
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const config = {
    passed: { icon: CheckCircle, className: 'status-passed' },
    warning: { icon: AlertCircle, className: 'status-warning' },
    failed: { icon: XCircle, className: 'status-failed' },
    pending: { icon: Clock, className: 'status-pending' },
    testing: { icon: Loader, className: 'status-testing' },
  };

  const { icon: Icon, className } = config[status];
  const isSpinning = status === 'testing';

  return (
    <span className={`status-badge ${className}`}>
      <Icon size={16} className={isSpinning ? 'animate-spin' : ''} />
      {label && <span>{label}</span>}
    </span>
  );
}
