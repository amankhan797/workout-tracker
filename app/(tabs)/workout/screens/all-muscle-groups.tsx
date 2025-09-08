import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Alert,
  TextInput,
  ActivityIndicator,
  ListRenderItem
} from 'react-native';
import BottomSheet from "@gorhom/bottom-sheet";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { getMuscleGroups, updateMuscleGroup, deleteMuscleGroup } from '../../../../firebase';
import { Button } from '../../../../components/Button';
import { IconButton } from '../../../../components/IconButton';
import { useTheme } from '../../../context/ThemeContext';
import Chest from '../../../../components/muscleGroup/Chest';
import Shoulder from '../../../../components/muscleGroup/Shoulder';
import Back from '@/components/muscleGroup/Back';
import Legs from '@/components/muscleGroup/Legs';
import Biceps from '@/components/muscleGroup/Biceps';
import Abs from '@/components/muscleGroup/Abs';
import Triceps from '@/components/muscleGroup/Triceps';

export interface MuscleGroup {
    id: string;
    name: string;
}

const AllMuscleGroups: React.FC = () => {
  const { themeColor } = useTheme();
  const bottomSheetRef = useRef<BottomSheet>(null);
  const [muscleGroups, setMuscleGroups] = useState<MuscleGroup[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<MuscleGroup | null>(null);
  const [newName, setNewName] = useState<string>('');

  useEffect(() => {
    loadMuscleGroups();
  }, []);

  const loadMuscleGroups = async (): Promise<void> => {
    try {
      const muscleGroupData = await getMuscleGroups();
      setMuscleGroups(muscleGroupData);
    } catch (error) {
      Alert.alert('Error', 'Failed to load muscle groups');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (muscleGroup: MuscleGroup): Promise<void> => {
    Alert.alert(
      'Delete Muscle Group',
      `Are you sure you want to delete ${muscleGroup.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMuscleGroup(muscleGroup.id);
              await loadMuscleGroups();
              Alert.alert('Success', 'Muscle group deleted successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete muscle group');
            }
          }
        }
      ]
    );
  };

  const handleEdit = (muscleGroup: MuscleGroup): void => {
    setSelectedMuscleGroup(muscleGroup);
    setNewName(muscleGroup.name);
    bottomSheetRef.current?.expand();
  };

  const handleUpdate = async (): Promise<void> => {
    if (!selectedMuscleGroup || !newName.trim()) {
      Alert.alert('Error', 'Muscle group name cannot be empty');
      return;
    }

    try {
      await updateMuscleGroup(selectedMuscleGroup.id, {
        name: newName.trim()
      });
      bottomSheetRef.current?.close();
      await loadMuscleGroups();
      Alert.alert('Success', 'Muscle group updated successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to update muscle group');
    }
  };

  const renderItem: ListRenderItem<MuscleGroup> = ({ item }) => (
    <View style={styles.muscleGroupItem}>
      <Text style={styles.muscleGroupName}>{item.name}</Text>
      <View style={styles.actions}>
        {item.name.toLowerCase() === 'chest' && (
          <Chest muscleColor={themeColor} width={38} height={38} />
        )}
        {item.name.toLowerCase() === 'shoulders' && (
          <Shoulder muscleColor={themeColor} width={38} height={38} />
        )}
        {item.name.toLowerCase() === 'back' && (
          <Back muscleColor={themeColor} width={38} height={38} />
        )}
        {item.name.toLowerCase() === 'legs' && (
          <Legs muscleColor={themeColor} width={38} height={38} />
        )}
        {item.name.toLowerCase() === 'biceps' && (
          <Biceps muscleColor={themeColor} width={38} height={38} />
        )}
        {item.name.toLowerCase() === 'abs' && (
          <Abs muscleColor={themeColor} width={38} height={38} />
        )}
        {item.name.toLowerCase() === 'triceps' && (
          <Triceps muscleColor={themeColor} width={38} height={38} />
        )}
        <IconButton 
          name="pencil" 
          size={24} 
          color={themeColor} 
          onPress={() => handleEdit(item)} 
          style={styles.actionButton}
        />
        <IconButton 
          name="trash-outline" 
          size={24} 
          color="#FF3B30" 
          onPress={() => handleDelete(item)} 
          style={styles.actionButton}
        />
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={themeColor} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        <FlatList<MuscleGroup>
          data={muscleGroups}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No muscle groups found</Text>
          }
        />

        <BottomSheet
          ref={bottomSheetRef}
          index={-1}
          snapPoints={['50%']}
          enablePanDownToClose
          backgroundStyle={{ backgroundColor: 'rgb(38, 38, 38)' }}
          handleIndicatorStyle={{ backgroundColor: '#666' }}
          onClose={() => {
            setSelectedMuscleGroup(null);
            setNewName('');
          }}
        >
          <View style={styles.bottomSheetContent}>
            <Text style={styles.bottomSheetTitle}>Edit Muscle Group</Text>
            <TextInput
              style={styles.input}
              value={newName}
              onChangeText={setNewName}
              placeholder="Enter new name"
              placeholderTextColor="#999"
            />
            <View style={styles.bottomSheetActions}>
              <Button
                title="Cancel"
                variant="secondary"
                onPress={() => bottomSheetRef.current?.close()}
                style={styles.cancelButton}
                textStyle={styles.buttonText}
              />
              <Button
                title="Update"
                variant="primary"
                onPress={handleUpdate}
                style={[styles.updateButton, { backgroundColor: themeColor }]}
                textStyle={styles.buttonText}
              />
            </View>
          </View>
        </BottomSheet>
      </View>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgb(38, 38, 38)',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgb(38, 38, 38)',
  },
  list: {
    padding: 16,
  },
  muscleGroupItem: {
    backgroundColor: "#444",
    borderWidth: 1,
    borderColor: "#666",
    borderRadius: 8,
    padding: 8,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  muscleGroupName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ddd',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    marginTop: 24,
  },
  bottomSheetContent: {
    padding: 24,
  },
  bottomSheetTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
    color: '#ddd',
  },
  input: {
    borderWidth: 1,
    borderColor: '#666',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
    backgroundColor: '#444',
    color: '#fff',
  },
  bottomSheetActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  cancelButton: {
    backgroundColor: '#FF3B30',
  },
  updateButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 8,
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AllMuscleGroups;