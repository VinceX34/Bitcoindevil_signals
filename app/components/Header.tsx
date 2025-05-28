"use client";

import Link from 'next/link';
import Image from 'next/image'; // Import Image
import { usePathname } from 'next/navigation'; // To highlight active link
import { useState, useEffect } from 'react'; // For managing theme state

const Header = () => {
  const pathname = usePathname();
  // Theme state now managed in Header and applied to body
  const [isDarkMode, setIsDarkMode] = useState(true); 

  useEffect(() => {
    // Attempt to read persisted theme preference or default to dark
    const persistedTheme = localStorage.getItem('theme');
    if (persistedTheme === 'light') {
      setIsDarkMode(false);
    } else {
      setIsDarkMode(true); // Default to dark
    }
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
    // For Tailwind CSS to pick up the dark class on <html>, 
    // ensure your tailwind.config.js has darkMode: 'class'
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  const linkStyleBase = "px-3 py-2 rounded-md text-sm font-medium transition-colors";
  const linkStyle = `${linkStyleBase} ${isDarkMode ? 'text-[#cccccc] hover:text-white' : 'text-gray-700 hover:text-gray-900'}`;
  const activeLinkStyle = isDarkMode ? 'bg-[#3c3c3c] text-white' : 'bg-gray-200 text-gray-900';

  return (
    <header className={`p-4 shadow-md ${isDarkMode ? 'bg-[#252526] border-b border-[#3c3c3c]' : 'bg-white border-b border-gray-200'}`}>
      <nav className="max-w-7xl mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-4">
          {/* Bitcoin Devil Logo */}
          <Link href="/">
            <Image
              src="/devil_full_white.png" // Make sure this path is correct in /public
              alt="Bitcoin Devil Logo"
              width={200} // Adjust as needed
              height={53} // Adjust as needed (maintaining aspect ratio)
              priority
            />
          </Link>
          <Link href="/"
            className={`${linkStyle} ${pathname === '/' ? activeLinkStyle : ''}`}>
            Home
          </Link>
          <Link href="/signaldashboard"
            className={`${linkStyle} ${pathname === '/signaldashboard' ? activeLinkStyle : ''}`}>
            Signal Dashboard
          </Link>
        </div>
        
        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          title="Toggle theme"
          className={`px-3 py-1.5 rounded-md text-sm font-medium ${isDarkMode ? 'text-[#cccccc] bg-[#3c3c3c] hover:bg-[#4f4f4f]' : 'text-gray-700 bg-gray-200 hover:bg-gray-300'}`}
        >
          {isDarkMode ? 'Light Mode' : 'Dark Mode'} {/* Text only, no icons */}
        </button>
      </nav>
    </header>
  );
};

export default Header; 