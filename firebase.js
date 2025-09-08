import { initializeApp } from 'firebase/app';
import { 
  initializeAuth, 
  getReactNativePersistence,
  getAuth, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged 
} from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import {
  getFirestore,
  collection,
  getDocs,
  getDoc,
  addDoc,
  query,
  where,
  deleteDoc,
  doc,
  setDoc,
  writeBatch,
  updateDoc
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyD7-UHqvWKSfKrEVrFkdIwiZEDeKMbdRVw",
  authDomain: "fitness-tracker-a56e2.firebaseapp.com",
  projectId: "fitness-tracker-a56e2",
  storageBucket: "fitness-tracker-a56e2.firebasestorage.app",
  messagingSenderId: "577555041359",
  appId: "1:577555041359:web:bec00fd5191da30d0fae3a",
  measurementId: "G-QR06LWXYFT",
};

const app = initializeApp(firebaseConfig);
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});
const db = getFirestore(app);

const defaultMuscleGroups = {
  'Chest': [
    'Bench Press',
    'Incline Dumbbell Press',
    'Decline Push-ups',
    'Dumbbell Flyes',
    'Cable Crossovers'
  ],
  'Back': [
    'Pull-ups',
    'Bent Over Rows',
    'Lat Pulldowns',
    'Deadlifts',
    'Face Pulls'
  ],
  'Shoulders': [
    'Military Press',
    'Lateral Raises',
    'Front Raises',
    'Reverse Flyes',
    'Shrugs'
  ],
  'Triceps': [
    'Tricep Pushdowns',
    'Skull Crushers',
    'Diamond Push-ups',
    'Overhead Extensions',
    'Rope Pushdowns'
  ],
  'Biceps': [
    'Barbell Curls',
    'Hammer Curls',
    'Preacher Curls',
    'Concentration Curls',
    'Cable Curls'
  ],
  'Legs': [
    'Squats',
    'Leg Press',
    'Romanian Deadlifts',
    'Leg Extensions',
    'Calf Raises'
  ],
  'Abs': [
    'Crunches',
    'Planks',
    'Leg Raises',
    'Russian Twists',
    'Mountain Climbers'
  ]
};

const defaultWorkoutPlans = [
  {
    name: "Push/Pull/Legs",
    frequency: "6 days/week",
    difficulty: "Intermediate",
    schedule: {
      monday: {
        muscleGroups: ["Chest", "Shoulders", "Triceps"],
        exercises: [] // Will be populated based on muscle groups
      },
      tuesday: {
        muscleGroups: ["Back", "Biceps"],
        exercises: []
      },
      wednesday: {
        muscleGroups: ["Legs"],
        exercises: []
      },
      thursday: {
        muscleGroups: ["Chest", "Shoulders", "Triceps"],
        exercises: []
      },
      friday: {
        muscleGroups: ["Back", "Biceps"],
        exercises: []
      },
      saturday: {
        muscleGroups: ["Legs"],
        exercises: []
      },
      sunday: {
        muscleGroups: [],
        exercises: []
      }
    }
  },
  {
    name: "Upper/Lower Split",
    frequency: "4 days/week",
    difficulty: "Beginner",
    schedule: {
      monday: {
        muscleGroups: ["Chest", "Back", "Shoulders", "Triceps", "Biceps"],
        exercises: []
      },
      tuesday: {
        muscleGroups: ["Legs"],
        exercises: []
      },
      wednesday: {
        muscleGroups: [],
        exercises: []
      },
      thursday: {
        muscleGroups: ["Chest", "Back", "Shoulders", "Triceps", "Biceps"],
        exercises: []
      },
      friday: {
        muscleGroups: ["Legs"],
        exercises: []
      },
      saturday: {
        muscleGroups: [],
        exercises: []
      },
      sunday: {
        muscleGroups: [],
        exercises: []
      }
    }
  },
  {
    name: "Full Body",
    frequency: "3 days/week",
    difficulty: "Beginner",
    schedule: {
      monday: {
        muscleGroups: ["Chest", "Back", "Legs", "Shoulders", "Triceps", "Biceps"],
        exercises: []
      },
      tuesday: {
        muscleGroups: [],
        exercises: []
      },
      wednesday: {
        muscleGroups: ["Chest", "Back", "Legs", "Shoulders", "Triceps", "Biceps"],
        exercises: []
      },
      thursday: {
        muscleGroups: [],
        exercises: []
      },
      friday: {
        muscleGroups: ["Chest", "Back", "Legs", "Shoulders", "Triceps", "Biceps"],
        exercises: []
      },
      saturday: {
        muscleGroups: [],
        exercises: []
      },
      sunday: {
        muscleGroups: [],
        exercises: []
      }
    }
  }
];

