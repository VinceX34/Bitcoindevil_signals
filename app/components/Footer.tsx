import React from 'react';

interface FooterProps {
  isDarkMode: boolean;
}

export default function Footer({ isDarkMode }: FooterProps) {
  return (
    <footer className={`py-4 px-8 border-t ${isDarkMode ? 'bg-[#1e1e1e] border-[#3c3c3c] text-[#cccccc]' : 'bg-gray-100 border-gray-200 text-gray-800'}`}>
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <div className="text-sm">
          © {new Date().getFullYear()} MyTradingSignals
        </div>
        <div className="text-sm">
          <a 
            href="https://github.com/yourusername/mytradingsignals" 
            target="_blank" 
            rel="noopener noreferrer"
            className={`hover:underline ${isDarkMode ? 'text-[#007acc] hover:text-[#0098ff]' : 'text-blue-600 hover:text-blue-800'}`}
          >
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
} 