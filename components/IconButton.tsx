import React from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TouchableOpacityProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface IconButtonProps extends TouchableOpacityProps {
  name: string;
  size?: number;
  color?: string;
  style?: ViewStyle;
  backgroundColor?: string;
}

export const IconButton: React.FC<IconButtonProps> = ({
  name,
  size = 24,
  color = '#3498db',
  style,
  backgroundColor = 'transparent',
  ...props
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.container,
        { backgroundColor },
        style
      ]}
      activeOpacity={0.7}
      {...props}
    >
      <Ionicons name={name as any} size={size} color={color} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 8,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
});