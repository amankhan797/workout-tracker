import { View, ScrollView, StyleSheet, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ProgressGraph from "./screens/progress";
import PersonalRecord from "./screens/personalRecord";
import { useState, useCallback, useRef } from "react";
import MuscleStats from "./screens/muscleStats";

const ProgressScreen = () => {
  const [refreshing, setRefreshing] = useState(false);
  const progressGraphRef = useRef<{ fetchChartData: () => Promise<void> }>();
  const personalRecordRef = useRef<{ fetchData: () => Promise<void> }>();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        progressGraphRef.current?.fetchChartData?.(),
        personalRecordRef.current?.fetchData?.(),
      ]);
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#ffffff"]}
            tintColor="#ffffff"
            progressBackgroundColor="rgb(38, 38, 38)"
          />
        }
      >
        <View style={styles.content}>
          <ProgressGraph ref={progressGraphRef} />
          <MuscleStats/>
          <PersonalRecord ref={personalRecordRef} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "rgb(38, 38, 38)",
    padding: 16,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    gap: 16,
  },
});

export default ProgressScreen;