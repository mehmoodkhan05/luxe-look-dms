import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext(null);
const THEME_KEY = 'lldms_theme';
const SIDEBAR_COLOR_KEY = 'lldms_sidebar_color';
const NAVBAR_COLOR_KEY = 'lldms_navbar_color';

const DEFAULT_SIDEBAR = { r: 245, g: 240, b: 230 };
const DEFAULT_NAVBAR = { r: 250, g: 248, b: 243 };

function parseStoredColor(key, fallback) {
  try {
    const s = localStorage.getItem(key);
    if (!s) return fallback;
    const obj = JSON.parse(s);
    if (obj?.r != null && obj?.g != null && obj?.b != null) {
      return {
        r: clampRgb(obj.r),
        g: clampRgb(obj.g),
        b: clampRgb(obj.b),
      };
    }
  } catch {}
  return fallback;
}

function rgbToCss({ r, g, b }) {
  return `rgb(${r}, ${g}, ${b})`;
}

function clampRgb(v) {
  const n = Number(v);
  if (n !== n) return 255;
  return Math.min(255, Math.max(0, n));
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_KEY) || 'light');
  const [sidebarColor, setSidebarColorState] = useState(() => parseStoredColor(SIDEBAR_COLOR_KEY, DEFAULT_SIDEBAR));
  const [navbarColor, setNavbarColorState] = useState(() => parseStoredColor(NAVBAR_COLOR_KEY, DEFAULT_NAVBAR));

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.style.setProperty('--luxe-sidebar-bg', rgbToCss(sidebarColor));
    document.documentElement.style.setProperty('--luxe-navbar-bg', rgbToCss(navbarColor));
    localStorage.setItem(SIDEBAR_COLOR_KEY, JSON.stringify(sidebarColor));
    localStorage.setItem(NAVBAR_COLOR_KEY, JSON.stringify(navbarColor));
  }, [sidebarColor, navbarColor]);

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  const setSidebarColor = (rgb) => {
    setSidebarColorState({
      r: clampRgb(rgb.r),
      g: clampRgb(rgb.g),
      b: clampRgb(rgb.b),
    });
  };

  const setNavbarColor = (rgb) => {
    setNavbarColorState({
      r: clampRgb(rgb.r),
      g: clampRgb(rgb.g),
      b: clampRgb(rgb.b),
    });
  };

  const resetSidebarColor = () => setSidebarColorState(DEFAULT_SIDEBAR);
  const resetNavbarColor = () => setNavbarColorState(DEFAULT_NAVBAR);

  return (
    <ThemeContext.Provider value={{
      theme,
      toggleTheme,
      sidebarColor,
      navbarColor,
      setSidebarColor,
      setNavbarColor,
      resetSidebarColor,
      resetNavbarColor,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
