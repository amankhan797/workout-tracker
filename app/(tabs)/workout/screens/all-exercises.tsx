import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ListRenderItem,
} from "react-native";
import BottomSheet from "@gorhom/bottom-sheet";
import { getExercises, updateExercise, deleteExercise } from "../../../../firebase";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Button } from "../../../../components/Button";
import { IconButton } from "../../../../components/IconButton";
import { useTheme } from "../../../context/ThemeContext";
import { TextInput } from "react-native";

export interface Exercise {
  id: string;
  name: string;
  muscleGroup: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Define a type-safe way to access the global variable
const getSearchQuery = (): string => {
  return (global as any).exerciseSearchQuery || "";
};

const AllExercises: React.FC = () => {
  const { themeColor } = useTheme();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [filteredExercises, setFilteredExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [bottomSheetOpen, setBottomSheetOpen] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [newName, setNewName] = useState("");
  
  const bottomSheetRef = React.useRef<BottomSheet>(null);

  useEffect(() => {
    loadExercises();
  }, []);

  // Listen for search query changes from the layout
  useEffect(() => {
    const checkSearchQuery = () => {
      const searchQuery = getSearchQuery();
      
      if (searchQuery.trim() === "") {
        setFilteredExercises(exercises);
      } else {
        const filtered = exercises.filter(
          (exercise) =>
            exercise.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            exercise.muscleGroup.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setFilteredExercises(filtered);
      }
    };

    // Check initially and set up interval to check for changes
    checkSearchQuery();
    const interval = setInterval(checkSearchQuery, 300);
    
    return () => clearInterval(interval);
  }, [exercises]);

  const loadExercises = async () => {
    try {
      const exerciseData = await getExercises();
      setExercises(exerciseData);
      setFilteredExercises(exerciseData);
    } catch (error) {
      Alert.alert("Error", "Failed to load exercises");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (exercise: Exercise) => {
    Alert.alert(
      "Delete Exercise",
      `Are you sure you want to delete ${exercise.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteExercise(exercise.id);
              await loadExercises();
              Alert.alert("Success", "Exercise deleted successfully");
            } catch (error) {
              Alert.alert("Error", "Failed to delete exercise");
            }
          },
        },
      ]
    );
  };

  const handleEdit = (exercise: Exercise) => {
    setSelectedExercise(exercise);
    setNewName(exercise.name);
    bottomSheetRef.current?.expand();
    setBottomSheetOpen(true);
  };

  const handleUpdate = async () => {
    if (!selectedExercise || !newName.trim()) {
      Alert.alert("Error", "Exercise name cannot be empty");
      return;
    }

    try {
      await updateExercise(selectedExercise.id, {
        name: newName.trim(),
      });
      bottomSheetRef.current?.close();
      setBottomSheetOpen(false);
      await loadExercises();
      Alert.alert("Success", "Exercise updated successfully");
    } catch (error) {
      Alert.alert("Error", "Failed to update exercise");
    }
  };

  const renderItem: ListRenderItem<Exercise> = ({ item }) => (
    <View style={styles.exerciseItem}>
      <View style={styles.exerciseInfo}>
        <Text style={styles.exerciseName}>{item.name}</Text>
        <Text style={styles.muscleGroup}>{item.muscleGroup}</Text>
      </View>
      <View style={styles.actions}>
        <IconButton
          name="pencil"
          size={24}
          color={themeColor}
          onPress={() => handleEdit(item)}
          style={styles.actionButton}
        />
        <IconButton
          name="trash-outline"
          size={24}
          color="#FF3B30"
          onPress={() => handleDelete(item)}
          style={styles.actionButton}
        />
      </View>
    </View>
  );

  if (loading) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={themeColor} />
        </View>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        <FlatList
          data={filteredExercises}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No exercises found</Text>
          }
        />

        <BottomSheet
          ref={bottomSheetRef}
          snapPoints={["50%"]}
          index={-1}
          enablePanDownToClose
          backgroundStyle={{ backgroundColor: "rgb(63, 63, 63)" }}
          handleIndicatorStyle={{ backgroundColor: "#666" }}
          onClose={() => {
            setBottomSheetOpen(false);
            setSelectedExercise(null);
            setNewName("");
          }}
        >
          <View style={styles.bottomSheetContent}>
            <Text style={styles.bottomSheetTitle}>Edit Exercise</Text>
            <TextInput
              style={styles.input}
              value={newName}
              onChangeText={setNewName}
              placeholder="Enter new name"
              placeholderTextColor="#999"
            />
            <View style={styles.bottomSheetActions}>
              <Button
                title="Cancel"
                variant="secondary"
                onPress={() => bottomSheetRef.current?.close()}
                style={styles.cancelButton}
                textStyle={styles.buttonText}
              />
              <Button
                title="Update"
                variant="primary"
                onPress={handleUpdate}
                style={[styles.updateButton, { backgroundColor: themeColor }]} // Dynamic theme color
                textStyle={styles.buttonText}
              />
            </View>
          </View>
        </BottomSheet>
      </View>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "rgb(38, 38, 38)",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgb(38, 38, 38)",
  },
  list: {
    padding: 16,
  },
  exerciseItem: {
    backgroundColor: "#444",
    borderWidth: 1,
    borderColor: "#666",
    borderRadius: 8,
    padding: 8,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ddd",
  },
  muscleGroup: {
    fontSize: 14,
    color: "#ccc",
    marginTop: 4,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
  emptyText: {
    textAlign: "center",
    fontSize: 16,
    color: "#666",
    marginTop: 24,
  },
  bottomSheetContent: {
    padding: 24,
    backgroundColor: "rgb(63,63,63)",
  },
  bottomSheetTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
    textAlign: "center",
    color: "#ddd",
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
    color: "#fff",
    backgroundColor: "#555",
    borderColor: "#666",
  },
  bottomSheetActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  cancelButton: {
    backgroundColor: "#FF3B30",
  },
  updateButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 8,
  },
  buttonText: {
    color: "white",
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default AllExercises;