import React, { useState, useEffect } from "react";
import {
  View,
  TextInput,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  ToastAndroid,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import Toast from "react-native-toast-message";
import {
  addWorkoutLog,
  getMuscleGroups,
  getExercises,
  addMuscleGroup,
  addExercise,
} from "../../firebase";
import { SafeAreaView } from "react-native-safe-area-context";

interface Exercise {
  exercise_name: string;
  reps: number;
  weight: string;
  notes?: string;
}

interface WorkoutLog {
  date: string;
  muscle_group: string;
  exercises: Exercise[];
}

interface FirebaseExercise {
  id: string;
  name: string;
  muscleGroup: string;
}

interface MuscleGroup {
  id: string;
  name: string;
}

const WorkoutScreen = () => {
  const [muscleGroup, setMuscleGroup] = useState("");
  const [exerciseName, setExerciseName] = useState("");
  const [reps, setReps] = useState("");
  const [weight, setWeight] = useState("");
  const [muscleGroups, setMuscleGroups] = useState<MuscleGroup[]>([]);
  const [exercises, setExercises] = useState<FirebaseExercise[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [newMuscleGroup, setNewMuscleGroup] = useState("");
  const [newExerciseName, setNewExerciseName] = useState("");
  const [selectedMuscleGroupForExercise, setSelectedMuscleGroupForExercise] =useState("");
  const [notes, setNotes] = useState('');

  // Loading states
  const [isAddingLog, setIsAddingLog] = useState(false);
  const [isAddingMuscleGroup, setIsAddingMuscleGroup] = useState(false);
  const [isAddingExercise, setIsAddingExercise] = useState(false);

  const todayDate = new Date().toISOString().split("T")[0];

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

  const showToast = (
    message: string,
    type: "success" | "error" = "success"
  ) => {
    Toast.show({
      type: type,
      text1: type === "success" ? "Success" : "Error",
      text2: message,
      position: "bottom",
      visibilityTime: 3000,
    });
  };

  const filteredExercises = exercises.filter(
    (exercise) => exercise.muscleGroup === muscleGroup
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMuscleGroupsAndExercises();
    setRefreshing(false);
  };

  const fetchMuscleGroupsAndExercises = async () => {
    try {
      const fetchedMuscleGroups = await getMuscleGroups();
      const fetchedExercises = await getExercises();
      setMuscleGroups(fetchedMuscleGroups);
      setExercises(fetchedExercises);
    } catch (error) {
      console.error("Error fetching data:", error);
      showToast("Error fetching data", "error");
    }
  };

  const handleAddLog = async () => {
    if (!muscleGroup || !exerciseName || !reps || !weight) {
      showToast("Please fill in all fields", "error");
      return;
    }

    if (isAddingLog) return;

    setIsAddingLog(true);
    const logData: WorkoutLog = {
      date: todayDate,
      muscle_group: muscleGroup,
      exercises: [
        { exercise_name: exerciseName, reps: parseInt(reps), weight: weight, notes: notes },
      ],
    };

    try {
      await addWorkoutLog(logData);
      // showToast('Workout logged successfully!');
      ToastAndroid.show("Workout logged successfully!", ToastAndroid.SHORT);
      setExerciseName("");
      setReps("");
      setWeight("");
      setNotes("");
    } catch (error) {
      showToast("Error logging workout", "error");
      console.error(error);
    } finally {
      setIsAddingLog(false);
    }
  };

  const handleAddNewMuscleGroup = async () => {
    if (!newMuscleGroup.trim()) {
      showToast("Please enter a muscle group name", "error");
      return;
    }

    if (isAddingMuscleGroup) return;

    setIsAddingMuscleGroup(true);
    try {
      await addMuscleGroup(newMuscleGroup.trim());
      showToast("Muscle group added successfully!");
      setNewMuscleGroup("");
      await fetchMuscleGroupsAndExercises();
    } catch (error) {
      showToast("Error adding muscle group", "error");
      console.error(error);
    } finally {
      setIsAddingMuscleGroup(false);
    }
  };

  const handleAddNewExercise = async () => {
    if (!newExerciseName.trim() || !selectedMuscleGroupForExercise) {
      showToast("Please fill in all fields", "error");
      return;
    }

    if (isAddingExercise) return;

    setIsAddingExercise(true);
    try {
      await addExercise(newExerciseName.trim(), selectedMuscleGroupForExercise);
      showToast("Exercise added successfully!");
      setNewExerciseName("");
      setSelectedMuscleGroupForExercise("");
      await fetchMuscleGroupsAndExercises();
    } catch (error) {
      showToast("Error adding exercise", "error");
      console.error(error);
    } finally {
      setIsAddingExercise(false);
    }
  };

  useEffect(() => {
    fetchMuscleGroupsAndExercises();
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#fff"
          />
        }
      >
        {/* Add New Muscle Group Section */}
        <View>
          <Text style={styles.sectionTitle}>Add New Muscle Group</Text>
          <TextInput
            placeholder="Enter new muscle group name"
            value={newMuscleGroup}
            onChangeText={setNewMuscleGroup}
            style={styles.input}
            placeholderTextColor="rgba(255, 255, 255, 0.5)"
            editable={!isAddingMuscleGroup}
          />
          <TouchableOpacity
            style={[
              styles.button,
              (!newMuscleGroup.trim() || isAddingMuscleGroup) &&
                styles.buttonDisabled,
            ]}
            onPress={handleAddNewMuscleGroup}
            disabled={!newMuscleGroup.trim() || isAddingMuscleGroup}
          >
            {isAddingMuscleGroup ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Add Muscle Group</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        {/* Add New Exercise Section */}
        <View>
          <Text style={styles.sectionTitle}>Add New Exercise</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedMuscleGroupForExercise}
              onValueChange={setSelectedMuscleGroupForExercise}
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
              {muscleGroups.map((group) => (
                <Picker.Item
                  key={group.id}
                  label={group.name}
                  value={group.name}
                  color="#fff"
                  style={styles.pickerItem}
                />
              ))}
            </Picker>
          </View>
          <TextInput
            placeholder="Enter new exercise name"
            value={newExerciseName}
            onChangeText={setNewExerciseName}
            style={styles.input}
            placeholderTextColor="rgba(255, 255, 255, 0.5)"
            editable={!isAddingExercise}
          />
          <TouchableOpacity
            style={[
              styles.button,
              (!selectedMuscleGroupForExercise ||
                !newExerciseName.trim() ||
                isAddingExercise) &&
                styles.buttonDisabled,
            ]}
            onPress={handleAddNewExercise}
            disabled={
              !selectedMuscleGroupForExercise ||
              !newExerciseName.trim() ||
              isAddingExercise
            }
          >
            {isAddingExercise ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Add Exercise</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        {/* Log Workout Section */}
        <View>
          <Text style={styles.sectionTitle}>Log Workout</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={muscleGroup}
              onValueChange={(value) => {
                setMuscleGroup(value);
                setExerciseName("");
              }}
              style={[styles.picker, pickerStyles]}
              enabled={!isAddingLog}
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
              {muscleGroups.map((group) => (
                <Picker.Item
                  key={group.id}
                  label={group.name}
                  value={group.name}
                  color="#fff"
                  style={styles.pickerItem}
                />
              ))}
            </Picker>
          </View>

          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={exerciseName}
              onValueChange={setExerciseName}
              style={[styles.picker, pickerStyles]}
              enabled={!!muscleGroup && !isAddingLog}
              dropdownIconColor="#fff"
              mode={Platform.OS === "android" ? "dropdown" : "dialog"}
            >
              <Picker.Item
                label="Select Exercise"
                value=""
                color={
                  Platform.OS === "android"
                    ? "#fff"
                    : "rgba(255, 255, 255, 0.5)"
                }
                style={styles.pickerItem}
              />
              {filteredExercises.map((exercise) => (
                <Picker.Item
                  key={exercise.id}
                  label={exercise.name}
                  value={exercise.name}
                  color="#fff"
                  style={styles.pickerItem}
                />
              ))}
            </Picker>
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              placeholder="Reps"
              keyboardType="numeric"
              value={reps}
              onChangeText={setReps}
              style={styles.inputrepweight}
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              editable={!isAddingLog}
            />
            <TextInput
              placeholder="Weight"
              keyboardType="numeric"
              value={weight}
              onChangeText={setWeight}
              style={styles.inputrepweight}
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              editable={!isAddingLog}
            />
          </View>
          <TextInput
            placeholder="Add notes about your workout (optional)"
            value={notes}
            onChangeText={setNotes}
            style={[styles.input, styles.notesInput]}
            placeholderTextColor="rgba(255, 255, 255, 0.5)"
            editable={!isAddingLog}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
          <TouchableOpacity
            style={[
              styles.button,
              (!muscleGroup ||
                !exerciseName ||
                !reps ||
                !weight ||
                isAddingLog) &&
                styles.buttonDisabled,
            ]}
            onPress={handleAddLog}
            disabled={
              !muscleGroup || !exerciseName || !reps || !weight || isAddingLog
            }
          >
            {isAddingLog ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Add Log</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
      <Toast />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: "rgb(38, 38, 38)",
  },
  container: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 6,
    color: "#fff",
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
  inputrepweight: {
    width: "48%",
    marginBottom: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 8,
    color: "#fff",
    fontSize: 14,
  },
  notesInput: {
    height: 70,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: "#3498db",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  buttonDisabled: {
    backgroundColor: "#2c3e50",
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.46)",
    marginVertical: 16,
  },
  safeArea: {
    flex: 1,
    backgroundColor: "rgba(29, 29, 29, 1)",
  },
});

export default WorkoutScreen;
