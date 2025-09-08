import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { red } from 'react-native-reanimated/lib/typescript/Colors';

// Define theme colors
export const themeColors = {
  blue: '#3598DB',
  green: '#7EB94D',
  orange: '#D88D27',
  purple: '#BB86FC',
  pink: '#EA80FC',
};

export type ThemeColorKey = keyof typeof themeColors;

type ThemeContextType = {
  themeColor: string;
  setThemeColor: (color: ThemeColorKey) => void;
};

const ThemeContext = createContext<ThemeContextType>({
  themeColor: themeColors.blue,
  setThemeColor: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeColor, setThemeColorState] = useState<string>(themeColors.blue);

  useEffect(() => {
    // Load saved theme on startup
    const loadTheme = async () => {
      try {
        const savedColor = await AsyncStorage.getItem('themeColor');
        if (savedColor && savedColor in themeColors) {
          setThemeColorState(themeColors[savedColor as ThemeColorKey]);
        }
      } catch (error) {
        console.error('Failed to load theme color:', error);
      }
    };

    loadTheme();
  }, []);

  const setThemeColor = async (colorKey: ThemeColorKey) => {
    try {
      await AsyncStorage.setItem('themeColor', colorKey);
      setThemeColorState(themeColors[colorKey]);
    } catch (error) {
      console.error('Failed to save theme color:', error);
    }
  };

  return (
    <ThemeContext.Provider value={{ themeColor, setThemeColor }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);