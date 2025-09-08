import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { signIn, signUp } from '../firebase';
import { Button } from '@/components/Button';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLogin, setIsLogin] = useState(true);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string): boolean => {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    return passwordRegex.test(password);
  };

  const handleAuth = async () => {
    try {
      if (!email || !password || (!isLogin && !fullName)) {
        Alert.alert('Error', 'Please fill in all fields');
        return;
      }

      if (!validateEmail(email)) {
        Alert.alert('Error', 'Please enter a valid email address');
        return;
      }

      if (!isLogin && !validatePassword(password)) {
        Alert.alert(
          'Error',
          'Password must be at least 8 characters long and contain uppercase, lowercase, and numbers'
        );
        return;
      }

      if (isLogin) {
        await signIn(email, password);
      } else {
        if (fullName.length < 2) {
          Alert.alert('Error', 'Please enter a valid full name');
          return;
        }
        await signUp(email, password, fullName);
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      Alert.alert('Error', error.message || 'Authentication failed');
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.formContainer}>
          <Text style={styles.title}>
            {isLogin ? 'Welcome Back!' : 'Create Account'}
          </Text>

          {!isLogin && (
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              placeholderTextColor="#666"
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
              maxLength={50}
            />
          )}

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#666"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoCorrect={false}
            maxLength={100}
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#666"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            maxLength={50}
          />

          {!isLogin && (
            <Text style={styles.passwordRequirements}>
              Password must be at least 8 characters long and contain uppercase,
              lowercase, and numbers
            </Text>
          )}

          <Button
            title={isLogin ? 'Login' : 'Sign Up'}
            onPress={handleAuth}
            fullWidth
            size="large"
          />

          <TouchableOpacity
            style={styles.switchButton}
            onPress={() => {
              setIsLogin(!isLogin);
              setEmail('');
              setPassword('');
              setFullName('');
            }}
          >
            <Text style={styles.switchButtonText}>
              {isLogin
                ? "Don't have an account? Sign Up"
                : 'Already have an account? Login'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgb(38, 38, 38)',
  },
  formContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#ddd',
  },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#666',
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
    fontSize: 16,
    backgroundColor: '#444',
    color: '#fff',
  },
  button: {
    width: '100%',
    height: 50,
    backgroundColor: '#3498db',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  switchButton: {
    marginTop: 20,
  },
  switchButtonText: {
    color: '#3498db',
    fontSize: 14,
  },
  passwordRequirements: {
    color: '#999',
    fontSize: 12,
    textAlign: 'left',
    width: '100%',
    marginBottom: 15,
  },
});