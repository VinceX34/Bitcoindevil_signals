'use client';

import React, { useEffect, useRef, memo } from 'react';

interface TradingViewWidgetProps {
  symbol?: string; // e.g., "BITSTAMP:BTCUSD"
  theme?: 'light' | 'dark';
  autosize?: boolean;
  // Add other widget options as props if needed
  // interval, timezone, style, locale, toolbar_bg, etc.
}

declare global {
  interface Window {
    TradingView: any; // Declare TradingView on window object
  }
}

const TradingViewWidget: React.FC<TradingViewWidgetProps> = ({
  symbol = "BITSTAMP:BTCUSD", // Default symbol
  theme = "light",
  autosize = true,
}) => {
  const containerIdRef = useRef(`tradingview_${Math.random().toString(36).substring(7)}`);
  const scriptAddedRef = useRef(false);
  const widgetRef = useRef<any>(null); // To store the widget instance

  useEffect(() => {
    const loadScriptAndInitWidget = () => {
      if (typeof window.TradingView === 'undefined' || typeof window.TradingView.widget === 'undefined') {
        console.error("TradingView script not loaded yet, or widget function missing.");
        return;
      }

      // Ensure container exists
      const container = document.getElementById(containerIdRef.current);
      if (!container) {
        console.error("TradingView widget container not found:", containerIdRef.current);
        return;
      }
      
      // Clear previous widget if any before creating a new one
      // This is important if props like symbol change and we need to re-initialize
      if (widgetRef.current) {
        try {
           widgetRef.current.remove(); // Use the remove method if available
           widgetRef.current = null;
        } catch (e) {
          console.warn("Could not remove previous TradingView widget instance:", e);
          // Fallback: clear container if remove method fails or doesn't exist
          container.innerHTML = ''; 
        }
      } else if (container) {
        container.innerHTML = ''; // Clear container from previous attempts too
      }

      const widgetOptions = {
        autosize,
        symbol,
        interval: "240", // 4 hours
        timezone: "Etc/UTC",
        theme: theme,
        style: "1",
        locale: "en",
        toolbar_bg: theme === 'light' ? "#f1f3f6" : "#252526", // Adjust based on theme
        enable_publishing: false,
        withdateranges: true,
        hide_side_toolbar: false,
        allow_symbol_change: true, // Important: allow symbol change via props
        save_image: false,
        container_id: containerIdRef.current,
      };

      if (window.TradingView && window.TradingView.widget) {
        widgetRef.current = new window.TradingView.widget(widgetOptions);
      } else {
        console.error("TradingView widget constructor not found at time of initialization.");
      }
    };

    const script = document.createElement('script');
    script.id = 'tradingview-widget-script';
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;

    script.onload = () => {
      scriptAddedRef.current = true;
      loadScriptAndInitWidget();
    };

    script.onerror = () => {
      console.error("Failed to load TradingView widget script.");
    };

    // Check if script already exists to prevent duplicates
    if (!document.getElementById('tradingview-widget-script')) {
      document.head.appendChild(script);
    } else if (!scriptAddedRef.current) {
      // Script tag exists but our ref says it wasn't added by this instance/load cycle
      // This can happen with fast re-renders. We assume it might be loading or loaded.
      // Check if TradingView object is available, if so, try to init. If not, it might load soon.
      if (typeof window.TradingView !== 'undefined' && typeof window.TradingView.widget !== 'undefined') {
        scriptAddedRef.current = true; // Mark as handled
        loadScriptAndInitWidget();
      } else {
        // It's tricky, the script tag is there, but not loaded. We rely on its onload if it eventually loads.
        // Or, if it was an old script tag from a previous failed load, this instance's onload won't fire.
        // This path is less common if the appendChild check is robust.
      }
    } else {
      // Script tag exists and was added in a previous render of this component instance or another.
      // We can proceed to initialize if TV object is ready.
      if (typeof window.TradingView !== 'undefined' && typeof window.TradingView.widget !== 'undefined'){
        loadScriptAndInitWidget();
      } else {
          // TV object not ready, script.onload should handle it if this instance added the script.
          // If another instance added it, its onload would call loadScriptAndInitWidget.
      }
    }
    
    // Cleanup function
    return () => {
      // Attempt to remove the widget instance if it exists and has a remove method
      if (widgetRef.current && typeof widgetRef.current.remove === 'function') {
        try {
          widgetRef.current.remove();
          widgetRef.current = null;
        } catch (e) {
          console.warn("Error removing TradingView widget during component unmount:", e);
        }
      }
      // Do NOT remove the script itself (document.getElementById('tradingview-widget-script')?.remove()) 
      // as other widget instances on the page might still need it.
      // Also, removing and re-adding scripts can be problematic.
    };

  }, [symbol, theme, autosize]); // Re-run effect if these critical props change

  return (
    <div className="tradingview-widget-container" style={{ width: '100%', height: '100%' }}>
      <div id={containerIdRef.current} style={{ width: '100%', height: '100%' }} />
      {/* The copyright div can be added if desired, but often managed by the widget itself or optional */}
      {/* <div className="tradingview-widget-copyright">
        <a href={`https://www.tradingview.com/symbols/${symbol}`} rel="noopener noreferrer" target="_blank">
          <span className="blue-text">Chart</span>
        </a> by TradingView
      </div> */}
    </div>
  );
};

// Use memo to prevent re-renders if props haven't changed, especially important for script-heavy components
export default memo(TradingViewWidget); 