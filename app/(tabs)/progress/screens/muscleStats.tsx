import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, ActivityIndicator, ToastAndroid, Platform } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Picker } from '@react-native-picker/picker';
import { getMuscleGroups, getExercises, getAllWorkoutLogs } from '../../../../firebase.js';
import { useTheme } from '../../../context/ThemeContext'; // Import useTheme

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
    sets: Array<{
      set_number: number;
      reps: number;
      weight: string;
    }>;
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
  const { themeColor } = useTheme(); // Get the theme color
  const [muscleGroups, setMuscleGroups] = useState<MuscleGroup[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedMuscle, setSelectedMuscle] = useState<string>('');
  const [selectedExercise, setSelectedExercise] = useState<string>('');
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>([]);

  const pickerStyles = Platform.select({
    android: {
      color: '#fff',
      backgroundColor: 'rgb(38, 38, 38)',
      dropdownIconColor: '#fff',
    },
    ios: {
      color: '#fff',
    },
  });

  const emptyChartData: ChartData = {
    labels: ['No Data'],
    datasets: [
      {
        data: [0],
        color: (opacity = 1) => `${themeColor}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`,
        strokeWidth: 2,
      },
      {
        data: [0],
        color: (opacity = 1) => `rgba(255, 0, 0, ${opacity})`,
        strokeWidth: 2,
      },
    ],
    legend: ['Avg Weight (kg)', 'Avg Reps'],
  };

  useEffect(() => {
    loadMuscleGroups();
    loadAllWorkoutLogs();
  }, []);

  useEffect(() => {
    if (selectedMuscle) {
      loadExercises();
      setSelectedExercise('');
      setChartData(emptyChartData);
    }
  }, [selectedMuscle]);

  useEffect(() => {
    if (selectedExercise && workoutLogs.length > 0) {
      processChartData();
    } else if (!selectedExercise) {
      setChartData(emptyChartData);
    }
  }, [selectedExercise, workoutLogs]);

  const loadAllWorkoutLogs = async () => {
    try {
      const logs = await getAllWorkoutLogs();
      setWorkoutLogs(logs);
    } catch (error) {
      console.error('Error loading workout logs:', error);
      setError('Failed to load workout history');
    }
  };

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

  const processChartData = () => {
    setLoading(true);
    setError(null);

    try {
      const selectedExerciseData = exercises.find(ex => ex.id === selectedExercise);
      if (!selectedExerciseData) {
        throw new Error('Selected exercise not found');
      }
      const exerciseLogs = [];
      
      // Process each workout log
      for (const log of workoutLogs) {
        // Find matching exercise by name (case insensitive)
        const matchingExercise = log.exercises.find(
          ex => ex.exercise_name && ex.exercise_name.toLowerCase() === selectedExerciseData.name.toLowerCase()
        );

        if (matchingExercise) {
          // Handle both array of sets and direct weight/reps properties
          if (Array.isArray(matchingExercise.sets) && matchingExercise.sets.length > 0) {
            // Handle sets array format
            const totalWeight = matchingExercise.sets.reduce((sum, set) => {
              const weightNum = parseFloat(set.weight);
              return isNaN(weightNum) ? sum : sum + weightNum;
            }, 0);

            const totalReps = matchingExercise.sets.reduce((sum, set) => sum + set.reps, 0);
            const setCount = matchingExercise.sets.length;

            exerciseLogs.push({
              date: log.date,
              avgWeight: parseFloat((totalWeight / setCount).toFixed(1)),
              avgReps: parseFloat((totalReps / setCount).toFixed(1)),
            });
          } else if (matchingExercise.weight && matchingExercise.reps) {
            // Handle direct weight/reps properties (as in personalRecord.tsx)
            const weight = parseFloat(matchingExercise.weight);
            exerciseLogs.push({
              date: log.date,
              avgWeight: isNaN(weight) ? 0 : weight,
              avgReps: matchingExercise.reps || 0,
            });
          }
        }
      }
      
      // Sort logs by date
      exerciseLogs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      if (exerciseLogs.length === 0) {
        setError(`No workout data found for ${selectedExerciseData.name}`);
        setChartData(emptyChartData);
        return;
      }

      // Format dates for display
      const labels = exerciseLogs.map(log => {
        const date = new Date(log.date);
        return `${date.getDate()}/${date.getMonth() + 1}`;
      });

      const weights = exerciseLogs.map(log => log.avgWeight);
      const reps = exerciseLogs.map(log => log.avgReps);

      const newChartData = {
        labels,
        datasets: [
          {
            data: weights,
            color: (opacity = 1) => `${themeColor}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`,
            strokeWidth: 2,
          },
          {
            data: reps,
            color: (opacity = 1) => `rgba(255, 0, 0, ${opacity})`,
            strokeWidth: 2,
          },
        ],
        legend: ['Avg Weight (kg)', 'Avg Reps'],
      };

      setChartData(newChartData);
      
      if (Platform.OS === 'android') {
        ToastAndroid.show(`Showing data for ${selectedExerciseData.name}`, ToastAndroid.SHORT);
      }

    } catch (error) {
      console.error('Error processing chart data:', error);
      setError('Failed to process workout data');
      setChartData(emptyChartData);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {error && <Text style={styles.errorText}>{error}</Text>}

      <View style={styles.chartContainer}>
        {chartData && (
          <LineChart
            data={chartData}
            width={Dimensions.get('window').width - 20}
            height={220}
            chartConfig={{
              backgroundColor: '#333',
              backgroundGradientFrom: '#333',
              backgroundGradientTo: '#333',
              decimalPlaces: 1,
              color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
              style: {
                borderRadius: 8,
              },
              propsForDots: {
                r: '4',
                strokeWidth: '2',
                stroke: themeColor,
              },
            }}
            bezier
            style={styles.chart}
            fromZero={true}
            yAxisInterval={1}
          />
        )}
      </View>

      {loading && (
        <ActivityIndicator size="large" color={themeColor} style={styles.loader} />
      )}

      <View style={[styles.pickerContainer, { borderColor: `${themeColor}3a` }]}>
        <Picker
          selectedValue={selectedMuscle}
          onValueChange={(itemValue: string) => setSelectedMuscle(itemValue)}
          style={[styles.picker, pickerStyles]}
          dropdownIconColor="#fff"
          mode={Platform.OS === 'android' ? 'dropdown' : 'dialog'}
        >
          <Picker.Item
            label="Select Muscle Group"
            value=""
            color={Platform.OS === 'android' ? '#fff' : 'rgba(255, 255, 255, 0.5)'}
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

      <View style={[styles.pickerContainer, { borderColor: `${themeColor}3a` }]}>
        <Picker
          selectedValue={selectedExercise}
          onValueChange={(itemValue: string) => setSelectedExercise(itemValue)}
          style={[styles.picker, pickerStyles]}
          enabled={!!selectedMuscle}
          dropdownIconColor="#fff"
          mode={Platform.OS === 'android' ? 'dropdown' : 'dialog'}
        >
          <Picker.Item
            label="Select Exercise"
            value=""
            color={Platform.OS === 'android' ? '#fff' : 'rgba(255, 255, 255, 0.5)'}
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
  chartContainer: {
    width: '100%',
    alignItems: 'center',
    marginVertical: 8,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 8,
  },
  pickerContainer: {
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    width: '100%',
  },
  picker: {
    color: '#fff',
  },
  pickerItem: {
    backgroundColor: 'rgb(38, 38, 38)',
    color: '#fff',
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
  },
});

export default MuscleStats;