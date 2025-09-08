import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  TouchableOpacityProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/app/context/ThemeContext';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'outline';
export type ButtonSize = 'small' | 'medium' | 'large';

interface ButtonProps extends TouchableOpacityProps {
  title?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  disabled?: boolean;
  icon?: string;
  iconPosition?: 'left' | 'right';
  iconSize?: number;
  iconColor?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  variant = 'primary',
  size = 'medium',
  isLoading = false,
  disabled = false,
  icon,
  iconPosition = 'left',
  iconSize = 20,
  iconColor,
  style,
  textStyle,
  fullWidth = false,
  ...props
}) => {
  const { themeColor } = useTheme(); // moved outside helper for better access

  const getButtonStyle = (): ViewStyle[] => {
    const buttonStyles: ViewStyle[] = [styles.button];
    const { themeColor } = useTheme();

    // Add variant styles
    switch (variant) {
      case 'primary':
        buttonStyles.push({ ...styles.primaryButton, backgroundColor: themeColor });
        break;
      case 'secondary':
        buttonStyles.push(styles.secondaryButton);
        break;
      case 'danger':
        buttonStyles.push(styles.dangerButton);
        break;
      case 'success':
        buttonStyles.push(styles.successButton);
        break;
      case 'outline':
        buttonStyles.push({ 
          ...styles.outlineButton, 
          borderColor: themeColor 
        });
        break;
    }

    // Add size styles
    switch (size) {
      case 'small':
        buttonStyles.push(styles.smallButton);
        break;
      case 'medium':
        buttonStyles.push(styles.mediumButton);
        break;
      case 'large':
        buttonStyles.push(styles.largeButton);
        break;
    }

    // Add full width style
    if (fullWidth) {
      buttonStyles.push(styles.fullWidth);
    }

    // Add disabled style
    if (disabled || isLoading) {
      buttonStyles.push(styles.disabledButton);
    }

    return buttonStyles;
  };

  const getTextStyle = (): TextStyle[] => {
    const textStyles: TextStyle[] = [styles.buttonText];

    // Add variant text styles
    switch (variant) {
      case 'primary':
        textStyles.push(styles.primaryText);
        break;
      case 'secondary':
        textStyles.push(styles.secondaryText);
        break;
      case 'danger':
        textStyles.push(styles.dangerText);
        break;
      case 'success':
        textStyles.push(styles.successText);
        break;
      case 'outline':
        textStyles.push({ ...styles.outlineText, color: themeColor });
        break;
    }

    // Add size text styles
    switch (size) {
      case 'small':
        textStyles.push(styles.smallText);
        break;
      case 'medium':
        textStyles.push(styles.mediumText);
        break;
      case 'large':
        textStyles.push(styles.largeText);
        break;
    }

    // Add disabled text style
    if (disabled || isLoading) {
      textStyles.push(styles.disabledText);
    }

    return textStyles;
  };

  const getIconColor = () => {
    if (iconColor) return iconColor;
    
    switch (variant) {
      case 'primary':
        return '#fff';
      case 'secondary':
        return '#fff';
      case 'danger':
        return '#fff';
      case 'success':
        return '#fff';
      case 'outline':
        return 't';
      default:
        return '#fff';
    }
  };

  return (
    <TouchableOpacity
      style={[...getButtonStyle(), style]}
      disabled={disabled || isLoading}
      activeOpacity={0.7}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color={variant === 'outline' ? themeColor : "#fff"} />
      ) : (
        <>
          {icon && iconPosition === 'left' && (
            <Ionicons
              name={icon as any}
              size={iconSize}
              color={getIconColor()}
              style={styles.leftIcon}
            />
          )}
          {title && <Text style={[...getTextStyle(), textStyle]}>{title}</Text>}
          {icon && iconPosition === 'right' && (
            <Ionicons
              name={icon as any}
              size={iconSize}
              color={getIconColor()}
              style={styles.rightIcon}
            />
          )}
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  primaryButton: {
    backgroundColor: '#3498db',
  },
  secondaryButton: {
    backgroundColor: '#666',
  },
  dangerButton: {
    backgroundColor: '#FF3B30',
  },
  successButton: {
    backgroundColor: '#4CD964',
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#3498db',
  },
  smallButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  mediumButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  largeButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  fullWidth: {
    width: '100%',
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    fontWeight: '600',
    textAlign: 'center',
  },
  primaryText: {
    color: '#fff',
  },
  secondaryText: {
    color: '#fff',
  },
  dangerText: {
    color: '#fff',
  },
  successText: {
    color: '#fff',
  },
  outlineText: {
    color: '#3498db',
  },
  smallText: {
    fontSize: 14,
  },
  mediumText: {
    fontSize: 16,
  },
  largeText: {
    fontSize: 18,
  },
  disabledText: {
    opacity: 0.8,
  },
  leftIcon: {
    marginRight: 8,
  },
  rightIcon: {
    marginLeft: 8,
  },
});