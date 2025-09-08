import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  getCurrentUser,
  getTodaysWorkout,
  getAllWorkoutPlans,
  deleteWorkoutPlan,
  activateWorkoutPlan,
  getActiveWorkoutPlan,
  db,
} from "../../../firebase";
import { useRouter, useLocalSearchParams } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import { Button } from "../../../components/Button";
import { IconButton } from "../../../components/IconButton";
import { useTheme } from "../../context/ThemeContext"; // Import useTheme
import Chest from '../../../components/muscleGroup/Chest';
import Shoulder from '../../../components/muscleGroup/Shoulder';
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
  schedule: {
    [key: string]: DayPlan;
  };
}

interface DateItem {
  date: Date;
  dayName: string;
  dayNumber: string;
  isToday: boolean;
}

export default function HomeScreen() {
  const router = useRouter();
  const { refresh } = useLocalSearchParams();
  const { themeColor } = useTheme(); // Get the theme color
  const [fullName, setFullName] = useState("");
  const [todaysWorkout, setTodaysWorkout] = useState<DayPlan | null>(null);
  const [workoutPlans, setWorkoutPlans] = useState<WorkoutPlan[]>([]);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dateList, setDateList] = useState<DateItem[]>([]);
  const [dateLoading, setDateLoading] = useState(false);

  // Simplified loading states
  const [isLoading, setIsLoading] = useState(true);

  // Generate dates for the week view
  useEffect(() => {
    const generateDateList = () => {
      const today = new Date();
      const dates: DateItem[] = [];

      // Generate 7 days before and 7 days after today (15 days total)
      for (let i = -7; i <= 7; i++) {
        const date = new Date();
        date.setDate(today.getDate() + i);

        dates.push({
          date: date,
          dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
          dayNumber: date.getDate().toString(),
          isToday: i === 0
        });
      }

      setDateList(dates);
    };

    generateDateList();
  }, []);

  const renderMuscleGroupSVG = (group: string) => {
    switch (group.toLowerCase()) {
      case 'chest':
        return <Chest muscleColor={themeColor} width={32} height={32} />;
      case 'shoulders':
        return <Shoulder muscleColor={themeColor} width={32} height={32} />;
      case 'back':
        return <Back muscleColor={themeColor} width={32} height={32} />;
      case 'legs':
        return <Legs muscleColor={themeColor} width={32} height={32} />;
      case 'biceps':
        return <Biceps muscleColor={themeColor} width={32} height={32} />;
      case 'abs':
        return <Abs muscleColor={themeColor} width={32} height={32} />;
      case 'triceps':
        return <Triceps muscleColor={themeColor} width={32} height={32} />;
      default:
        return null;
    }
  };

  const handleActivatePlan = async (planId: string) => {
    try {
      await activateWorkoutPlan(planId);
      setActivePlanId(planId);
      const updatedTodaysWorkout = await getTodaysWorkout();
      setTodaysWorkout(updatedTodaysWorkout);
      Alert.alert("Success", "Workout plan activated successfully");
    } catch (error) {
      Alert.alert("Error", "Failed to activate workout plan");
    }
  };

  const handleDelete = async (planId: string) => {
    Alert.alert("Delete Plan", "Are you sure you want to delete this plan?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            if (planId === activePlanId) {
              setActivePlanId(null);
              setTodaysWorkout(null);
            }
            await deleteWorkoutPlan(planId);
            const updatedPlans = await getAllWorkoutPlans();
            setWorkoutPlans(updatedPlans);
            Alert.alert("Success", "Plan deleted successfully");
          } catch (error) {
            Alert.alert("Error", "Failed to delete plan");
          }
        },
      },
    ]);
  };

  const loadUserName = async () => {
    const userId = getCurrentUser()?.uid;
    if (!userId) return;

    try {
      const userDocRef = doc(db, "users", userId);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        setFullName(userDoc.data().fullName || "User");
      }
    } catch (error) {
      // Silently handle error - name will remain as default
    }
  };

  // Function to load workout for specific date
  const loadWorkoutForDate = async (date: Date) => {
    try {
      setDateLoading(true);
      const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      if (!activePlanId) {
        setTodaysWorkout(null);
        return;
      }
      const userId = getCurrentUser()?.uid;
      if (!userId) {
        throw new Error("User not authenticated");
      }
      const planRef = doc(db, "users", userId, "workoutPlans", activePlanId);
      const planDoc = await getDoc(planRef);
      if (planDoc.exists() && planDoc.data().schedule && planDoc.data().schedule[dayOfWeek]) {
        setTodaysWorkout(planDoc.data().schedule[dayOfWeek]);
      } else {
        setTodaysWorkout(null);
      }
    } catch (error) {
      console.error("Error loading workout for date:", error);
    } finally {
      setDateLoading(false);
    }
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    loadWorkoutForDate(date);
  };

  const loadWorkoutData = async () => {
    try {
      setIsLoading(true);
      const userId = getCurrentUser()?.uid;

      if (!userId) {
        setError("User not authenticated");
        return;
      }

      // Load all data in parallel
      const [plans, activeId, todayWorkout] = await Promise.all([
        getAllWorkoutPlans(),
        getActiveWorkoutPlan(),
        getTodaysWorkout()
      ]);

      setWorkoutPlans(plans);
      setActivePlanId(activeId);
      setTodaysWorkout(todayWorkout);
      setError(null);
    } catch (error) {
      setError("Failed to load workout data");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle pull-to-refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadWorkoutData();
    setRefreshing(false);
  }, []);

  // Load initial data
  React.useEffect(() => {
    const initializeData = async () => {
      await loadUserName();
      await loadWorkoutData();
    };

    initializeData();
  }, []);

  // Reload data when refresh parameter changes
  React.useEffect(() => {
    if (refresh) {
      loadWorkoutData();
    }
  }, [refresh]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric"
    });
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
        <Text style={styles.errorText}>Error: {error}</Text>
        <Button
          title="Retry"
          variant="primary"
          onPress={loadWorkoutData}
          style={styles.retryButton}
          textStyle={styles.retryButtonText}
        />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[themeColor]}
          tintColor={themeColor}
          progressBackgroundColor="rgb(38, 38, 38)"
        />
      }
    >
      <View style={styles.header}>
        <View>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={[styles.name, { color: themeColor }]}> {fullName} </Text>
            <Text style={styles.greeting}>!</Text>
          </View>
          <Text style={styles.subtitle}>Let's crush today's workout</Text>
        </View>
      </View>

      {/* Date Selector Section */}
      <View style={styles.dateScrollerContainer}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={styles.currentDateText}>{formatDate(selectedDate)}</Text>
          {dateLoading && (
            <ActivityIndicator size="small" color={themeColor} />
          )}
        </View>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={dateList}
          keyExtractor={(item) => item.date.toISOString()}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.dateItem,
                item.date.toDateString() === selectedDate.toDateString() &&
                [styles.selectedDateItem, { backgroundColor: `${themeColor}3a` }]
              ]}
              onPress={() => handleDateSelect(item.date)}
            >
              <Text
                style={[
                  styles.dayName,
                  item.date.toDateString() === selectedDate.toDateString() && styles.selectedDateText
                ]}
              >
                {item.dayName}
              </Text>
              <View
                style={[
                  styles.dayNumberContainer,
                  item.date.toDateString() === selectedDate.toDateString() &&
                  [styles.selectedDayNumberContainer, { backgroundColor: themeColor }],
                  item.isToday && [styles.todayContainer, { borderColor: themeColor }]
                ]}
              >
                <Text
                  style={[
                    styles.dayNumber,
                    item.date.toDateString() === selectedDate.toDateString() && styles.selectedDateText,
                    item.isToday && []
                  ]}
                >
                  {item.dayNumber}
                </Text>
              </View>
              {item.isToday && (
                <Text style={[styles.todayLabel]}>TODAY</Text>
              )}
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.dateScrollerContent}
          initialScrollIndex={7}
          getItemLayout={(data, index) => ({
            length: 60,
            offset: 60 * index,
            index,
          })}
        />
      </View>

      <View style={styles.card}>
        {todaysWorkout && todaysWorkout.muscleGroups.length > 0 ? (
          <View>
            {/* Muscle Groups Section */}
            <View style={styles.muscleGroupsContainer}>
              <Text style={styles.sectionTitle}>Muscle Groups:</Text>
              <View style={styles.muscleGroupsList}>
                {todaysWorkout.muscleGroups.map((group, index) => (
                  <View
                    key={index}
                    style={[
                      styles.muscleGroupTag,
                      {
                        backgroundColor: themeColor + '20',
                        borderColor: themeColor,
                        borderWidth: 1,
                        borderRadius: 8,
                        paddingHorizontal: 8,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                      },
                    ]}
                  >
                    <View>
                      {renderMuscleGroupSVG(group)}
                    </View>
                    <Text style={styles.muscleGroupText}>{group}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Exercises Section */}
            <View style={styles.muscleGroupsContainer}>
              <Text style={styles.sectionTitle}>Exercises ({todaysWorkout.exercises.length}):</Text>
              <View style={styles.muscleGroupsList}>
                {todaysWorkout.exercises.map((exercise, index) => (
                  <View key={exercise.id || index} style={[styles.muscleGroupTag, { backgroundColor: themeColor }]}>
                    <Text style={styles.muscleGroupText}>{exercise.name}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.emptyWorkout}>
            <Text style={styles.emptyWorkoutText}>
              Rest day - No workout scheduled
            </Text>
          </View>
        )}
      </View>

      <Text style={styles.sectionTitle}>Workout Plans</Text>
      <View style={styles.plansList}>
        {workoutPlans.length > 0 ? (
          workoutPlans.map((plan) => (
            <TouchableOpacity
              key={`plan-${plan.id}`}
              style={styles.planCard}
              onPress={() =>
                router.push({
                  pathname: "/home/screens/recommended-plans",
                  params: { planId: plan.id },
                })
              }
            >
              <View style={styles.planInfo}>
                <Text style={styles.planName}>{plan.name}</Text>
                {activePlanId === plan.id && (
                  <View style={styles.activeStatus}>
                    <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                    <Text style={styles.activeText}>Active Plan</Text>
                  </View>
                )}
              </View>
              <View style={styles.planActions}>
                <IconButton
                  name="trash-outline"
                  color="#EF4444"
                  onPress={() => handleDelete(plan.id)}
                  style={styles.actionButton}
                />
                <IconButton
                  name={activePlanId === plan.id ? "checkmark-circle" : "radio-button-off"}
                  color={activePlanId === plan.id ? "#fff" : "#ccc"}
                  onPress={() => handleActivatePlan(plan.id)}
                  style={activePlanId === plan.id ? { ...styles.actionButton, ...styles.activeButton } : styles.actionButton}
                />
                <IconButton
                  name="chevron-forward"
                  color="#9CA3AF"
                  onPress={() =>
                    router.push({
                      pathname: "/home/screens/recommended-plans",
                      params: { planId: plan.id },
                    })
                  }
                />
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <Text style={styles.noPlansText}>No workout plans available</Text>
        )}
      </View>

      <Button
        title="Create Custom Plan"
        icon="add"
        variant="outline"
        iconColor="#ccc"
        style={styles.createPlanButton}
        textStyle={styles.createPlanText}
        onPress={() => router.push("/home/screens/custom-plan")}
      />
      <Button
        title="Analyzer your food"
        icon="leaf-sharp"
        variant="outline"
        iconColor="#ccc"
        style={styles.ImageAnalyzer}
        textStyle={styles.createPlanText}
        onPress={() => router.push("/home/screens/ImageAnalyzer")}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgb(38, 38, 38)",
  },
  container: {
    flex: 1,
    backgroundColor: "rgb(38, 38, 38)",
    padding: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  greeting: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#eee",
  },
  name: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#3498db",
  },
  planInfo: {
    flex: 1,
  },
  exerciseDetails: {
    fontSize: 14,
    color: "#ccc",
    marginTop: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#ccc",
  },
  streakContainer: {
    alignItems: "center",
  },
  streakText: {
    marginLeft: 8,
    fontWeight: "bold",
    color: "#eee",
  },
  quickActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  quickActionButton: {
    flex: 1,
    margin: 4,
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  quickActionText: {
    color: "#444",
    marginTop: 8,
    fontSize: 12,
  },
  planActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  card: {
    backgroundColor: "#444",
    borderRadius: 8,
    padding: 8,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#666",
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  startButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  workoutInfo: {
    marginTop: 8,
  },
  workoutName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#eee",
  },
  emptyWorkout: {
    alignItems: "center",
    padding: 32,
  },
  emptyWorkoutText: {
    color: "#ccc",
    marginVertical: 16,
  },
  planButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  planButtonText: {
    color: "#444",
    fontWeight: "500",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
    color: "#eee",
  },
  plansList: {
    marginBottom: 24,
  },
  planCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#444",
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#666",
  },
  planName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#eee",
  },
  planMeta: {
    fontSize: 14,
    color: "#ccc",
  },
  createPlanButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  ImageAnalyzer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 8,
    marginBottom: 30,
  },
  createPlanText: {
    marginLeft: 8,
    fontSize: 16,
    color: "#ccc",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#ccc",
  },

  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ccc",
    padding: 20,
  },

  errorText: {
    fontSize: 16,
    color: "#EF4444",
    marginBottom: 12,
  },

  retryButton: {
    backgroundColor: "#3B82F6",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },

  retryButtonText: {
    color: "#444",
    fontWeight: "bold",
    fontSize: 16,
  },

  exerciseCount: {
    fontSize: 14,
    color: "#ccc",
    marginTop: 4,
  },

  noPlansText: {
    fontSize: 16,
    color: "#ccc",
    textAlign: "center",
    marginTop: 16,
  },
  activeStatus: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },

  activeText: {
    fontSize: 12,
    color: "#10B981",
    marginLeft: 4,
  },

  actionButton: {
    padding: 6,
  },
  activeButton: {
    backgroundColor: "#00ff7c3b",
    borderColor: "#10B981",
    borderWidth: 1,
    borderRadius: 8,
  },
  loadingWorkout: {
    padding: 20,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  muscleGroupsContainer: {
    marginBottom: 16,
  },
  muscleGroupsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  muscleGroupTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  muscleGroupText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
  exercisesContainer: {
    gap: 8,
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  exerciseName: {
    fontSize: 14,
    color: '#4B5563',
    flex: 1,
  },
  startButtonText: {
    color: '#ccc',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  dateScrollerContainer: {
    backgroundColor: "#444",
    borderRadius: 8,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    padding: 8,
    marginBottom: 2,
    borderWidth: 1,
    borderColor: "#666",
    marginTop: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  currentDateText: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 8,
    color: "#fff",
    paddingHorizontal: 5,
  },
  dateScrollerContent: {
    paddingVertical: 5,
    paddingHorizontal: 5,
  },
  dateItem: {
    width: 60,
    alignItems: "center",
    marginRight: 10,
    paddingVertical: 5,
  },
  selectedDateItem: {
    borderRadius: 8,
  },
  dayName: {
    fontSize: 12,
    fontWeight: "500",
    color: "#fff",
    marginBottom: 5,
  },
  dayNumberContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eee",
  },
  selectedDayNumberContainer: {
    backgroundColor: "#3498db",
  },
  todayContainer: {
    borderWidth: 1,
  },
  dayNumber: {
    fontSize: 16,
    fontWeight: "600",
  },
  selectedDateText: {
    color: "#fff",
  },
  todayLabel: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "700",
    marginTop: 2,
  }
});
