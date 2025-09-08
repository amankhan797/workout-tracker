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
  Vibration,
  Modal,
  Image,
  Dimensions,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { Audio } from "expo-av";
import {
  addWorkoutLog,
  getMuscleGroups,
  getExercises,
  addMuscleGroup,
  addExercise,
  getAllWorkoutLogs,
} from "../../../firebase";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
// Import the Button and IconButton components from your components directory
// Assuming these components exist in your project
import { Button } from "../../../components/Button";
import { IconButton } from "../../../components/IconButton";
import { useTheme } from "@/app/context/ThemeContext";

interface Exercise {
  exercise_name: string;
  sets: {
    set_number: number;
    reps: number;
    weight: string;
  }[];
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
  const { themeColor } = useTheme();
  const [sets, setSets] = useState("");
  const [setDetails, setSetDetails] = useState<{ reps: string; weight: string }[]>([]);
  const [muscleGroup, setMuscleGroup] = useState("");
  const [exerciseName, setExerciseName] = useState("");
  const [muscleGroups, setMuscleGroups] = useState<MuscleGroup[]>([]);
  const [exercises, setExercises] = useState<FirebaseExercise[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [newMuscleGroup, setNewMuscleGroup] = useState("");
  const [newExerciseName, setNewExerciseName] = useState("");
  const [selectedMuscleGroupForExercise, setSelectedMuscleGroupForExercise] = useState("");
  const [notes, setNotes] = useState("");
  const [isAddingLog, setIsAddingLog] = useState(false);
  const [isAddingMuscleGroup, setIsAddingMuscleGroup] = useState(false);
  const [isAddingExercise, setIsAddingExercise] = useState(false);
  const [showPRModal, setShowPRModal] = useState(false);
  const [personalRecords, setPersonalRecords] = useState<{ [key: string]: number }>({});
  const [prExerciseName, setPrExerciseName] = useState("");
  const [prMaxWeight, setPrMaxWeight] = useState(0);

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

  const showToast = (message: string, type: "success" | "error" = "success") => {
    if (Platform.OS === "android") {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      // For iOS, you could implement an alternative notification
      // or use a third-party library
      console.log(message);
    }
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
      const workoutLogs = await getAllWorkoutLogs();

      setMuscleGroups(fetchedMuscleGroups);
      setExercises(fetchedExercises);

      // Calculate personal records
      const records: { [key: string]: number } = {};
      
      // Check if workoutLogs exists and is an array before using forEach
      if (workoutLogs && Array.isArray(workoutLogs)) {
        workoutLogs.forEach((log: WorkoutLog) => {
          if (log && Array.isArray(log.exercises)) {
            log.exercises.forEach((exercise: Exercise) => {
              if (exercise && Array.isArray(exercise.sets)) {
                exercise.sets.forEach((set) => {
                  const weight = parseFloat(set.weight) || 0;
                  const exerciseName = exercise.exercise_name;
                  if (!records[exerciseName] || weight > records[exerciseName]) {
                    records[exerciseName] = weight;
                  }
                });
              }
            });
          }
        });
      }
      
      setPersonalRecords(records);
    } catch (error) {
      console.error("Error fetching data:", error);
      showToast("Error fetching data", "error");
    }
  };

  const handleSetsChange = (value: string) => {
    const numSets = parseInt(value) || 0;
    setSets(value);
    setSetDetails(
      Array.from({ length: numSets }, () => ({ reps: "", weight: "" }))
    );
  };

  const handleSetDetailChange = (
    index: number,
    field: "reps" | "weight",
    value: string
  ) => {
    const newSetDetails = [...setDetails];
    newSetDetails[index][field] = value;
    setSetDetails(newSetDetails);
  };

