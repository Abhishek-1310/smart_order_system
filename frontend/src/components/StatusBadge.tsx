// ============================================================
// Order Status Badge Component
// ============================================================


import { CheckCircle, Clock, XCircle } from 'lucide-react';

interface StatusBadgeProps {
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = {
    PENDING: {
      icon: Clock,
      bg: 'bg-yellow-50',
      text: 'text-yellow-700',
      border: 'border-yellow-200',
      dot: 'bg-yellow-400',
    },
    COMPLETED: {
      icon: CheckCircle,
      bg: 'bg-green-50',
      text: 'text-green-700',
      border: 'border-green-200',
      dot: 'bg-green-400',
    },
    FAILED: {
      icon: XCircle,
      bg: 'bg-red-50',
      text: 'text-red-700',
      border: 'border-red-200',
      dot: 'bg-red-400',
    },
  };

  const { icon: Icon, bg, text, border, dot } = config[status];

  return (
    <span
      className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${bg} ${text} ${border}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      <Icon className="w-3 h-3" />
      <span>{status}</span>
    </span>
  );
}
