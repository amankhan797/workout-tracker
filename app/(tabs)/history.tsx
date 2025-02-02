import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet,
  TouchableOpacity, 
  RefreshControl,
  SafeAreaView,
  ActivityIndicator,
  Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { getAllWorkoutLogs, deleteWorkoutLog } from '../../firebase';
import { ToastAndroid } from 'react-native';

interface Exercise {
  exercise_name: string;
  reps: number;
  weight: string;
}

interface WorkoutLog {
  id: string;
  date: string;
  muscle_group: string;
  exercises: Exercise[];
}

interface GroupedWorkout {
  date: string;
  groups: {
    [key: string]: {
      exercises: Exercise[];
      ids: string[];
    };
  };
}

const HistoryScreen = () => {
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>([]);
  const [groupedLogs, setGroupedLogs] = useState<GroupedWorkout[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isSearching, setIsSearching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const groupWorkoutsByDate = (logs: WorkoutLog[]) => {
    const grouped = logs.reduce((acc: { [key: string]: GroupedWorkout }, log) => {
      const dateKey = new Date(log.date).toDateString();
      
      if (!acc[dateKey]) {
        acc[dateKey] = {
          date: log.date,
          groups: {}
        };
      }
      
      if (!acc[dateKey].groups[log.muscle_group]) {
        acc[dateKey].groups[log.muscle_group] = {
          exercises: [],
          ids: []
        };
      }
      
      acc[dateKey].groups[log.muscle_group].exercises.push(...log.exercises);
      acc[dateKey].groups[log.muscle_group].ids.push(log.id);
      
      return acc;
    }, {});
    
    return Object.values(grouped).sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  };

  const fetchWorkoutLogs = async () => {
    try {
      const logs = await getAllWorkoutLogs();
      setWorkoutLogs(logs);
      const grouped = groupWorkoutsByDate(logs);
      setGroupedLogs(grouped);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch workout logs');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkoutLogs();
  }, []);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchWorkoutLogs().then(() => setRefreshing(false));
  }, []);

  const handleDelete = async (muscleGroup: string, date: string) => {
    Alert.alert(
      'Delete Workout Group',
      `Are you sure you want to delete all ${muscleGroup} exercises for this date?`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const dateWorkout = groupedLogs.find(log => log.date === date);
              const groupIds = dateWorkout?.groups[muscleGroup]?.ids || [];
              
              // Delete all workouts for this muscle group
              await Promise.all(groupIds.map(id => deleteWorkoutLog(id)));
              
              // Update state
              const updatedLogs = workoutLogs.filter(log => !groupIds.includes(log.id));
              setWorkoutLogs(updatedLogs);
              const updatedGrouped = groupWorkoutsByDate(updatedLogs);
              setGroupedLogs(updatedGrouped);
              
              ToastAndroid.show('Workouts deleted successfully!', ToastAndroid.SHORT);
            } catch (error) {
              ToastAndroid.show('Failed to delete workouts', ToastAndroid.SHORT);
            }
          }
        }
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleDateChange = (event: any, date?: Date) => {
    setShowDatePicker(false);
    if (date) {
      setSelectedDate(date);
      filterLogsByDate(date);
    }
  };

  const filterLogsByDate = (date: Date) => {
    const filtered = groupedLogs.filter(log => 
      new Date(log.date).toDateString() === date.toDateString()
    );
    setGroupedLogs(filtered);
    setIsSearching(true);
  };

  const clearSearch = () => {
    const grouped = groupWorkoutsByDate(workoutLogs);
    setGroupedLogs(grouped);
    setIsSearching(false);
  };

  const renderExerciseItem = ({ item }: { item: Exercise }) => (
    <View style={styles.exerciseItem}>
      <Text style={styles.exerciseName}>{item.exercise_name}</Text>
      <View style={styles.statsRow}>
        <Text style={styles.statsText}>{item.reps} reps</Text>
        <Text style={styles.statsDivider}>•</Text>
        <Text style={styles.statsText}>{item.weight} Kg</Text>
      </View>
    </View>
  );

  const renderMuscleGroupCard = (muscleGroup: string, exercises: Exercise[], date: string) => (
    <LinearGradient
      key={`${date}-${muscleGroup}`}
      colors={['#2c3e50', '#3498db']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.cardGradient}
    >
      <View style={styles.cardHeader}>
        <View style={styles.muscleGroupBadge}>
          <Text style={styles.muscleGroupText}>{muscleGroup}</Text>
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDelete(muscleGroup, date)}
        >
          <Ionicons name="trash-outline" size={24} color="rgba(231, 76, 60, 0.8)" />
        </TouchableOpacity>
      </View>
      <FlatList
        data={exercises}
        renderItem={renderExerciseItem}
        keyExtractor={(_, index) => index.toString()}
        scrollEnabled={false}
      />
    </LinearGradient>
  );

  const renderDateGroup = ({ item }: { item: GroupedWorkout }) => (
    <View style={styles.dateGroup}>
      <Text style={styles.dateText}>{formatDate(item.date)}</Text>
      {Object.entries(item.groups).map(([muscleGroup, data]) => 
        renderMuscleGroupCard(muscleGroup, data.exercises, item.date)
      )}
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#3498db" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.searchContainer}>
          <TouchableOpacity
            style={styles.datePickerButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Ionicons name="calendar" size={20} color="#fff" />
            <Text style={styles.datePickerButtonText}>
              {selectedDate.toLocaleDateString()}
            </Text>
          </TouchableOpacity>
          {isSearching && (
            <TouchableOpacity style={styles.clearButton} onPress={clearSearch}>
              <Ionicons name="close-circle" size={24} color="#fff" />
            </TouchableOpacity>
          )}
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            onChange={handleDateChange}
          />
        )}

        <FlatList
          data={groupedLogs}
          renderItem={renderDateGroup}
          keyExtractor={item => item.date}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#fff"
              colors={['#3498db']}
            />
          }
          ListEmptyComponent={
            <Text style={styles.noLogsText}>No workouts found</Text>
          }
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  // ... keeping existing styles ...
  container: {
    flex: 1,
    backgroundColor: 'rgb(38, 38, 38)',
    padding: 16,
  },
  dateGroup: {
    marginBottom: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2c3e50',
    padding: 12,
    borderRadius: 8,
    flex: 1,
  },
  datePickerButtonText: {
    color: '#fff',
    marginLeft: 8,
    fontSize: 16,
  },
  clearButton: {
    marginLeft: 12,
  },
  listContainer: {
    gap: 12,
  },
  cardGradient: {
    borderRadius: 16,
    padding: 12,
    marginTop: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  muscleGroupBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  muscleGroupText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  exerciseItem: {
    marginBottom: 8,
  },
  exerciseName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statsText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
  },
  statsDivider: {
    color: 'rgba(255, 255, 255, 0.4)',
    marginHorizontal: 8,
  },
  noLogsText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 16,
    marginTop: 24,
  },
  safeArea: {
    flex: 1,
    backgroundColor: 'rgba(29, 29, 29, 1)',
    paddingTop: 30,
  },
  deleteButton: {
    padding: 8,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  }
});

export default HistoryScreen;