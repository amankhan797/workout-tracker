import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  SafeAreaView,
  ToastAndroid,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import BottomSheet from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Picker } from '@react-native-picker/picker';
import {
  getMuscleGroups,
  getExercises,
  createWorkoutPlan,
  addExercise
} from "../../../../firebase";
import { useRouter } from "expo-router";
import { useTheme } from "../../../context/ThemeContext"; // Import useTheme
import Chest from '../../../../components/muscleGroup/Chest';
import Shoulder from '../../../../components/muscleGroup/Shoulder';
import Back from '@/components/muscleGroup/Back';
import Legs from '@/components/muscleGroup/Legs';
import Biceps from '@/components/muscleGroup/Biceps';
import Abs from '@/components/muscleGroup/Abs';
import Triceps from '@/components/muscleGroup/Triceps';

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
  name: string;
  frequency: string;
  schedule: {
    [key: string]: DayPlan;
  };
}

export default function CustomPlanScreen() {
  const router = useRouter();
  const { themeColor } = useTheme(); // Get the theme color
  const [muscleGroups, setMuscleGroups] = useState<string[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [planName, setPlanName] = useState("");
  const [frequency, setFrequency] = useState("");
  const [schedule, setSchedule] = useState<{ [key: string]: DayPlan }>({});
  const [isSaving, setIsSaving] = useState(false);

  // Bottom Sheet states
  const bottomSheetRef = useRef<BottomSheet>(null);
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [newExerciseMuscleGroup, setNewExerciseMuscleGroup] = useState('');
  const [newExerciseName, setNewExerciseName] = useState('');
  const [isAddingExercise, setIsAddingExercise] = useState(false);

  const weekDays = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [fetchedMuscleGroups, fetchedExercises] = await Promise.all([
        getMuscleGroups(),
        getExercises(),
      ]);
      setMuscleGroups(fetchedMuscleGroups.map((mg) => mg.name));
      setExercises(fetchedExercises);
    } catch (error) {
      console.error("Error loading data:", error);
      ToastAndroid.show("Failed to load data", ToastAndroid.SHORT);
    }
  };


  const handleMuscleGroupToggle = (day: string, muscleGroup: string) => {
    setSchedule((prevSchedule) => {
      const updatedSchedule = { ...prevSchedule };
      const dayPlan = updatedSchedule[day] || {
        muscleGroups: [],
        exercises: [],
      };

      if (dayPlan.muscleGroups.includes(muscleGroup)) {
        dayPlan.muscleGroups = dayPlan.muscleGroups.filter(
          (mg) => mg !== muscleGroup
        );
        dayPlan.exercises = dayPlan.exercises.filter(
          (ex) => ex.muscleGroup !== muscleGroup
        );
      } else {
        dayPlan.muscleGroups = [...dayPlan.muscleGroups, muscleGroup];
      }

      updatedSchedule[day] = dayPlan;
      return updatedSchedule;
    });
  };

  const handleExerciseToggle = (day: string, exercise: Exercise) => {
    setSchedule((prevSchedule) => {
      const updatedSchedule = { ...prevSchedule };
      const dayPlan = updatedSchedule[day] || {
        muscleGroups: [],
        exercises: [],
      };

      const exerciseIndex = dayPlan.exercises.findIndex(
        (ex) => ex.id === exercise.id
      );
      if (exerciseIndex >= 0) {
        dayPlan.exercises.splice(exerciseIndex, 1);
      } else {
        dayPlan.exercises.push(exercise);
      }

      updatedSchedule[day] = dayPlan;
      return updatedSchedule;
    });
  };

  const calculateFrequency = (): string => {
    const activeDays = Object.values(schedule).filter(
      (day) => day.muscleGroups.length > 0
    ).length;
    return `${activeDays} days/week`;
  };

  const handleSave = async () => {
    if (isSaving) return;

    if (!planName.trim()) {
      ToastAndroid.show("Please enter a plan name", ToastAndroid.SHORT);
      return;
    }

    const activeDays = Object.values(schedule).filter(
      (day) => day.muscleGroups.length > 0
    ).length;

    if (activeDays === 0) {
      ToastAndroid.show("Please add at least one workout day", ToastAndroid.SHORT);
      return;
    }

    setIsSaving(true);
    try {
      const planData: WorkoutPlan = {
        name: planName,
        frequency: calculateFrequency(),
        schedule,
      };

      await createWorkoutPlan(planData);
      ToastAndroid.show("Workout plan created successfully", ToastAndroid.SHORT);
      router.push({
        pathname: "/home",
        params: { refresh: Date.now().toString() }
      });
    } catch (error) {
      console.error("Error saving plan:", error);
      ToastAndroid.show("Failed to save workout plan", ToastAndroid.SHORT);
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

      setSchedule(prevSchedule => {
        const updatedSchedule = { ...prevSchedule };
        const dayPlan = updatedSchedule[selectedDay] || { muscleGroups: [], exercises: [] };

        if (!dayPlan.muscleGroups.includes(newExerciseMuscleGroup)) {
          dayPlan.muscleGroups.push(newExerciseMuscleGroup);
        }

        if (!dayPlan.exercises.some(ex => ex.id === newExercise.id)) {
          dayPlan.exercises.push(newExercise);
        }

        updatedSchedule[selectedDay] = dayPlan;
        return updatedSchedule;
      });

      bottomSheetRef.current?.close();
      setNewExerciseName('');
      setNewExerciseMuscleGroup('');
      ToastAndroid.show('Exercise added successfully!', ToastAndroid.SHORT);

      await loadData(); // Refresh the page
    } catch (error) {
      console.error('Error adding exercise:', error);
      ToastAndroid.show('Failed to add exercise', ToastAndroid.SHORT);
    } finally {
      setIsAddingExercise(false);
    }
  };

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
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => router.back()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="arrow-back" size={24} color="#ccc" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Create Custom Plan</Text>
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

          <ScrollView style={styles.scrollContent}>
            <View style={styles.formSection}>
              <TextInput
                style={styles.input}
                placeholder="Plan Name"
                placeholderTextColor="#666"
                value={planName}
                onChangeText={setPlanName}
              />
            </View>

            {weekDays.map((day) => {
              const dayPlan = schedule[day] || { muscleGroups: [], exercises: [] };
              return (
                <View key={day} style={styles.dayCard}>
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
                        key={`${day}-${mg}`}
                        style={[
                          styles.muscleGroupItem,
                          dayPlan.muscleGroups.includes(mg) && [styles.selectedMuscleGroup, { backgroundColor: themeColor }],
                        ]}
                        onPress={() => handleMuscleGroupToggle(day, mg)}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          {renderMuscleGroupSVG(mg)}
                          <Text style={[
                            styles.muscleGroupText,
                            dayPlan.muscleGroups.includes(mg) && styles.selectedText
                          ]}>
                            {mg}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.subtitle}>Exercises:</Text>
                  <View style={styles.exercisesList}>
                    {exercises
                      .filter((ex) => dayPlan.muscleGroups.includes(ex.muscleGroup))
                      .map((exercise) => (
                        <TouchableOpacity
                          key={`${day}-exercise-${exercise.id}`}
                          style={[
                            styles.exerciseItem,
                            dayPlan.exercises.some((e) => e.id === exercise.id) &&
                            [styles.selectedExercise, { backgroundColor: themeColor }],
                          ]}
                          onPress={() => handleExerciseToggle(day, exercise)}
                        >
                          <Text style={[
                            styles.exerciseText,
                            dayPlan.exercises.some((e) => e.id === exercise.id) &&
                            styles.selectedText
                          ]}>
                            {exercise.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                  </View>
                </View>
              );
            })}
          </ScrollView>

          <BottomSheet
            ref={bottomSheetRef}
            index={-1}
            snapPoints={['50%']}
            enablePanDownToClose
            backgroundStyle={{ backgroundColor: '#444' }}
            handleIndicatorStyle={{ backgroundColor: '#fff' }}
            keyboardBehavior="extend"
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
                  style={styles.picker}
                  enabled={!isAddingExercise}
                >
                  <Picker.Item label="Select Muscle Group" value="" />
                  {muscleGroups.map((mg) => (
                    <Picker.Item key={mg} label={mg} value={mg} />
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
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'rgb(38, 38, 38)',
  },
  container: {
    flex: 1,
    backgroundColor: 'rgb(38, 38, 38)',
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: 'rgb(38, 38, 38)',
    borderBottomWidth: 1,
    borderBottomColor: "#333",
    zIndex: 1,
  },
  scrollContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#ccc",
  },
  saveButton: {
    color: "#3B82F6",
    fontSize: 16,
    fontWeight: "600",
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  formSection: {
    padding: 16,
    backgroundColor: '#444',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: "#555",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#ccc",
    backgroundColor: "#333",
  },
  dayCard: {
    backgroundColor: "#444",
    borderRadius: 8,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: "#000",
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
    fontWeight: "600",
    color: "#ccc",
  },
  addButton: {
    padding: 4,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#ccc",
    marginTop: 12,
    marginBottom: 8,
  },
  muscleGroupsList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  muscleGroupItem: {
    backgroundColor: "#555",
    borderRadius: 8,
    padding: 8,
  },
  selectedMuscleGroup: {
    backgroundColor: "#3498db",
  },
  muscleGroupText: {
    color: "#ccc",
    fontSize: 14,
  },
  exercisesList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  exerciseItem: {
    backgroundColor: "#555",
    borderRadius: 8,
    padding: 8,
  },
  selectedExercise: {
    backgroundColor: "#3498db",
  },
  exerciseText: {
    color: "#ccc",
    fontSize: 14,
  },
  selectedText: {
    color: "white",
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
  pickerContainer: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 12,
  },
  picker: {
    color: '#fff',
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
});