  const playCelebrationSound = async () => {
    if (Platform.OS === "web") {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // A4 note
      oscillator.connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.5); // Play for 0.5 seconds
    } else {
      const { sound } = await Audio.Sound.createAsync(
        require("../../../assets/audio/PR_AUDIO.mp3") // Add a celebration sound file to your assets
      );
      await sound.playAsync();
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
        }
      });
    }
  };

  const handleAddLog = async () => {
    if (
      !muscleGroup ||
      !exerciseName ||
      !sets ||
      setDetails.some((set) => !set.reps || !set.weight)
    ) {
      showToast("Please fill in all fields", "error");
      return;
    }

    if (isAddingLog) return;

    setIsAddingLog(true);
    const logData: WorkoutLog = {
      date: todayDate,
      muscle_group: muscleGroup,
      exercises: [
        {
          exercise_name: exerciseName,
          sets: setDetails.map((set, index) => ({
            set_number: index + 1,
            reps: parseInt(set.reps),
            weight: set.weight,
          })),
          notes: notes,
        },
      ],
    };

    try {
      const maxWeight = Math.max(
        ...setDetails.map((set) => parseFloat(set.weight) || 0)
      );
      const currentPR = personalRecords[exerciseName] || 0;

      await addWorkoutLog(logData);
      showToast("Workout logged successfully!", "success");

      // Check if this is a new PR
      if (maxWeight > currentPR) {
        setPersonalRecords((prev) => ({
          ...prev,
          [exerciseName]: maxWeight,
        }));
        setPrExerciseName(exerciseName);
        setPrMaxWeight(maxWeight);
        setShowPRModal(true);
        Vibration.vibrate([0, 500, 200, 500]); // Vibration pattern
        await playCelebrationSound();
      }

      setExerciseName("");
      setSets("");
      setSetDetails([]);
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
            colors={[themeColor]}
            tintColor="#fff"
            progressBackgroundColor="rgb(38, 38, 38)"
          />
        }
      >
        {/* Log Workout Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Log Workout</Text>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Muscle Group</Text>
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
          </View>

          {muscleGroup && (
            <View style={styles.formGroup}>
              <Text style={styles.label}>Exercise</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={exerciseName}
                  onValueChange={setExerciseName}
                  style={[styles.picker, pickerStyles]}
                  enabled={!isAddingLog}
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
            </View>
          )}

          {exerciseName && (
            <>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Number of Sets</Text>
                <TextInput
                  placeholder="Enter Sets (1-9)"
                  keyboardType="numeric"
                  value={sets}
                  maxLength={1}
                  onChangeText={handleSetsChange}
                  style={styles.input}
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  editable={!isAddingLog}
                />
              </View>

              {setDetails.map((set, index) => (
                <View key={index} style={styles.setContainer}>
                  <Text style={styles.setLabel}>Set {index + 1}</Text>
                  <View style={styles.setInputContainer}>
                    <TextInput
                      placeholder="Reps"
                      keyboardType="numeric"
                      value={set.reps}
                      onChangeText={(value) => handleSetDetailChange(index, "reps", value)}
                      style={styles.setInput}
                      placeholderTextColor="rgba(255, 255, 255, 0.5)"
                      editable={!isAddingLog}
                    />
                    <TextInput
                      placeholder="Weight"
                      keyboardType="numeric"
                      value={set.weight}
                      onChangeText={(value) => handleSetDetailChange(index, "weight", value)}
                      style={styles.setInput}
                      placeholderTextColor="rgba(255, 255, 255, 0.5)"
                      editable={!isAddingLog}
                    />
                  </View>
                </View>
              ))}

              <View style={styles.formGroup}>
                <Text style={styles.label}>Notes (Optional)</Text>
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
              </View>

              <Button
                title="Add Log"
                variant="primary"
                isLoading={isAddingLog}
                onPress={handleAddLog}
                icon="add-circle"
                style={[styles.addButton, { backgroundColor: themeColor }]}
                disabled={
                  !muscleGroup ||
                  !exerciseName ||
                  !sets ||
                  setDetails.some((set) => !set.reps || !set.weight) ||
                  isAddingLog
                }
              />
            </>
          )}
        </View>

        <View style={styles.divider} />

        {/* Add New Muscle Group Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Muscle Groups</Text>
            <Button
              title="View All"
              variant="outline"
              onPress={() => router.push("/workout/screens/all-muscle-groups")}
              icon="list"
              iconPosition="right"
              style={[styles.viewAllButton, { borderColor: themeColor, color: themeColor }]}
              textStyle={{ color: themeColor }}
              iconColor={themeColor}
            />
          </View>
          <View style={styles.formGroup}>
            <TextInput
              placeholder="Enter new muscle group name"
              value={newMuscleGroup}
              onChangeText={setNewMuscleGroup}
              style={styles.input}
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              editable={!isAddingMuscleGroup}
            />
            <Button
              title="Add"
              variant="primary"
              isLoading={isAddingMuscleGroup}
              onPress={handleAddNewMuscleGroup}
              style={[styles.addButton, { backgroundColor: themeColor }]}
              disabled={!newMuscleGroup.trim() || isAddingMuscleGroup}
            />
          </View>
        </View>

        <View style={styles.divider} />

        {/* Add New Exercise Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Exercises</Text>
            <Button
              title="View All"
              variant="outline"
              onPress={() => router.push("/workout/screens/all-exercises")}
              icon="list"
              iconPosition="right"
              style={[styles.viewAllButton, { borderColor: themeColor, color: themeColor }]}
              textStyle={{ color: themeColor }}
              iconColor={themeColor}
            />
          </View>
          <View style={styles.formGroup}>
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
          </View>
          <View style={styles.formGroup}>
            <TextInput
              placeholder="Enter new exercise name"
              value={newExerciseName}
              onChangeText={setNewExerciseName}
              style={styles.input}
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              editable={!isAddingExercise}
            />
            <Button
              title="Add"
              variant="primary"
              isLoading={isAddingExercise}
              onPress={handleAddNewExercise}
              style={[styles.addButton, { backgroundColor: themeColor }]}
              disabled={
                !selectedMuscleGroupForExercise ||
                !newExerciseName.trim() ||
                isAddingExercise
              }
            />
          </View>
        </View>
      </ScrollView>

      {/* PR Celebration Modal */}
      <Modal
        visible={showPRModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPRModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { borderColor: themeColor }]}>
            <Text style={styles.modalTitle}>New Personal Record! 🎉</Text>
            <Image
              source={require("../../../assets/images/PR_IMG2.png")}
              style={styles.modalBackgroundImage}
              resizeMode="cover"
            />
            <View style={styles.modalContent}>
              <Text style={styles.modalText}>
                Congratulations! You've set a new PR for {prExerciseName}:
              </Text>
              <Text style={[styles.prWeight, { color: themeColor }]}>{prMaxWeight} kg</Text>
              <Button
                title="Awesome!"
                variant="primary"
                onPress={() => setShowPRModal(false)}
                style={[styles.modalButton, { backgroundColor: themeColor }]}
              />
            </View>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowPRModal(false)}
            >
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const { width, height } = Dimensions.get("window");

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: "rgb(38, 38, 38)",
  },
  container: {
    padding: 16,
  },
  safeArea: {
    flex: 1,
    backgroundColor: "rgba(29, 29, 29, 1)",
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#fff",
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    color: "#fff",
    marginBottom: 6,
    fontSize: 14,
  },
  input: {
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 8,
    color: "#fff",
    fontSize: 14,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  pickerContainer: {
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
  setContainer: {
    marginBottom: 15,
  },
  setLabel: {
    color: "#fff",
    fontSize: 14,
    marginBottom: 6,
  },
  setInputContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  setInput: {
    width: "48%",
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 8,
    color: "#fff",
    fontSize: 14,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  notesInput: {
    height: 80,
    textAlignVertical: "top",
  },
  addButton: {
    marginTop: 8,
  },
  viewAllButton: {
    minWidth: 100,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.46)",
    marginVertical: 20,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: width * 0.85,
    backgroundColor: "rgb(38, 38, 38)",
    borderRadius: 8,
    borderColor: "#3498db",
    borderWidth: 2,
    overflow: "hidden",
    position: "relative",
  },
  modalBackgroundImage: {
    position: "absolute",
    width: "100%",
    height: "100%",
    opacity: 0.2,
  },
  modalContent: {
    padding: 20,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
    marginVertical: 10,
  },
  modalText: {
    fontSize: 16,
    color: "#fff",
    textAlign: "center",
    marginBottom: 10,
  },
  prWeight: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#f1c40f",
    marginVertical: 10,
  },
  modalButton: {
    marginTop: 15,
    minWidth: 150,
  },
  modalCloseButton: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  closeButtonText: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold",
  },
});

export default WorkoutScreen;