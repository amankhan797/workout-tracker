import React, { useState, useCallback, useEffect, forwardRef, useImperativeHandle } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
} from "react-native";
import { RadarChart } from "@salmonco/react-native-radar-chart";
import { getTodayWorkoutLog, getMuscleGroups } from "../../../../firebase";
import { useTheme } from "../../../context/ThemeContext"; // Import useTheme
import { Button } from "../../../../components/Button";
import { ActivityIndicator } from "react-native";

interface RadarData {
  label: string;
  value: number;
}

interface WorkoutLog {
  id: string;
  date: string;
  muscle_group: string;
  [key: string]: any;
}

type TimePeriod = 'week' | 'month' | 'year';

const ProgressGraph = forwardRef((props, ref) => {
  const { themeColor } = useTheme(); // Get the theme color
  const [chartData, setChartData] = useState<RadarData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('week');
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Get dates based on selected time period
  const getDates = (period: TimePeriod, date: Date = new Date()) => {
    const dates = [];
    const today = new Date(date);
    
    switch(period) {
      case 'week':
        // Get dates for the week (7 days)
        for (let i = 6; i >= 0; i--) {
          const date = new Date(today);
          date.setDate(today.getDate() - i);
          dates.push(date.toISOString().split('T')[0]);
        }
        break;
      case 'month':
        // Get dates for the month (30 days)
        for (let i = 29; i >= 0; i--) {
          const date = new Date(today);
          date.setDate(today.getDate() - i);
          dates.push(date.toISOString().split('T')[0]);
        }
        break;
      case 'year':
        // Get dates for the year (12 months)
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        
        for (let i = 11; i >= 0; i--) {
          const month = (currentMonth - i + 12) % 12;
          const year = currentYear - Math.floor((i - currentMonth) / 12);
          const date = new Date(year, month, 1);
          dates.push(date.toISOString().split('T')[0]);
        }
        break;
    }
    
    return dates;
  };

  const fetchChartData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const muscleGroups = await getMuscleGroups();
      if (!muscleGroups || muscleGroups.length === 0) {
        setError('No muscle groups found');
        setLoading(false);
        return;
      }

      const periodDates = getDates(timePeriod, selectedDate);
      const logsPromises = periodDates.map(date => getTodayWorkoutLog(date));
      const logsResults = await Promise.all(logsPromises);
      
      const allLogs = logsResults
        .flat()
        .filter((log): log is WorkoutLog => 
          log !== null && 
          log !== undefined && 
          'id' in log && 
          'date' in log && 
          'muscle_group' in log
        );

      const muscleGroupCounts: { [key: string]: number } = {};
      muscleGroups.forEach((mg) => {
        muscleGroupCounts[mg.name] = 0;
      });

      const uniqueWorkouts = new Set<string>();

      allLogs.forEach((log) => {
        if (log.muscle_group && muscleGroupCounts.hasOwnProperty(log.muscle_group)) {
          const workoutKey = `${log.date}-${log.muscle_group}`;
          
          if (!uniqueWorkouts.has(workoutKey)) {
            uniqueWorkouts.add(workoutKey);
            muscleGroupCounts[log.muscle_group] = Math.min(
              (muscleGroupCounts[log.muscle_group] || 0) + 1,
              timePeriod === 'week' ? 7 : timePeriod === 'month' ? 30 : 12
            );
          }
        }
      });

      const data: RadarData[] = Object.entries(muscleGroupCounts).map(
        ([name, count]) => ({
          label: name,
          value: count,
        })
      );

      setChartData(data);
    } catch (error) {
      console.error('Error fetching chart data:', error);
      setError('Failed to fetch workout data');
    } finally {
      setLoading(false);
    }
  };

  useImperativeHandle(ref, () => ({
    fetchChartData
  }));

  useEffect(() => {
    fetchChartData();
  }, [timePeriod, selectedDate]);

  const handlePeriodChange = (period: TimePeriod) => {
    setTimePeriod(period);
  };

  const handleDateChange = (offset: number) => {
    const newDate = new Date(selectedDate);
    
    switch(timePeriod) {
      case 'week':
        newDate.setDate(newDate.getDate() + (offset * 7));
        break;
      case 'month':
        newDate.setMonth(newDate.getMonth() + offset);
        break;
      case 'year':
        newDate.setFullYear(newDate.getFullYear() + offset);
        break;
    }
    
    setSelectedDate(newDate);
  };

  // Add the missing getPeriodLabel function
  const getPeriodLabel = () => {
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric',
    };
    
    switch(timePeriod) {
      case 'week':
        const weekStart = new Date(selectedDate);
        weekStart.setDate(selectedDate.getDate() - selectedDate.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        return `${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}`;
      case 'month':
        return selectedDate.toLocaleDateString('en-US', { 
          ...options,
          month: 'long'
        });
      case 'year':
        return selectedDate.toLocaleDateString('en-US', { year: 'numeric' });
      default:
        return '';
    }
  };

  const renderChart = () => {
    const maxValue = timePeriod === 'week' ? 7 : timePeriod === 'month' ? 30 : 12;
    const periodLabel = getPeriodLabel();

    // Create a loading overlay instead of replacing the entire content
    const renderLoadingOverlay = () => {
      if (loading) {
        return (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={themeColor} />
          </View>
        );
      }
      return null;
    };

    // Show error as an overlay message if needed
    if (error) {
      return (
        <View style={styles.chartContainer}>
          <View style={styles.messageContainer}>
            <Text style={styles.messageText}>{error}</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={[styles.chartContainer, { backgroundColor: "#333" }]}>
        {/* Header row with title, date and period selector */}
        <View style={styles.headerRow}>
          <View>
          <Text style={styles.title}>Target Muscles</Text>
          <Text style={styles.subtitle}>{periodLabel}</Text>
          </View>
          
          <View style={styles.periodSelector}>
            <Button
              title="Week"
              variant={timePeriod === 'week' ? 'primary' : 'outline'}
              size="small"
              style={[
                styles.periodButton,
                { borderColor: themeColor },
                timePeriod === 'week' && { backgroundColor: `${themeColor}3a` }
              ]}
              textStyle={[
                styles.periodButtonText,
                { color: themeColor }
              ]}
              onPress={() => handlePeriodChange('week')}
            />
            
            <Button
              title="Month"
              variant={timePeriod === 'month' ? 'primary' : 'outline'}
              size="small"
              style={[
                styles.periodButton,
                { borderColor: themeColor },
                timePeriod === 'month' && { backgroundColor: `${themeColor}3a` }
              ]}
              textStyle={[
                styles.periodButtonText,
                { color: themeColor }
              ]}
              onPress={() => handlePeriodChange('month')}
            />
            
            <Button
              title="Year"
              variant={timePeriod === 'year' ? 'primary' : 'outline'}
              size="small"
              style={[
                styles.periodButton,
                { borderColor: themeColor },
                timePeriod === 'year' && { backgroundColor: `${themeColor}3a` }
              ]}
              textStyle={[
                styles.periodButtonText,
                { color: themeColor }
              ]}
              onPress={() => handlePeriodChange('year')}
            />
          </View>
        </View>
        
        {/* Navigation controls row */}
        <View style={styles.navigationControls}>
          <Button
            title="Previous"
            icon="chevron-back"
            iconPosition="left"
            variant="outline"
            size="small"
            style={[styles.navButton, { borderColor: themeColor }]}
            textStyle={{ color: themeColor }}
            iconColor={themeColor}
            onPress={() => handleDateChange(-1)}
          />
          
          <Button
            title="Today"
            icon="calendar"
            iconPosition="left"
            variant="outline"
            size="small"
            style={[styles.navButton, { borderColor: themeColor }]}
            textStyle={{ color: themeColor }}
            iconColor={themeColor}
            onPress={() => {
              setSelectedDate(new Date());
            }}
          />
          
          <Button
            title="Next"
            icon="chevron-forward"
            iconPosition="right"
            variant="outline"
            size="small"
            style={[styles.navButton, { borderColor: themeColor }]}
            textStyle={{ color: themeColor }}
            iconColor={themeColor}
            onPress={() => handleDateChange(1)}
          />
        </View>
        
        <View style={styles.chartWrapper}>
          {(!chartData || chartData.length === 0) && !loading ? (
            <View style={styles.noDataMessage}>
              <Text style={styles.messageText}>No workout data available</Text>
            </View>
          ) : (
            <RadarChart
              data={chartData.length > 0 ? chartData : [{ label: "No Data", value: 0 }]}
              maxValue={maxValue}
              stroke={["#fff"]}
              strokeWidth={[0.5]}
              strokeOpacity={[0.3]}
              labelColor="#fff"
              dataFillColor={themeColor}
              dataFillOpacity={0.8}
              dataStroke={themeColor}
              dataStrokeWidth={2}
              size={Math.min(Dimensions.get("window").width - 64, 300)}
              fillColor="transparent"
            />
          )}
        </View>
        <Text style={styles.legend}>
          Scale: 0-{maxValue} {timePeriod === 'week' ? 'days' : timePeriod === 'month' ? 'days' : 'months'} per {timePeriod}
        </Text>
        
        {/* Render loading overlay on top */}
        {renderLoadingOverlay()}
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
    marginTop: 10,
  },
  title: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  periodSelector: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginLeft: 'auto',
  },
  periodButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 20,
    marginHorizontal: 2,
    minWidth: 0,
  },
  periodButtonText: {
    fontSize: 12,
  },
  navigationControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 16,
  },
  navButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    minWidth: 0,
  },
  noDataMessage: {
    justifyContent: 'center',
    alignItems: 'center',
    height: 200,
  },
  subtitle: {
    color: "#fff",
    fontSize: 12,
    opacity: 0.8,
  },
});