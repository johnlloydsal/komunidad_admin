import { useState } from 'react';

const StatCard = ({ title, value, icon: Icon, bgColor, iconColor }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      className={`${bgColor} rounded-xl p-6 text-white shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 cursor-pointer overflow-hidden relative group animate-slide-up`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Animated Background Gradient */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent animate-gradient"></div>
      </div>
      
      {/* Content */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="space-y-2">
          <h3 className={`text-4xl font-bold transition-all duration-300 ${isHovered ? 'scale-110' : 'scale-100'}`}>
            {value}
          </h3>
          <p className="text-sm opacity-90 font-medium tracking-wide">{title}</p>
        </div>
        <div className={`${iconColor} bg-white/20 p-4 rounded-2xl transition-all duration-300 ${isHovered ? 'rotate-12 scale-110' : 'rotate-0 scale-100'} backdrop-blur-sm`}>
          <Icon size={28} className="text-white" />
        </div>
      </div>

      {/* Bottom Accent Line */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/30 transform origin-left transition-transform duration-300 group-hover:scale-x-100 scale-x-0"></div>
      
      {/* Shimmer Effect */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
        <div className="animate-shimmer absolute inset-0"></div>
      </div>
    </div>
  );
};

export default StatCard;
