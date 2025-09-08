import { Stack, useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { TextInput, View, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState, useCallback } from 'react';
import { IconButton } from '@/components/IconButton';

// Define a type-safe way to set the global variable
const setSearchQuery = (query: string): void => {
  (global as any).exerciseSearchQuery = query;
};

export default function IndexLayout() {
  const { themeColor } = useTheme();
  const [searchQuery, setSearchQueryState] = useState('');
  const router = useRouter();

  // Function to navigate back to the workout page - use useCallback to memoize
  const navigateToWorkout = useCallback(() => {
    router.push('/workout');
  }, [router]);

  // Memoize the text input handler
  const handleTextChange = useCallback((text: string) => {
    setSearchQueryState(text);
    setSearchQuery(text);
  }, []);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerStyle: {
          backgroundColor: 'rgb(38, 38, 38)',
        },
        headerTintColor: themeColor,
        headerTitleStyle: {
          color: '#fff',
        },
      }}
    >
      <Stack.Screen 
        name="index"
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="screens/all-exercises"
        options={{ 
          headerShown: true,
          title: "",
          headerLeft: () => (
            <IconButton
              name="arrow-back"
              size={24}
              color={themeColor}
              onPress={navigateToWorkout}
              style={styles.backButton}
            />
          ),
          headerTitle: () => (
            <View style={[styles.searchContainer, { backgroundColor: `${themeColor}20` }]}>
              <Ionicons name="search" size={20} style={styles.searchIcon} color="#888" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search exercises..."
                placeholderTextColor="#999"
                value={searchQuery}
                onChangeText={handleTextChange}
                returnKeyType="search"
              />
            </View>
          ),
          headerRight: () => null,
        }}
      />
      <Stack.Screen 
        name="screens/all-muscle-groups"
        options={{ 
          headerShown: true,
          title: "Muscle Groups",
          headerTitleStyle: {
            color: '#fff',
            fontSize: 18,
            fontWeight: '600',
          },
          headerLeft: () => (
            <IconButton
              name="arrow-back"
              size={24}
              color={themeColor}
              onPress={navigateToWorkout}
              style={styles.backButton}
            />
          ),
        }}
      />
    </Stack>
  );
}

const styles = StyleSheet.create({
  backButton: {
    marginLeft: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    borderRadius: 8,
    width: "100%",
    height: 36,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 36,
    fontSize: 14,
    color: "#fff",
  },
});