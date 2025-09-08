import { Stack } from 'expo-router';

export default function IndexLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen 
        name="index"
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="screens/recommended-plans"
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="screens/custom-plan"
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="screens/ImageAnalyzer"
        options={{ headerShown: true, title: 'Image Analyzer', headerStyle: { backgroundColor: '#666' }, headerTintColor: '#fff' }}
      />
    </Stack>
  );
}