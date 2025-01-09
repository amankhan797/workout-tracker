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
  const [personalRecords, setPersonalRecords] = useState<{ [key: string]: number }>({});
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

      const records: { [key: string]: number } = {};
      workoutLogs.forEach((log: WorkoutLog) => {
        if (Array.isArray(log.exercises)) {
          log.exercises.forEach((exercise: WorkoutExercise) => {
            const weight = parseFloat(exercise.weight) || 0;
            const exerciseName = exercise.exercise_name;

            if (!records[exerciseName] || weight > records[exerciseName]) {
              records[exerciseName] = weight;
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

  const screenWidth = Dimensions.get("window").width;
  const cardWidth = (screenWidth - 48 - 4) / 3;

  if (loading) {
    return (
      <View style={styles.messageContainer}>
        <Text style={styles.messageText}>Loading Personal Records...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.messageContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Personal Records</Text>
      {muscleGroups.map((group: MuscleGroup) => {
        const groupExercises = exercises.filter(
          (exercise: Exercise) => exercise.muscleGroup === group.id
        );

        if (groupExercises.length === 0) {
          return null;
        }

        return (
          <View key={group.id} style={styles.muscleGroupContainer}>
            <Text style={styles.muscleGroupTitle}>{group.name}</Text>
            <View style={styles.cardsContainer}>
              {groupExercises.map((exercise: Exercise) => (
                <View
                  key={exercise.id}
                  style={[styles.card, { width: cardWidth }]}
                >
                  <Text style={styles.recordText}>
                    {personalRecords[exercise.name] || 0} kg
                  </Text>
                  <Text style={styles.exerciseName} numberOfLines={2}>
                    {exercise.name}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
});
export default PersonalRecord;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: 8,
    borderRadius: 8,
    padding: 8,
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
    padding: 20,
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
    marginBottom: 16,
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
    justifyContent: "flex-start",
    gap: 2,
  },
  card: {
    backgroundColor: "#3498db",
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
