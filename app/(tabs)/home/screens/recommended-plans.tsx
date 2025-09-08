import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TextInput,
  ToastAndroid,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BottomSheet from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Picker } from '@react-native-picker/picker';
import { getMuscleGroups, getExercises, updateWorkoutPlan, getAllWorkoutPlans, addExercise } from '../../../../firebase';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from "../../../context/ThemeContext"; // Import useTheme
import Chest from '../../../../components/muscleGroup/Chest';
import Shoulder from '../../../../components/muscleGroup/Shoulder';
import Back from '@/components/muscleGroup/Back';
import Legs from '@/components/muscleGroup/Legs';
import Biceps from '@/components/muscleGroup/Biceps';
import Abs from '@/components/muscleGroup/Abs';
import Triceps from '@/components/muscleGroup/Triceps';
import {WaveIndicator } from 'react-native-indicators';

interface Exercise {
  id: string;
  name: string;
  muscleGroup: string;
}

interface DayPlan {
  muscleGroups: string[];
  exercises: Exercise[];
}

interface WorkoutPlan {
  id: string;
  name: string;
  frequency: string;
  difficulty: string;
  schedule: {
    [key: string]: DayPlan;
  };
}

export default function RecommendedPlansScreen() {
  const router = useRouter();
  const { themeColor } = useTheme(); // Get the theme color
  const [selectedPlan, setSelectedPlan] = useState<WorkoutPlan | null>(null);
  const [muscleGroups, setMuscleGroups] = useState<string[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const params = useLocalSearchParams();

  const bottomSheetRef = useRef<BottomSheet>(null);
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [newExerciseMuscleGroup, setNewExerciseMuscleGroup] = useState('');
  const [newExerciseName, setNewExerciseName] = useState('');
  const [isAddingExercise, setIsAddingExercise] = useState(false);

  const weekDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  const pickerStyles = Platform.select({
    android: {
      color: "#fff",
      backgroundColor: "rgb(38, 38, 38)",
      dropdownIconColor: "#fff",
    },
    ios: {
      color: "#fff",
    },
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [fetchedMuscleGroups, fetchedExercises] = await Promise.all([
        getMuscleGroups(),
        getExercises()
      ]);

      const planId = params.planId as string;
      if (planId) {
        const plans = await getAllWorkoutPlans();
        const plan = plans.find(p => p.id === planId);
        if (plan) {
          setSelectedPlan(plan);
        } else {
          setError('Plan not found');
        }
      } else {
        setError('No plan ID provided');
      }

      setMuscleGroups(fetchedMuscleGroups.map(mg => mg.name));
      setExercises(fetchedExercises);
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load workout plan data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMuscleGroupToggle = (day: string, muscleGroup: string) => {
    if (!selectedPlan) return;

    const updatedPlan = { ...selectedPlan };
    const dayPlan = updatedPlan.schedule[day] || { muscleGroups: [], exercises: [] };

    if (dayPlan.muscleGroups.includes(muscleGroup)) {
      dayPlan.muscleGroups = dayPlan.muscleGroups.filter(mg => mg !== muscleGroup);
      dayPlan.exercises = dayPlan.exercises.filter(ex => ex.muscleGroup !== muscleGroup);
    } else {
      dayPlan.muscleGroups = [...dayPlan.muscleGroups, muscleGroup];
    }

    updatedPlan.schedule[day] = dayPlan;
    setSelectedPlan(updatedPlan);
  };

  const handleExerciseToggle = (day: string, exercise: Exercise) => {
    if (!selectedPlan) return;

    const updatedPlan = { ...selectedPlan };
    const dayPlan = updatedPlan.schedule[day] || { muscleGroups: [], exercises: [] };

    const exerciseIndex = dayPlan.exercises.findIndex(ex => ex.id === exercise.id);
    if (exerciseIndex >= 0) {
      dayPlan.exercises.splice(exerciseIndex, 1);
    } else {
      dayPlan.exercises.push(exercise);
    }

    updatedPlan.schedule[day] = dayPlan;
    setSelectedPlan(updatedPlan);
  };

  const handleSave = async () => {
    if (!selectedPlan || isSaving) return;

    setIsSaving(true);
    try {
      await updateWorkoutPlan(selectedPlan.id, selectedPlan);
      Alert.alert(
        'Success',
        'Workout plan updated successfully',
        [
          {
            text: 'OK',
            onPress: () => {
              router.push({
                pathname: "/home",
                params: { refresh: Date.now().toString() }
              });
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error saving plan:', error);
      Alert.alert('Error', 'Failed to save workout plan');
    } finally {
      setIsSaving(false);
    }
  };

  const openAddExerciseSheet = (day: string) => {
    setSelectedDay(day);
    setNewExerciseMuscleGroup('');
    setNewExerciseName('');
    bottomSheetRef.current?.expand();
  };

  const handleAddExercise = async () => {
    if (!newExerciseName.trim() || !newExerciseMuscleGroup || !selectedDay) {
      ToastAndroid.show('Please fill in all fields', ToastAndroid.SHORT);
      return;
    }

    if (isAddingExercise) return;

    setIsAddingExercise(true);
    try {
      const newExercise: Exercise = await addExercise(newExerciseName.trim(), newExerciseMuscleGroup);
      setExercises(prevExercises => {
        const updatedExercises = [...prevExercises, newExercise];
        return updatedExercises;
      });
      if (selectedPlan) {
        const updatedPlan = { ...selectedPlan };
        const dayPlan = updatedPlan.schedule[selectedDay] || { muscleGroups: [], exercises: [] };

        if (!dayPlan.muscleGroups.includes(newExerciseMuscleGroup)) {
          dayPlan.muscleGroups.push(newExerciseMuscleGroup);
        }

        if (!dayPlan.exercises.some(ex => ex.id === newExercise.id)) {
          dayPlan.exercises.push(newExercise);
        }

        updatedPlan.schedule[selectedDay] = dayPlan;
        setSelectedPlan(updatedPlan);
      }

      bottomSheetRef.current?.close();
      setNewExerciseName('');
      setNewExerciseMuscleGroup('');
      ToastAndroid.show('Exercise added successfully!', ToastAndroid.SHORT);
      await loadData();
    } catch (error) {
      console.error('Error adding exercise:', error);
      ToastAndroid.show('Failed to add exercise', ToastAndroid.SHORT);
    } finally {
      setIsAddingExercise(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <WaveIndicator color={themeColor} size={48} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={loadData}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }
  const renderMuscleGroupSVG = (group: string) => {
    switch (group.toLowerCase()) {
      case 'chest':
        return <Chest muscleColor={themeColor} width={24} height={24} />;
      case 'shoulders':
        return <Shoulder muscleColor={themeColor} width={24} height={24} />;
      case 'back':
        return <Back muscleColor={themeColor} width={24} height={24} />;
      case 'legs':
        return <Legs muscleColor={themeColor} width={24} height={24} />;
      case 'biceps':
        return <Biceps muscleColor={themeColor} width={24} height={24} />;
      case 'abs':
        return <Abs muscleColor={themeColor} width={24} height={24} />;
      case 'triceps':
        return <Triceps muscleColor={themeColor} width={24} height={24} />;
      default:
        return null;
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        <View style={styles.fixedHeader}>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color="#ccc" />
          </TouchableOpacity>
          <Text style={styles.editTitle}>{selectedPlan?.name || 'Workout Plan'}</Text>
          <TouchableOpacity
            onPress={handleSave}
            disabled={isSaving}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={[styles.saveButton, isSaving && styles.saveButtonDisabled, { color: themeColor }]}>
              {isSaving ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
        >
          {selectedPlan ? (
            <View style={styles.editContainer}>
              {weekDays.map((day) => (
                <View key={`day-${day}`} style={styles.dayCard}>
                  <View style={styles.dayHeader}>
                    <Text style={styles.dayTitle}>
                      {day.charAt(0).toUpperCase() + day.slice(1)}
                    </Text>
                    <TouchableOpacity
                      onPress={() => openAddExerciseSheet(day)}
                      style={styles.addButton}
                    >
                      <Ionicons name="add" size={24} color="#fff" />
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.subtitle}>Muscle Groups:</Text>
                  <View style={styles.muscleGroupsList}>
                    {muscleGroups.map((mg) => (
                      <TouchableOpacity
                        key={`${day}-muscle-${mg}`}
                        style={[
                          styles.muscleGroupItem,
                          selectedPlan.schedule[day]?.muscleGroups.includes(mg) &&
                          [styles.selectedMuscleGroup, { backgroundColor: themeColor }]
                        ]}
                        onPress={() => handleMuscleGroupToggle(day, mg)}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          {renderMuscleGroupSVG(mg)}
                          <Text
                            style={[
                              styles.muscleGroupText,
                              selectedPlan.schedule[day]?.muscleGroups.includes(mg) &&
                              styles.selectedText
                            ]}
                          >
                            {mg}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.subtitle}>Exercises:</Text>
                  <View style={styles.exercisesList}>
                    {exercises
                      .filter(ex => selectedPlan.schedule[day]?.muscleGroups.includes(ex.muscleGroup))
                      .map((exercise) => (
                        <TouchableOpacity
                          key={`${day}-exercise-${exercise.id}`}
                          style={[
                            styles.exerciseItem,
                            selectedPlan.schedule[day]?.exercises.some(e => e.id === exercise.id) &&
                            [styles.selectedExercise, { backgroundColor: themeColor }]
                          ]}
                          onPress={() => handleExerciseToggle(day, exercise)}
                        >
                          <Text
                            style={[
                              styles.exerciseText,
                              selectedPlan.schedule[day]?.exercises.some(e => e.id === exercise.id) &&
                              styles.selectedText
                            ]}
                          >
                            {exercise.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>No plan selected</Text>
              <TouchableOpacity
                style={[styles.retryButton, { backgroundColor: themeColor }]}
                onPress={() => router.back()}
              >
                <Text style={styles.retryButtonText}>Go Back</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        <BottomSheet
          ref={bottomSheetRef}
          index={-1}
          snapPoints={['50%']} // Increased height to accommodate keyboard
          enablePanDownToClose
          backgroundStyle={{ backgroundColor: 'rgb(38, 38, 38)' }}
          handleIndicatorStyle={{ backgroundColor: '#fff' }}
          keyboardBehavior="extend" // Makes bottom sheet extend with keyboard
          keyboardBlurBehavior="restore"
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.bottomSheetContent}
          >
            <Text style={styles.bottomSheetTitle}>Add New Exercise</Text>

            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={newExerciseMuscleGroup}
                onValueChange={setNewExerciseMuscleGroup}
                style={[styles.picker, pickerStyles]}
                enabled={!isAddingExercise}
                dropdownIconColor="#fff"
                mode={Platform.OS === "android" ? "dropdown" : "dialog"}
              >
                <Picker.Item
                  label="Select Muscle Group"
                  value=""
                  color={
                    Platform.OS === "android"
                      ? "#fff"
                      : "rgba(255, 255, 255, 0.5)"
                  }
                  style={styles.pickerItem}
                />
                {muscleGroups.map((mg) => (
                  <Picker.Item key={mg} label={mg} value={mg} style={styles.pickerItem} />
                ))}
              </Picker>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Exercise Name"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              value={newExerciseName}
              onChangeText={setNewExerciseName}
              editable={!isAddingExercise}
            />

            <TouchableOpacity
              style={[
                styles.saveExerciseButton,
                (!newExerciseName.trim() || !newExerciseMuscleGroup || isAddingExercise) &&
                styles.buttonDisabled,
                { backgroundColor: !newExerciseName.trim() || !newExerciseMuscleGroup || isAddingExercise ? '#666' : themeColor }
              ]}
              onPress={handleAddExercise}
              disabled={!newExerciseName.trim() || !newExerciseMuscleGroup || isAddingExercise}
            >
              {isAddingExercise ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Add Exercise</Text>
              )}
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </BottomSheet>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#rgb(38, 38, 38)',
  },
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#rgb(38, 38, 38)',
    zIndex: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 70,
    paddingBottom: 20,
  },
  editContainer: {
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgb(38, 38, 38)',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  editTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ccc',
  },
  retryButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    color: '#3B82F6',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  dayCard: {
    backgroundColor: '#444',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dayTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ccc',
  },
  addButton: {
    padding: 4,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ccc',
    marginTop: 12,
    marginBottom: 8,
  },
  muscleGroupsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  muscleGroupItem: {
    backgroundColor: '#555',
    borderRadius: 8,
    padding: 8,
  },
  selectedMuscleGroup: {
    backgroundColor: '#3498db',
  },
  muscleGroupText: {
    color: '#fff',
    fontSize: 14,
  },
  exercisesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  exerciseItem: {
    backgroundColor: '#555',
    borderRadius: 8,
    padding: 8,
  },
  selectedExercise: {
    backgroundColor: '#3498db',
  },
  exerciseText: {
    color: '#fff',
    fontSize: 14,
  },
  selectedText: {
    color: 'white',
  },
  loadingText: {
    marginTop: 10,
    color: '#ccc',
    fontSize: 16,
  },
  bottomSheetContent: {
    padding: 16,
    flex: 1,
  },
  bottomSheetTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  saveExerciseButton: {
    backgroundColor: '#3498db',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#666',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  input: {
    marginBottom: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 8,
    color: "#fff",
    fontSize: 14,
  },
  pickerContainer: {
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    overflow: "hidden",
  },
  picker: {
    color: "#fff",
  },
  pickerItem: {
    backgroundColor: "rgb(38, 38, 38)",
    color: "#fff",
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
});