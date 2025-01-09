import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  ToastAndroid,
  Image,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { getExercises } from "../../firebase";
import Carousel, { ICarouselInstance } from "react-native-reanimated-carousel";
import { useSharedValue } from "react-native-reanimated";

interface Exercise {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
}

type MuscleGroup =
  | "Chest"
  | "Back"
  | "Shoulders"
  | "Legs"
  | "Biceps"
  | "Triceps"
  | "Abs";

type MuscleGroupImages = {
  [key in MuscleGroup]: any;
};

const muscleGroupImages: MuscleGroupImages = {
  Chest: require("../../assets/images/chest.png"),
  Back: require("../../assets/images/back.png"),
  Shoulders: require("../../assets/images/shoulders.png"),
  Legs: require("../../assets/images/legs.png"),
  Biceps: require("../../assets/images/biceps.png"),
  Triceps: require("../../assets/images/triceps.png"),
  Abs: require("../../assets/images/abs.png"),
};

interface DayInfo {
  day: string;
  muscle: MuscleGroup;
}

const DAYS: DayInfo[] = [
  { day: "Mon", muscle: "Chest" },
  { day: "Tue", muscle: "Back" },
  { day: "Wed", muscle: "Shoulders" },
  { day: "Thu", muscle: "Legs" },
  { day: "Fri", muscle: "Biceps" },
  { day: "Sat", muscle: "Triceps" },
  { day: "Sun", muscle: "Abs" },
];

const width = Dimensions.get("window").width;

const isMuscleGroup = (muscle: string): muscle is MuscleGroup => {
  return [
    "Chest",
    "Back",
    "Shoulders",
    "Legs",
    "Biceps",
    "Triceps",
    "Abs",
  ].includes(muscle);
};