const initializeDefaultExercises = async (userId) => {
  try {
    const batch = writeBatch(db);
    const muscleGroupRefs = {};
    
    // Initialize muscle groups
    for (const muscleGroup of Object.keys(defaultMuscleGroups)) {
      const muscleGroupRef = doc(collection(db, `users/${userId}/muscleGroups`));
      batch.set(muscleGroupRef, {
        name: muscleGroup,
        createdAt: new Date()
      });
      muscleGroupRefs[muscleGroup] = muscleGroupRef;
    }
    
    // Initialize exercises and store them for later use
    const exercisesByMuscleGroup = {};
    for (const [muscleGroup, exercises] of Object.entries(defaultMuscleGroups)) {
      exercisesByMuscleGroup[muscleGroup] = [];
      for (const exercise of exercises) {
        const exerciseRef = doc(collection(db, `users/${userId}/exercises`));
        const exerciseData = {
          name: exercise,
          muscleGroup: muscleGroup,
          createdAt: new Date()
        };
        batch.set(exerciseRef, exerciseData);
        exercisesByMuscleGroup[muscleGroup].push({
          id: exerciseRef.id,
          ...exerciseData
        });
      }
    }
    
    // Initialize default workout plans with exercises
    for (const plan of defaultWorkoutPlans) {
      const planRef = doc(collection(db, `users/${userId}/workoutPlans`));
      const planData = { ...plan };
      
      // Populate exercises for each day based on muscle groups
      for (const [day, schedule] of Object.entries(planData.schedule)) {
        const exercises = schedule.muscleGroups.flatMap(mg => 
          exercisesByMuscleGroup[mg]?.slice(0, 3) || [] // Take first 3 exercises of each muscle group
        );
        planData.schedule[day].exercises = exercises;
      }
      
      batch.set(planRef, {
        ...planData,
        createdAt: new Date()
      });
    }
    
    await batch.commit();
  } catch (error) {
    throw error;
  }
};

export const signUp = async (email, password, fullName) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const userId = userCredential.user.uid;

    await setDoc(doc(db, 'users', userId), {
      email: email,
      fullName: fullName,
      createdAt: new Date(),
    });

    await initializeDefaultExercises(userId);
    return userCredential.user;
  } catch (error) {
    throw error;
  }
};


export const signIn = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    throw error;
  }
};

export const signOut = async () => {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    throw error;
  }
};

export const getCurrentUser = () => {
  return auth.currentUser;
};

export const addWorkoutLog = async (logData) => {
  try {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('User not authenticated');
    const userWorkoutLogsRef = collection(db, `users/${userId}/workoutLogs`);
    const docRef = await addDoc(userWorkoutLogsRef, {
      ...logData,
      createdAt: new Date()
    });
    return docRef.id;
  } catch (e) {
    throw e;
  }
};

export const getTodayWorkoutLog = async (date) => {
  try {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('User not authenticated');
    const userWorkoutLogsRef = collection(db, `users/${userId}/workoutLogs`);
    const q = query(userWorkoutLogsRef, where("date", "==", date));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (e) {
    return [];
  }
};

export const addMuscleGroup = async (muscleGroupName) => {
  try {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('User not authenticated');
    const userMuscleGroupsRef = collection(db, `users/${userId}/muscleGroups`);
    const docRef = await addDoc(userMuscleGroupsRef, {
      name: muscleGroupName,
      createdAt: new Date()
    });
    return docRef.id;
  } catch (e) {
    throw e;
  }
};

export const getMuscleGroups = async () => {
  try {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('User not authenticated');
    const userMuscleGroupsRef = collection(db, `users/${userId}/muscleGroups`);
    const muscleGroupSnapshot = await getDocs(userMuscleGroupsRef);
    return muscleGroupSnapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name
    }));
  } catch (error) {
    return [];
  }
};

export const addExercise = async (exerciseName, muscleGroup) => {
  try {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('User not authenticated');
    const userExercisesRef = collection(db, `users/${userId}/exercises`);
    const docRef = await addDoc(userExercisesRef, {
      name: exerciseName,
      muscleGroup: muscleGroup,
      createdAt: new Date()
    });
    return docRef.id;
  } catch (e) {
    throw e;
  }
};

export const getAllWorkoutLogs = async () => {
  try {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('User not authenticated');
    const userWorkoutLogsRef = collection(db, `users/${userId}/workoutLogs`);
    const querySnapshot = await getDocs(userWorkoutLogsRef);
    const logs = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    return logs.sort((a, b) => new Date(b.date) - new Date(a.date));
  } catch (e) {
    return [];
  }
};

export const getExercises = async () => {
  try {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('User not authenticated');
    const userExercisesRef = collection(db, `users/${userId}/exercises`);
    const exerciseSnapshot = await getDocs(userExercisesRef);
    return exerciseSnapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name,
      muscleGroup: doc.data().muscleGroup,
    }));
  } catch (error) {
    return [];
  }
};

export const deleteWorkoutLog = async (workoutId) => {
  try {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('User not authenticated');
    await deleteDoc(doc(db, `users/${userId}/workoutLogs`, workoutId));
  } catch (error) {
    throw new Error('Failed to delete workout log');
  }
};

// Workout Plan Management
export const createWorkoutPlan = async (planData) => {
  try {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('User not authenticated');

    const userPlanRef = doc(collection(db, `users/${userId}/workoutPlans`));
    await setDoc(userPlanRef, {
      ...planData,
      createdAt: new Date()
    });

    return userPlanRef.id;
  } catch (error) {
    console.error('Error creating workout plan:', error);
    throw error;
  }
};

