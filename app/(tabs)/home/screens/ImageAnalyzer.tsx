import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  Modal,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import Markdown from 'react-native-markdown-display';
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../context/ThemeContext"; // Import useTheme

const { width } = Dimensions.get('window');
const API_KEY = "AIzaSyAM3FpMgmvk8IsETN7vpY-mYrP0VNIyIVI";

export default function ImageAnalyzer() {
  const { themeColor } = useTheme(); // Get the theme color
  const [selectedImage, setSelectedImage] = useState<ImagePicker.ImagePickerResult | null>(null);
  const [prompt, setPrompt] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const pickImage = async (useCamera: boolean) => {
    try {
      let permissionResult;
      if (useCamera) {
        permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      } else {
        permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      }
      
      if (!permissionResult.granted) {
        alert(`Permission to access ${useCamera ? 'camera' : 'media library'} is required!`);
        return;
      }

      const result = await (useCamera 
        ? ImagePicker.launchCameraAsync({
            allowsEditing: true,
            base64: true,
            quality: 1,
          })
        : ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            base64: true,
            quality: 1,
          }));

      if (!result.canceled) {
        setSelectedImage(result);
        setOutput(""); 
      }
    } catch (error) {
      console.error("Error picking image:", error);
      alert("Error selecting image");
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    setOutput("");
  };

  const analyzeImage = async () => {
    if (!selectedImage || !selectedImage.assets?.[0]?.base64) {
      setOutput("Please select an image.");
      return;
    }

    setLoading(true);
    setOutput("");

    try {
      const genAI = new GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
          },
        ],
      });

      const base64Image = selectedImage.assets[0].base64;
      const mimeType = selectedImage.assets[0].mimeType || "image/jpeg";

      const imagePart = {
        inlineData: {
          data: base64Image,
          mimeType: mimeType
        }
      };

      const enhancedPrompt = `
Please analyze this image and provide detailed but short and on point nutritional information in the following markdown format:

## Key Details
- Main elements and food items detected
- Colors and composition
- Notable features (e.g., fresh, processed, packaged)

## Basic Nutritional Facts (For General Users)
- **Calories:** Total per serving
- **Macronutrients:**
  - **Carbohydrates:** (Total, Sugars, Fiber)
  - **Proteins:** (Grams)
  - **Fats:** (Total, Saturated, Unsaturated, Trans fats)
- **Key Vitamins & Minerals:**
  - Notable percentages (Vitamin C, Calcium, Iron, etc.)
- **Sodium Content:** Important for blood pressure
- **Ingredients Overview:** Processed vs. Natural

## Advanced Nutritional Analysis (For Nutritionists)
- **Macronutrient Breakdown:** More detailed insights
- **Glycemic Index (GI) & Glycemic Load (GL)**
- **Cholesterol Levels:** HDL vs. LDL
- **Omega-3 vs. Omega-6 Ratio**
- **Bioavailability:** Absorption potential of key nutrients
- **Food Processing Level:** Fresh, minimally processed, or ultra-processed
- **Antioxidant Content & Functional Compounds**

## Additional Information
Any other relevant insights, potential health benefits, or dietary considerations.
`;

      const promptPart = { text: prompt || enhancedPrompt };
      const result = await model.generateContent([imagePart, promptPart]);
      const response = await result.response;
      const text = response.text();
      
      setOutput(text);
    } catch (error) {
      console.error("Analysis error:", error);
      setOutput(`**Error:** ${error instanceof Error ? error.message : "Unknown error occurred"}`);
    } finally {
      setLoading(false);
    }
  };

  const markdownStyles = {
    heading1: {
      color: '#FFD700',
      fontSize: 24,
      marginTop: 20,
      marginBottom: 10,
    },
    heading2: {
      color: themeColor, // Use theme color for h2 headings
      fontSize: 20,
      marginTop: 15,
      marginBottom: 8,
    },
    strong: {
      color: themeColor, // Use theme color for bold text
      fontWeight: '700',
    },
    paragraph: {
      color: '#fff',
      fontSize: 16,
      lineHeight: 24,
    },
    list_item: {
      color: '#fff',
      marginBottom: 5,
    },
    bullet_list: {
      marginLeft: 20,
    },
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.container}>
          <View style={styles.imageOptionsContainer}>
            <TouchableOpacity 
              style={[styles.imageOptionButton, { backgroundColor: `${themeColor}40` }]} 
              onPress={() => pickImage(true)}
            >
              <Ionicons name="camera-outline" size={24} color="#fff" />
              <Text style={styles.optionText}>Camera</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.imageOptionButton, { backgroundColor: `${themeColor}40` }]} 
              onPress={() => pickImage(false)}
            >
              <Ionicons name="image-outline" size={24} color="#fff" />
              <Text style={styles.optionText}>Gallery</Text>
            </TouchableOpacity>
          </View>
          
          {selectedImage?.assets?.[0]?.uri && (
            <View style={styles.imageContainerParent}>
              <View style={styles.imageContainer}>
                <TouchableOpacity onPress={() => setModalVisible(true)}>
                  <Image
                    source={{ uri: selectedImage.assets[0].uri }}
                    style={[styles.image, { borderColor: themeColor }]}
                  />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.clearImageButton}
                  onPress={clearImage}
                >
                  <Ionicons name="close-circle" size={20} color="#FF6347" />
                </TouchableOpacity>
              </View>
              <TextInput
                style={[styles.input, { borderColor: themeColor, backgroundColor: `${themeColor}20` }]}
                placeholder="Custom prompt (optional)..."
                placeholderTextColor="#666"
                value={prompt}
                onChangeText={setPrompt}
                multiline
              />
            </View>
          )}
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[
                styles.analyzeButton, 
                loading && styles.disabledButton,
                { backgroundColor: loading ? '#465866' : themeColor }
              ]}
              onPress={analyzeImage}
              disabled={loading || !selectedImage}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Analyzing...' : '🔍 Analyze Image'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.refreshButton, 
                !output && styles.disabledButton,
                { backgroundColor: !output ? '#465866' : themeColor }
              ]}
              onPress={() => setOutput("")}
              disabled={!output}
            >
              <Ionicons name="refresh-outline" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          
          {loading && (
            <ActivityIndicator size="large" color={themeColor} style={styles.loader} />
          )}
          
          {output && (
            <View style={[styles.outputContainer, { backgroundColor: `${themeColor}20` }]}>
              <Markdown style={markdownStyles as any}>
                {output}
              </Markdown>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Modal for Full-Screen Image (without zoom) */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity 
            style={styles.modalCloseButton} 
            onPress={() => setModalVisible(false)}
          >
            <Ionicons name="close-circle" size={36} color="#fff" />
          </TouchableOpacity>
          
          {selectedImage?.assets?.[0]?.uri && (
            <Image
              source={{ uri: selectedImage.assets[0].uri }}
              style={styles.fullScreenImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "rgb(28, 28, 28)",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
  },
  imageOptionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
  },
  imageOptionButton: {
    backgroundColor: '#2C3E50',
    padding: 15,
    borderRadius: 8,
    width: '48%',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  optionText: {
    color: '#fff',
    marginLeft: 8,
    fontSize: 16,
    fontWeight: 'bold',
  },
  imageContainerParent: {
    flexDirection: 'row-reverse',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  imageContainer: {
    position: 'relative',
  },
  image: {
    width: width * 0.14,
    height: width * 0.14,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#2980B9',
  },
  clearImageButton: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 8,
    padding: 5,
  },
  buttonContainer: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  analyzeButton: {
    backgroundColor: '#3498db',
    padding: 10,
    borderRadius: 8,
    width: '78%',
    alignItems: 'center',
  },
  refreshButton: {
    backgroundColor: '#27ae60',
    padding: 10,
    borderRadius: 8,
    width: '20%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    backgroundColor: '#465866',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  input: {
    width: '78%',
    minHeight: 50,
    borderColor: '#2980B9',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 10,
    color: '#fff',
    marginVertical: 10,
    backgroundColor: 'rgba(41, 128, 185, 0.1)',
  },
  outputContainer: {
    width: '100%',
    marginTop: 20,
    padding: 15,
    backgroundColor: 'rgba(44, 62, 80, 0.6)',
    borderRadius: 8,
  },
  loader: {
    marginTop: 20,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 1,
  },
  fullScreenImage: {
    width: '100%',
    height: '90%',
  },
});