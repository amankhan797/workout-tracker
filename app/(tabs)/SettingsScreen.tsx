import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Linking,
  ScrollView,
} from 'react-native';
import { auth, signOut, db } from '../../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/Button';
import { useTheme, themeColors, ThemeColorKey } from '@/app/context/ThemeContext';

export default function SettingsScreen() {
  const [fullName, setFullName] = useState('');
  const { themeColor, setThemeColor } = useTheme();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userId = auth.currentUser?.uid;
        if (!userId) return;

        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          setFullName(userDoc.data().fullName || 'User');
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        Alert.alert('Error', 'Unable to fetch user data.');
      }
    };

    fetchUserData();
  }, []);

  const handleSignOut = async () => {
    Alert.alert(
      'Confirm Log Out',
      'Are you sure you want to log out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              Alert.alert('Signed out', 'You have been successfully signed out.');
            } catch (error) {
              console.error('Sign out error', error);
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const openLink = async (url: string) => {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert('Error', 'Unable to open the link.');
    }
  };

  // Get the current selected color key
  const getCurrentColorKey = (): ThemeColorKey => {
    const entries = Object.entries(themeColors) as [ThemeColorKey, string][];
    const found = entries.find(([_, value]) => value === themeColor);
    return found ? found[0] : 'blue';
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* User Info */}
        <View style={styles.userInfo}>
          <Text style={styles.label}>Name:</Text>
          <Text style={styles.value}>{fullName}</Text>
          <Text style={styles.label}>Email:</Text>
          <Text style={styles.value}>{auth.currentUser?.email || 'User'}</Text>
        </View>

        {/* Theme Color Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Theme</Text>
          <View style={styles.colorOptions}>
            {Object.entries(themeColors).map(([key, color]) => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.colorOption,
                  { backgroundColor: color },
                  getCurrentColorKey() === key && styles.selectedColor,
                ]}
                onPress={() => setThemeColor(key as ThemeColorKey)}
              />
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Footer with Social Links and Logout */}
      <View style={styles.footerContainer}>
        <View style={styles.footer}>
          <View style={styles.creditText}>
            <Text style={{color: "#fff", fontFamily: "monospace"}}>Created by </Text>
            <Text style={{color: "#fff", fontWeight: "bold", fontFamily: "monospace"}}>Aman Khan</Text>
          </View>
          <View style={styles.icons}>
            <TouchableOpacity onPress={() => openLink('https://github.com/amankhan797')}>
              <Ionicons name="logo-github" size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => openLink('https://www.linkedin.com/in/aman-khan-z797/')}>
              <Ionicons name="logo-linkedin" size={24} color="#0A66C2" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => openLink('https://www.instagram.com/_amankhan777_/')}>
              <Ionicons name="logo-instagram" size={24} color="#E1306C" />
            </TouchableOpacity>
          </View>
        </View>
        <Button
          style={styles.logoutButton}
          title="Log Out" 
          variant="danger" 
          icon="log-out-outline" 
          onPress={handleSignOut} 
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgb(38, 38, 38)',
    justifyContent: 'space-between',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 0,
  },
  userInfo: {
    width: '100%',
    padding: 10,
    backgroundColor: '#444',
    borderRadius: 10,
    elevation: 3,
    marginBottom: 20,
  },
  section: {
    width: '100%',
    padding: 15,
    backgroundColor: '#444',
    borderRadius: 10,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 15,
  },
  colorOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  colorOption: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginBottom: 10,
  },
  selectedColor: {
    borderWidth: 3,
    borderColor: '#fff',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  value: {
    marginBottom: 10,
    fontSize: 18,
    color: '#aaa',
  },
  footerContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 0,
    marginBottom: 20,
  },
  footer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  creditText: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  icons: {
    flexDirection: 'row',
    gap: 20,
  },
  logoutButton: {
    width: '90%'
  }
});