export const getSelectedPlan = async () => {
  try {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('User not authenticated');

    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      console.log('User document does not exist');
      return null;
    }

    const selectedPlan = userDoc.data()?.selectedPlan;
    if (!selectedPlan) {
      console.log('No selected plan found');
      return null;
    }

    const planDocRef = doc(db, `users/${userId}/workoutPlans`, selectedPlan.id);
    const planDoc = await getDoc(planDocRef);
    
    if (!planDoc.exists()) {
      console.log('Plan document does not exist');
      return null;
    }

    return {
      id: planDoc.id,
      ...planDoc.data()
    };
  } catch (error) {
    console.error('Error getting selected plan:', error);
    return null;
  }
};

export const getTodaysWorkout = async () => {
  try {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('User not authenticated');

    const selectedPlan = await getSelectedPlan();
    if (!selectedPlan) return null;

    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    
    // Return today's workout from the selected plan
    return selectedPlan.schedule?.[today] || null;

  } catch (error) {
    console.error('Error getting today\'s workout:', error);
    return null;
  }
};

// Add these functions to your firebase.js file

export const getAllWorkoutPlans = async () => {
  try {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('User not authenticated');
    
    const userPlansRef = collection(db, `users/${userId}/workoutPlans`);
    const querySnapshot = await getDocs(userPlansRef);
    
    // Transform and validate the data
    const plans = querySnapshot.docs.map(doc => {
      const data = doc.data();
      
      const plan = {
        id: doc.id,
        name: data.name || '',
        frequency: data.frequency || '',
        difficulty: data.difficulty || '',
        schedule: {},
      };

      // Process the schedule data
      if (data.schedule) {
        Object.entries(data.schedule).forEach(([day, dayPlan]) => {
          plan.schedule[day] = {
            muscleGroups: Array.isArray(dayPlan.muscleGroups) ? dayPlan.muscleGroups : [],
            exercises: Array.isArray(dayPlan.exercises) 
              ? dayPlan.exercises.map(exercise => ({
                  id: exercise.id || '',
                  name: exercise.name || '',
                  muscleGroup: exercise.muscleGroup || ''
                }))
              : []
          };
        });
      }

      return plan;
    });
    
    return plans;
  } catch (error) {
    console.error('Error fetching workout plans:', error);
    return [];
  }
};

export const updateWorkoutPlan = async (planId, planData) => {
  try {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('User not authenticated');
    
    await setDoc(doc(db, `users/${userId}/workoutPlans`, planId), {
      ...planData,
      updatedAt: new Date()
    }, { merge: true });
    
    return planId;
  } catch (error) {
    throw error;
  }
};

export const deleteWorkoutPlan = async (planId) => {
  try {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('User not authenticated');
    
    await deleteDoc(doc(db, `users/${userId}/workoutPlans`, planId));
  } catch (error) {
    throw error;
  }
};
export const activateWorkoutPlan = async (planId) => {
  try {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('User not authenticated');

    // Get the plan details first to ensure it exists
    const planRef = doc(db, `users/${userId}/workoutPlans`, planId);
    const planDoc = await getDoc(planRef);
    
    if (!planDoc.exists()) {
      throw new Error('Workout plan not found');
    }

    // Update user document with the selected plan
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, {
      selectedPlan: {
        id: planId,
        activatedAt: new Date()
      }
    }, { merge: true });

    return true;
  } catch (error) {
    console.error('Error activating workout plan:', error);
    throw error;
  }
};

export const getActiveWorkoutPlan = async () => {
  try {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('User not authenticated');

    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists() || !userDoc.data().selectedPlan) {
      return null;
    }

    return userDoc.data().selectedPlan.id;
  } catch (error) {
    console.error('Error getting active workout plan:', error);
    return null;
  }
};

export const updateExercise = async (exerciseId, updatedData) => {
  try {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('User not authenticated');
    
    const exerciseRef = doc(db, `users/${userId}/exercises`, exerciseId);
    await updateDoc(exerciseRef, {
      ...updatedData,
      updatedAt: new Date()
    });
  } catch (error) {
    throw error;
  }
};

export const updateMuscleGroup = async (muscleGroupId, updatedData) => {
  try {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('User not authenticated');
    
    const muscleGroupRef = doc(db, `users/${userId}/muscleGroups`, muscleGroupId);
    await updateDoc(muscleGroupRef, {
      ...updatedData,
      updatedAt: new Date()
    });
  } catch (error) {
    throw error;
  }
};

export const deleteMuscleGroup = async (muscleGroupId) => {
  try {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('User not authenticated');
    await deleteDoc(doc(db, `users/${userId}/muscleGroups`, muscleGroupId));
  } catch (error) {
    throw error;
  }
};

export const deleteExercise = async (exerciseId) => {
  try {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('User not authenticated');
    await deleteDoc(doc(db, `users/${userId}/exercises`, exerciseId));
  } catch (error) {
    throw error;
  }
};

export {
  getDocs,
  doc,
  db,
  onAuthStateChanged,
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
};