import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';

const Toast = ({ message, type = 'success', onClose, duration = 3000 }) => {
  const [progress, setProgress] = useState(100);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (duration) {
      // Progress bar animation
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.max(0, prev - (100 / (duration / 50))));
      }, 50);

      // Close animation
      const timer = setTimeout(() => {
        setIsExiting(true);
        setTimeout(onClose, 300);
      }, duration);
      
      return () => {
        clearInterval(progressInterval);
        clearTimeout(timer);
      };
    }
  }, [duration, onClose]);

  const icons = {
    success: CheckCircle,
    error: XCircle,
    info: Info,
    warning: AlertTriangle
  };

  const colors = {
    success: 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-500 text-green-800',
    error: 'bg-gradient-to-r from-red-50 to-rose-50 border-red-500 text-red-800',
    info: 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-500 text-blue-800',
    warning: 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-500 text-yellow-800'
  };

  const iconColors = {
    success: 'text-green-600',
    error: 'text-red-600',
    info: 'text-blue-600',
    warning: 'text-yellow-600'
  };

  const progressColors = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
    warning: 'bg-yellow-500'
  };

  const Icon = icons[type];

  return (
    <div 
      className={`fixed top-4 right-4 z-50 border-l-4 p-4 rounded-xl shadow-2xl max-w-md backdrop-blur-sm overflow-hidden transition-all duration-300 ${
        isExiting ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0 animate-slide-in'
      } ${colors[type]}`}
    >
      {/* Content */}
      <div className="flex items-start gap-3 relative z-10">
        <div className="p-1 rounded-full bg-white shadow-sm">
          <Icon className={`h-5 w-5 flex-shrink-0 ${iconColors[type]}`} />
        </div>
        <p className="flex-1 text-sm font-medium leading-relaxed">{message}</p>
        <button 
          onClick={() => {
            setIsExiting(true);
            setTimeout(onClose, 300);
          }} 
          className="flex-shrink-0 hover:scale-110 transition-transform duration-200 p-1 rounded-full hover:bg-white/50"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Progress Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/10">
        <div 
          className={`h-full transition-all duration-50 ${progressColors[type]}`}
          style={{ width: `${progress}%` }}
        ></div>
      </div>

      {/* Decorative Gradient */}
      <div className="absolute top-0 right-0 w-32 h-32 opacity-20 pointer-events-none">
        <div className={`w-full h-full rounded-full blur-2xl ${progressColors[type]}`}></div>
      </div>
    </div>
  );
};

export default Toast;
