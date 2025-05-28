"use client";

import Link from 'next/link';
import Image from 'next/image'; // Import Image
import { usePathname } from 'next/navigation'; // To highlight active link
import { useState, useEffect } from 'react'; // For managing theme state

const Header = () => {
  const pathname = usePathname();
  const [isDarkMode, setIsDarkMode] = useState(true); // Default to dark for SSR
  const [mounted, setMounted] = useState(false);

  // Set mounted to true after component mounts
  useEffect(() => {
    setMounted(true);
  }, []);

  // Effect for reading theme from localStorage and setting it
  useEffect(() => {
    const persistedTheme = localStorage.getItem('theme');
    if (persistedTheme === 'light') {
      setIsDarkMode(false);
    } else {
      setIsDarkMode(true); // Default to dark or persisted 'dark'
    }
  }, []); // Runs once on mount

  // Effect for applying theme to document and saving to localStorage
  useEffect(() => {
    if (mounted) { // Only run after mounted to avoid SSR issues
      if (isDarkMode) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }
    }
  }, [isDarkMode, mounted]);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  // Determine styles and logo based on theme, only after mounting
  const currentLogo = mounted && isDarkMode ? "/devil_full_white.png" : "/devil_full_black.png";
  const headerClasses = mounted && isDarkMode ? 'bg-[#252526] border-b border-[#3c3c3c]' : 'bg-white border-b border-gray-200';
  const linkStyleBase = "px-3 py-2 rounded-md text-sm font-medium transition-colors";
  const linkStyle = mounted && isDarkMode ? `${linkStyleBase} text-[#cccccc] hover:text-white` : `${linkStyleBase} text-gray-700 hover:text-gray-900`;
  const activeLinkStyle = mounted && isDarkMode ? 'bg-[#3c3c3c] text-white' : 'bg-gray-200 text-gray-900';
  const buttonText = mounted && isDarkMode ? 'Light Mode' : 'Dark Mode';
  const buttonClasses = mounted && isDarkMode ? 
    'text-[#cccccc] bg-[#3c3c3c] hover:bg-[#4f4f4f]' :
    'text-gray-700 bg-gray-200 hover:bg-gray-300';

  // Fallback for SSR or before mounted
  if (!mounted) {
    // Render a minimal, non-theme-dependent header or null during SSR/pre-mount to avoid mismatch
    // Or, more practically, render with default (e.g., light theme) styles and let client-side update it.
    // For this example, let's use the default light theme styles for the initial render pass.
    return (
      <header className={`p-4 shadow-md bg-white border-b border-gray-200`}>
        <nav className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Link href="/">
              <Image
                src="/devil_full_black.png" // Default to black logo for SSR
                alt="Bitcoin Devil Logo"
                width={200}
                height={53}
                priority
              />
            </Link>
            <Link href="/"
              className={`${linkStyleBase} text-gray-700 hover:text-gray-900} ${pathname === '/' ? 'bg-gray-200 text-gray-900' : ''}`}>
              Home
            </Link>
            <Link href="/signaldashboard"
              className={`${linkStyleBase} text-gray-700 hover:text-gray-900} ${pathname === '/signaldashboard' ? 'bg-gray-200 text-gray-900' : ''}`}>
              Signal Dashboard
            </Link>
          </div>
          <button
            title="Toggle theme"
            className={`px-3 py-1.5 rounded-md text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300`}
          >
            Dark Mode
          </button>
        </nav>
      </header>
    );
  }

  return (
    <header className={`p-4 shadow-md ${headerClasses}`}>
      <nav className="max-w-7xl mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Link href="/">
            <Image
              src={currentLogo}
              alt="Bitcoin Devil Logo"
              width={200}
              height={53}
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
        
        <button
          onClick={toggleTheme}
          title="Toggle theme"
          className={`px-3 py-1.5 rounded-md text-sm font-medium ${buttonClasses}`}
        >
          {buttonText}
        </button>
      </nav>
    </header>
  );
};

export default Header; 