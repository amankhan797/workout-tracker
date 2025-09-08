import React, { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
} from "react-native";
import {
  getMuscleGroups,
  getExercises,
  getAllWorkoutLogs,
} from "../../../../firebase";
// Add this import
import { useTheme } from "../../../context/ThemeContext";

interface MuscleGroup {
  id: string;
  name: string;
}

interface Exercise {
  id: string;
  name: string;
  muscleGroup: string;
}

interface WorkoutExercise {
  exercise_name: string;
  weight: string;
  reps: number;
}

interface WorkoutLog {
  id: string;
  date: string;
  muscle_group: string;
  exercises: WorkoutExercise[];
}

const PersonalRecord = forwardRef((props, ref) => {
  const [muscleGroups, setMuscleGroups] = useState<MuscleGroup[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  // Store both weight and reps for each exercise
  const [personalRecords, setPersonalRecords] = useState<{ [key: string]: { weight?: number, reps?: number } }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useImperativeHandle(ref, () => ({
    fetchData
  }));
  const muscleGroupOrder = [
    "Chest",
    "Back",
    "Shoulders",
    "Legs",
    "Biceps",
    "Triceps",
    "Abs",
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [muscleGroupsData, exercisesData, workoutLogs] = await Promise.all([
        getMuscleGroups(),
        getExercises(),
        getAllWorkoutLogs(),
      ]);

      // Sort muscle groups according to the specified order
      const sortedMuscleGroups = [...muscleGroupsData].sort((a, b) => {
        const indexA = muscleGroupOrder.indexOf(a.name);
        const indexB = muscleGroupOrder.indexOf(b.name);
        return indexA - indexB;
      });

      const muscleGroupMap = sortedMuscleGroups.reduce(
        (acc: { [key: string]: string }, group) => {
          acc[group.name] = group.id;
          return acc;
        },
        {}
      );

      const updatedExercises = exercisesData.map((exercise) => ({
        ...exercise,
        muscleGroup:
          muscleGroupMap[exercise.muscleGroup] || exercise.muscleGroup,
      }));

      setMuscleGroups(sortedMuscleGroups);
      setExercises(updatedExercises);

      // Track both max weight and max reps for each exercise
      const records: { [key: string]: { weight?: number, reps?: number } } = {};
      workoutLogs.forEach((log: WorkoutLog) => {
        if (Array.isArray(log.exercises)) {
          log.exercises.forEach((exercise: WorkoutExercise) => {
            const weight = parseFloat(exercise.weight);
            const reps = exercise.reps;
            const exerciseName = exercise.exercise_name;

            // If weight is a valid number and > 0, prioritize weight
            if (!isNaN(weight) && weight > 0) {
              if (!records[exerciseName] || (records[exerciseName].weight ?? 0) < weight) {
                records[exerciseName] = { weight, reps };
              }
            } else {
              // If no weight, track max reps
              if (!records[exerciseName] || ((records[exerciseName].weight ?? 0) === 0 && (records[exerciseName].reps ?? 0) < reps)) {
                records[exerciseName] = { reps };
              }
            }
          });
        }
      });

      setPersonalRecords(records);
    } catch (error) {
      console.error("Error fetching data:", error);
      setError("Failed to load data. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchData();
  }, []);

  // Get theme color from context
  const { themeColor } = useTheme();

  const screenWidth = Dimensions.get("window").width;
  const cardWidth = (screenWidth - 48 - 4) / 3;

  // Dynamic styles using themeColor
  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      marginTop: 8,
      borderRadius: 8,
      padding: 4,
      borderWidth: 1,
      borderColor: "#666",
      backgroundColor: "#333",
    },
    title: {
      textAlign: "center",
      color: "#fff",
      fontSize: 18,
      fontWeight: "bold",
      marginBottom: 8,
    },
    messageContainer: {
      backgroundColor: "#333",
      borderRadius: 8,
      padding: 0,
      alignItems: "center",
      width: "100%",
      marginVertical: 20,
    },
    messageText: {
      color: "#fff",
      fontSize: 16,
    },
    errorText: {
      color: "red",
      textAlign: "center",
      fontSize: 16,
    },
    muscleGroupContainer: {
      marginBottom: 16
    },
    muscleGroupTitle: {
      fontSize: 16,
      fontWeight: "bold",
      color: "#fff",
      marginBottom: 8,
    },
    cardsContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 2,
      justifyContent: "center",
    },
    card: {
      borderColor: themeColor,
      borderWidth: 1,
      backgroundColor: themeColor + '60',
      borderRadius: 8,
      padding: 8,
      minHeight: 70,
      justifyContent: "space-between",
    },
    exerciseName: {
      textAlign: "center",
      fontSize: 12,
      fontWeight: "600",
      color: "#fff",
    },
    recordText: {
      textAlign: "center",
      fontSize: 16,
      color: "#fff",
      fontWeight: "800",
    },
  });

  if (loading) {
    return (
      <View style={dynamicStyles.messageContainer}>
        <Text style={dynamicStyles.messageText}>Loading Personal Records...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={dynamicStyles.messageContainer}>
        <Text style={dynamicStyles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={dynamicStyles.container}>
      <Text style={dynamicStyles.title}>Personal Records</Text>
      {muscleGroups.map((group: MuscleGroup) => {
        const groupExercises = exercises.filter(
          (exercise: Exercise) => exercise.muscleGroup === group.id
        );

        if (groupExercises.length === 0) {
          return null;
        }

        return (
          <View key={group.id} style={dynamicStyles.muscleGroupContainer}>
            <Text style={dynamicStyles.muscleGroupTitle}>{group.name}</Text>
            <View style={dynamicStyles.cardsContainer}>
              {groupExercises.map((exercise: Exercise) => {
                const record = personalRecords[exercise.name];
                let displayValue = "0";
                let unit = "";
                if (record?.weight && record.weight > 0) {
                  displayValue = `${record.weight} kg`;
                  unit = "kg";
                } else if (record?.reps && record.reps > 0) {
                  displayValue = `${record.reps} reps`;
                  unit = "reps";
                }
                return (
                  <View
                    key={exercise.id}
                    style={[dynamicStyles.card, { width: cardWidth }]}
                  >
                    <Text style={dynamicStyles.recordText}>
                      {displayValue}
                    </Text>
                    <Text style={dynamicStyles.exerciseName} numberOfLines={2}>
                      {exercise.name}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
});
export default PersonalRecord;
