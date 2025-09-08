/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors, updateTintColor } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useTheme } from '@/app/context/ThemeContext';
import { useEffect } from 'react';

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof Colors.light & keyof typeof Colors.dark
) {
  const theme = useColorScheme() ?? 'light';
  const { themeColor } = useTheme();
  const colorFromProps = props[theme];
  
  useEffect(() => {
    // Update the tint color when themeColor changes
    updateTintColor(themeColor);
  }, [themeColor]);

  if (colorFromProps) {
    return colorFromProps;
  } else {
    return Colors[theme][colorName];
  }
}
