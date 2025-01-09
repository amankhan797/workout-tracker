import React, { useState, useCallback, useEffect, forwardRef, useImperativeHandle } from "react";
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  Dimensions,
} from "react-native";
import { RadarChart } from "@salmonco/react-native-radar-chart";
import { getTodayWorkoutLog, getMuscleGroups } from "../../../../firebase";

interface RadarData {
  label: string;
  value: number;
}

const ProgressGraph = forwardRef((props, ref) => {
  const [chartData, setChartData] = useState<RadarData[]>([]);
  const [loading, setLoading] = useState(true);

  useImperativeHandle(ref, () => ({
    fetchChartData
  }))

  const getWeekDates = () => {
    const today = new Date();
    const dates = [];

    const currentDay = today.getDay();
    const diff = today.getDate() - currentDay + (currentDay === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diff));

    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      dates.push(date.toISOString().split("T")[0]);
    }

    return dates;
  };

  const fetchChartData = async () => {
    try {
      const weekDates = getWeekDates();
      const weeklyLogs = await Promise.all(
        weekDates.map((date) => getTodayWorkoutLog(date))
      );

      const allLogs = weeklyLogs.flat();

      const muscleGroups = await getMuscleGroups();

      // Initialize muscle group counts
      const muscleGroupCounts: { [key: string]: number } = {};
      muscleGroups.forEach((mg) => {
        muscleGroupCounts[mg.name] = 0;
      });

      // Create a Set to track unique date-muscle combinations
      const uniqueWorkouts = new Set<string>();

      // Count unique workouts per muscle group per day
      allLogs.forEach((log) => {
        if (
          log.muscle_group &&
          muscleGroupCounts.hasOwnProperty(log.muscle_group)
        ) {
          // Create a unique identifier for each date-muscle combination
          const workoutKey = `${log.date}-${log.muscle_group}`;

          // Only increment if we haven't seen this combination before
          if (!uniqueWorkouts.has(workoutKey)) {
            uniqueWorkouts.add(workoutKey);
            muscleGroupCounts[log.muscle_group]++;

            // Cap the count at 5
            if (muscleGroupCounts[log.muscle_group] > 5) {
              muscleGroupCounts[log.muscle_group] = 5;
            }
          }
        }
      });

      let data: RadarData[] = Object.entries(muscleGroupCounts).map(
        ([name, count]) => ({
          label: name,
          value: count,
        })
      );

      setChartData(data);
      setLoading(false);
    } catch (error) {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChartData();

    // Set up weekly refresh
    const now = new Date();
    const monday = new Date();
    monday.setDate(now.getDate() - now.getDay() + 1);
    monday.setHours(0, 0, 0, 0);

    const nextMonday = new Date(monday);
    nextMonday.setDate(monday.getDate() + 7);
    const timeUntilNextMonday = nextMonday.getTime() - now.getTime();

    const timer = setTimeout(() => {
      fetchChartData();
    }, timeUntilNextMonday);

    return () => clearTimeout(timer);
  }, []);

  const renderChart = () => {
    if (loading) {
      return (
        <View style={styles.messageContainer}>
          <Text style={styles.messageText}>Loading Workout Progress...</Text>
        </View>
      );
    }

    if (!chartData || chartData.length === 0) {
      return (
        <View style={styles.messageContainer}>
          <Text style={styles.messageText}>No workout data available</Text>
        </View>
      );
    }
    const weekDates = getWeekDates();
    const startDate = new Date(weekDates[0]).toLocaleDateString();
    const endDate = new Date(weekDates[6]).toLocaleDateString();

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.title}>Target Muscles This Week</Text>
        <Text style={styles.subtitle}>
          {startDate} - {endDate}
        </Text>
        <View style={styles.chartWrapper}>
          <RadarChart
            data={chartData}
            maxValue={4}
            stroke={["#fff"]}
            strokeWidth={[0.5]}
            strokeOpacity={[0.3]}
            labelColor="#fff"
            dataFillColor="#3498db"
            dataFillOpacity={0.8}
            dataStroke="#3498db"
            dataStrokeWidth={2}
            size={Math.min(Dimensions.get("window").width - 64, 300)}
            fillColor="transparent"
          />
        </View>
        <Text style={styles.legend}>Scale: 0-5 days per week</Text>
      </View>
    );
  };

  return <View style={styles.cardsContainer}>{renderChart()}</View>;
});
export default ProgressGraph;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  cardsContainer: {
    width: "100%",
  },
  chartContainer: {
    backgroundColor: "#333",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    width: "100%",
  },
  chartWrapper: {
    width: "100%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    color: "#fff",
    fontSize: 14,
    marginBottom: 16,
    opacity: 0.8,
  },
  legend: {
    color: "#fff",
    fontSize: 12,
    textAlign: "center",
    marginTop: 8,
    opacity: 0.7,
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
});
