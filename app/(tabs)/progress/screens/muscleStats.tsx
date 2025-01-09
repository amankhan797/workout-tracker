import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, ActivityIndicator, ToastAndroid, Platform } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Picker } from '@react-native-picker/picker';
import { getMuscleGroups, getExercises, getAllWorkoutLogs } from '../../../../firebase.js';

interface MuscleGroup {
  id: string;
  name: string;
}

interface Exercise {
  id: string;
  name: string;
  muscleGroup: string;
}

interface WorkoutLog {
  id: string;
  date: string;
  muscle_group: string;
  exercises: Array<{
    exercise_name: string;
    weight: string | number;
    reps: number;
  }>;
}

interface ChartData {
  labels: string[];
  datasets: {
    data: number[];
    color: (opacity: number) => string;
    strokeWidth: number;
  }[];
  legend: string[];
}

const MuscleStats: React.FC = () => {
  const [muscleGroups, setMuscleGroups] = useState<MuscleGroup[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedMuscle, setSelectedMuscle] = useState<string>('');
  const [selectedExercise, setSelectedExercise] = useState<string>('');
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

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

  const emptyChartData: ChartData = {
    labels: ['Start'],
    datasets: [
      {
        data: [0],
        color: (opacity = 1) => `rgba(134, 65, 244, ${opacity})`,
        strokeWidth: 2,
      },
      {
        data: [0],
        color: (opacity = 1) => `rgba(255, 0, 0, ${opacity})`,
        strokeWidth: 2,
      },
    ],
    legend: ['Weight (kg)', 'Reps'],
  };

  useEffect(() => {
    loadMuscleGroups();
  }, []);

  useEffect(() => {
    if (selectedMuscle) {
      loadExercises();
      setSelectedExercise('');
    }
  }, [selectedMuscle]);

  useEffect(() => {
    if (selectedExercise) {
      loadWorkoutData();
    } else {
      setChartData(emptyChartData);
    }
  }, [selectedExercise]);

  const loadMuscleGroups = async () => {
    setLoading(true);
    try {
      const groups = await getMuscleGroups();
      
      if (!groups || groups.length === 0) {
        setError('No muscle groups available');
        return;
      }

      setMuscleGroups(groups);
      setError(null);
    } catch (error) {
      setError('Failed to load muscle groups');
    } finally {
      setLoading(false);
    }
  };

  const loadExercises = async () => {
    setLoading(true);
    try {
      const selectedGroup = muscleGroups.find(group => group.id === selectedMuscle);
      
      if (!selectedGroup) {
        setError('Selected muscle group not found');
        return;
      }

      const exerciseList = await getExercises();
      const filteredExercises = exerciseList.filter(
        exercise => exercise.muscleGroup.toLowerCase() === selectedGroup.name.toLowerCase()
      );

      if (filteredExercises.length === 0) {
        setError('No exercises available for this muscle group');
        return;
      }

      setExercises(filteredExercises);
      setError(null);
    } catch (error) {
      setError('Failed to load exercises');
    } finally {
      setLoading(false);
    }
  };

  const loadWorkoutData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const selectedExerciseData = exercises.find(ex => ex.id === selectedExercise);
      if (!selectedExerciseData) {
        throw new Error('Selected exercise not found');
      }

      const logs: WorkoutLog[] = await getAllWorkoutLogs();
      
      const exerciseLogs = logs
        .reduce((acc: Array<{date: string; weight: number; reps: number}>, log) => {
          const matchingExercise = log.exercises.find(
            ex => ex.exercise_name.toLowerCase() === selectedExerciseData.name.toLowerCase()
          );
          
          if (matchingExercise) {
            acc.push({
              date: log.date,
              weight: Number(matchingExercise.weight),
              reps: matchingExercise.reps
            });
          }
          return acc;
        }, [])
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      if (exerciseLogs.length === 0) {
        setChartData(emptyChartData);
        return;
      }

      const startDate = new Date(exerciseLogs[0].date);
      startDate.setDate(startDate.getDate() - 1);
      
      const labels = ['Start', ...exerciseLogs.map(log => {
        const date = new Date(log.date);
        return `${date.getDate()}/${date.getMonth() + 1}`;
      })];

      const weights = [0, ...exerciseLogs.map(log => log.weight)];
      const reps = [0, ...exerciseLogs.map(log => log.reps)];

      setChartData({
        labels,
        datasets: [
          {
            data: weights,
            color: (opacity = 1) => `rgba(134, 65, 244, ${opacity})`,
            strokeWidth: 2,
          },
          {
            data: reps,
            color: (opacity = 1) => `rgba(255, 0, 0, ${opacity})`,
            strokeWidth: 2,
          },
        ],
        legend: ['Weight (kg)', 'Reps'],
      });
      
    } catch (error) {
      setError('Failed to load workout data');
      setChartData(emptyChartData);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {error && <Text style={styles.errorText}>{error}</Text>}
      
      <LineChart
        data={chartData || emptyChartData}
        width={Dimensions.get('window').width - 20}
        height={220}
        chartConfig={{
          backgroundColor: '#333',
          backgroundGradientFrom: '#333',
          backgroundGradientTo: '#333',
          decimalPlaces: 1,
          color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
          style: {
            borderRadius: 16,
          },
          propsForDots: {
            r: "4",
            strokeWidth: "2",
            stroke: "#ffa726"
          }
        }}
        bezier
        style={styles.chart}
        fromZero={true}
        yAxisInterval={5}
      />

      {loading && (
        <ActivityIndicator size="large" color="#3498db" style={styles.loader} />
      )}

      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={selectedMuscle}
          onValueChange={(itemValue: string) => setSelectedMuscle(itemValue)}
          style={[styles.picker, pickerStyles]}
          dropdownIconColor="#fff"
          mode={Platform.OS === "android" ? "dropdown" : "dialog"}
        >
          <Picker.Item
            label="Select Muscle Group"
            value=""
            color={Platform.OS === "android" ? "#fff" : "rgba(255, 255, 255, 0.5)"}
            style={styles.pickerItem}
          />
          {muscleGroups.map((group) => (
            <Picker.Item
              key={group.id}
              label={group.name}
              value={group.id}
              color="#fff"
              style={styles.pickerItem}
            />
          ))}
        </Picker>
      </View>

      <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedExercise}
            onValueChange={(itemValue: string) => setSelectedExercise(itemValue)}
            style={[styles.picker, pickerStyles]}
            enabled={!!selectedMuscle}
            dropdownIconColor="#fff"
            mode={Platform.OS === "android" ? "dropdown" : "dialog"}
          >
            <Picker.Item
              label="Select Exercise"
              value=""
              color={Platform.OS === "android" ? "#fff" : "rgba(255, 255, 255, 0.5)"}
              style={styles.pickerItem}
            />
            {exercises.map((exercise) => (
              <Picker.Item
                key={exercise.id}
                label={exercise.name}
                value={exercise.id}
                color="#fff"
                style={styles.pickerItem}
              />
            ))}
          </Picker>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    backgroundColor: '#333',
    paddingHorizontal: 4,
    borderRadius: 8,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  pickerContainer: {
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    overflow: "hidden",
    width: '100%',
  },
  picker: {
    color: "#fff",
  },
  pickerItem: {
    backgroundColor: "rgb(38, 38, 38)",
    color: "#fff",
    fontSize: 14,
  },
  errorText: {
    color: 'red',
    marginBottom: 10,
    textAlign: 'center',
  },
  loader: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -25 }, { translateY: -25 }],
  }
});

export default MuscleStats;