export default function HomeScreen() {
  const [exercisesByMuscle, setExercisesByMuscle] = useState<
    Record<MuscleGroup, Exercise[]>
  >({
    Chest: [],
    Back: [],
    Shoulders: [],
    Legs: [],
    Biceps: [],
    Triceps: [],
    Abs: [],
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const currentIndex = useSharedValue(0);
  const [visibleIndex, setVisibleIndex] = useState(0);
  const carouselRef = useRef<ICarouselInstance>(null);

  const today = new Date().toLocaleDateString("en-US", { weekday: "short" });
  const todayIndex = DAYS.findIndex((day) => day.day === today);
  const safeVisibleIndex =
    ((visibleIndex % DAYS.length) + DAYS.length) % DAYS.length;
  const currentDayInfo = DAYS[safeVisibleIndex];

  const fetchAllExercises = async () => {
    try {
      setLoading(true);
      const allExercises = await getExercises();

      // Initialize with empty arrays
      const grouped: Record<MuscleGroup, Exercise[]> = {
        Chest: [],
        Back: [],
        Shoulders: [],
        Legs: [],
        Biceps: [],
        Triceps: [],
        Abs: [],
      };

      // Group exercises by muscle group
      allExercises.forEach((exercise) => {
        if (isMuscleGroup(exercise.muscleGroup)) {
          grouped[exercise.muscleGroup].push(exercise);
        }
      });

      setExercisesByMuscle(grouped);
    } catch (error) {
      console.error("Error fetching exercises:", error);
      ToastAndroid.show("Error fetching exercises", ToastAndroid.SHORT);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = React.useCallback(() => {
    const initialIndex = todayIndex >= 0 ? todayIndex : 0;
    setRefreshing(true);
    setVisibleIndex(initialIndex);
    carouselRef.current?.scrollTo({ index: initialIndex });
    fetchAllExercises().finally(() => {
      setRefreshing(false);
    });
  }, [todayIndex]);

  useEffect(() => {
    const initialIndex = todayIndex >= 0 ? todayIndex : 0;
    setVisibleIndex(initialIndex);
    fetchAllExercises();
  }, []);

  const renderWorkoutCard = ({
    item,
  }: {
    item: DayInfo;
  }): React.ReactElement => {
    // Type guard to ensure item.muscle is a valid MuscleGroup
    if (!isMuscleGroup(item.muscle)) {
      return (
        <View>
          <Text>Invalid muscle group</Text>
        </View>
      );
    }

    const exercisesForMuscle = exercisesByMuscle[item.muscle];

    return (
      <LinearGradient
        colors={["#2c3e50", "#3498db"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <Text style={styles.headerText}>
          {item.day}'s Workout: {item.muscle}
        </Text>
        <View style={styles.contentContainer}>
          <View style={styles.exerciseListContainer}>
            {loading ? (
              <ActivityIndicator size="large" color="#3498db" />
            ) : exercisesForMuscle.length > 0 ? (
              exercisesForMuscle.map((exercise, idx) => (
                <View key={exercise.id} style={styles.exerciseItem}>
                  <Text style={styles.exerciseNumber}>{idx + 1}.</Text>
                  <Text style={styles.exerciseName}>{exercise.name}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.noExercisesText}>
                No exercises found for {item.muscle}
              </Text>
            )}
          </View>
          <View style={styles.imageContainer}>
            <Image
              source={muscleGroupImages[item.muscle]}
              style={styles.muscleImage}
              resizeMode="contain"
            />
          </View>
        </View>
      </LinearGradient>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollViewContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#3498db"
            colors={["#3498db"]}
            progressBackgroundColor="#2c3e50"
          />
        }
      >
        <View style={styles.cardsContainer}>
          <View style={styles.daysRow}>
            {DAYS.map((item, index) => (
              <TouchableOpacity
                key={item.day}
                style={[
                  styles.dayCard,
                  index === visibleIndex && styles.highlightedCard,
                ]}
                onPress={() => {
                  setVisibleIndex(index);
                  carouselRef.current?.scrollTo({ index });
                }}
              >
                <Text style={styles.dayText}>{item.day}</Text>
                <Text style={styles.muscleText}>{item.muscle}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.container}>
          <Carousel
            ref={carouselRef}
            loop
            width={width - 32}
            height={250}
            data={DAYS}
            scrollAnimationDuration={1000}
            onProgressChange={(_, absoluteProgress) => {
              const newIndex = Math.round(absoluteProgress);
              if (newIndex !== visibleIndex) {
                setVisibleIndex(newIndex);
              }
            }}
            renderItem={renderWorkoutCard}
            defaultIndex={todayIndex}
            style={styles.carousel}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "rgb(38, 38, 38)",
  },
  container: {
    flex: 1,
    padding: 16,
  },
  card: {
    flex: 1,
    borderRadius: 6,
    paddingTop: 16,
    paddingLeft: 16,
    minHeight: 250,
  },
  headerText: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
  },
  contentContainer: {
    flex: 1,
    flexDirection: "row",
    position: "relative",
    width: "100%",
    minHeight: 150,
  },
  exerciseListContainer: {
    flex: 1,
    paddingRight: 16,
    zIndex: 1,
  },
  exerciseItem: {
    flexDirection: "row",
    marginBottom: 4,
    textAlign: "left",
    alignItems: "flex-start",
  },
  exerciseNumber: {
    color: "white",
    fontSize: 16,
    marginRight: 8,
    width: 24,
    fontWeight: "bold",
  },
  exerciseName: {
    color: "white",
    fontSize: 16,
    flex: 1,
    fontWeight: "bold",
  },
  imageContainer: {
    width: "50%",
    position: "absolute",
    right: 0,
    bottom: 0,
    height: 250,
    justifyContent: "flex-end",
  },
  muscleImage: {
    width: "100%",
    height: "100%",
    marginBottom: -50,
  },
  carousel: {
    height: "auto",
    minHeight: 250,
  },
  noExercisesText: {
    color: "white",
    fontSize: 16,
  },
  scrollViewContent: {
    flexGrow: 1,
  },
  cardsContainer: {
    paddingTop: 10,
    paddingHorizontal: 6,
  },
  daysRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  dayCard: {
    backgroundColor: "rgb(58, 58, 58)",
    borderRadius: 6,
    padding: 8,
    flex: 1,
    marginHorizontal: 2,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
  },
  highlightedCard: {
    backgroundColor: "#3498db",
  },
  dayText: {
    color: "white",
    fontSize: 11,
    fontWeight: "bold",
    textAlign: "center",
  },
  muscleText: {
    color: "rgb(200, 200, 200)",
    fontSize: 9,
    textAlign: "center",
    marginTop: 2,
  },
});
