import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { collection, getDocs, addDoc, query, where, deleteDoc, doc } from "firebase/firestore";

// const firebaseConfig = {
//   apiKey: "AIzaSyBFlhFxt4bs9y5b1oqUvNXBkZ5rX2jjbx4",
//   authDomain: "workouttracker-517a6.firebaseapp.com",
//   projectId: "workouttracker-517a6",
//   storageBucket: "workouttracker-517a6.firebasestorage.app",
//   messagingSenderId: "162763793949",
//   appId: "1:162763793949:web:3cb70513384e42da9508f4",
//   measurementId: "G-EX1T2J5GNE"
// };
const firebaseConfig = {
  apiKey: "AIzaSyD7-UHqvWKSfKrEVrFkdIwiZEDeKMbdRVw",
  authDomain: "fitness-tracker-a56e2.firebaseapp.com",
  projectId: "fitness-tracker-a56e2",
  storageBucket: "fitness-tracker-a56e2.firebasestorage.app",
  messagingSenderId: "577555041359",
  appId: "1:577555041359:web:bec00fd5191da30d0fae3a",
  measurementId: "G-QR06LWXYFT",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Function to add a workout log
export const addWorkoutLog = async (logData) => {
  try {
    const docRef = await addDoc(collection(db, "workoutLogs"), logData);
    console.log("Document written with ID: ", docRef.id);
  } catch (e) {
    console.error("Error adding document: ", e);
  }
};

// Function to fetch today's workout logs
export const getTodayWorkoutLog = async (date) => {
  try {
    const q = query(collection(db, "workoutLogs"), where("date", "==", date));
    const querySnapshot = await getDocs(q);
    const logs = [];
    querySnapshot.forEach((doc) => {
      logs.push(doc.data());
    });
    return logs;
  } catch (e) {
    console.error("Error getting documents: ", e);
    return [];
  }
};

// Function to fetch muscle groups and exercises for dynamic dropdowns or forms (optional)
export const fetchMuscleGroupsAndExercises = async () => {
  try {
    // Fetch muscle groups
    const muscleGroupSnapshot = await getDocs(collection(db, "muscleGroups"));
    const muscleGroups = muscleGroupSnapshot.docs.map((doc) => doc.id); // Or doc.data() if you store data like name

    // Fetch exercises
    const exerciseSnapshot = await getDocs(collection(db, "exercises"));
    const exercises = exerciseSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return { muscleGroups, exercises };
  } catch (error) {
    console.error("Error fetching data: ", error);
    return { muscleGroups: [], exercises: [] };
  }
};

// Function to fetch muscle groups from Firestore
export const getMuscleGroups = async () => {
    try {
      const muscleGroupSnapshot = await getDocs(collection(db, 'muscleGroups'));
      const muscleGroups = muscleGroupSnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name
      }));
      return muscleGroups;
    } catch (error) {
      console.error('Error fetching muscle groups: ', error);
      return [];
    }
  };

export const getExercises = async () => {
  try {
    const exerciseSnapshot = await getDocs(collection(db, "exercises"));
    const exercises = exerciseSnapshot.docs.map((doc) => ({
      id: doc.id,
      name: doc.data().name, // Make sure we're getting the name field
      muscleGroup: doc.data().muscleGroup,
    }));
    return exercises;
  } catch (error) {
    console.error("Error fetching exercises: ", error);
    return [];
  }
};

// Function to add a new muscle group to Firestore
export const addMuscleGroup = async (muscleGroupName) => {
    try {
      const docRef = await addDoc(collection(db, "muscleGroups"), {
        name: muscleGroupName
      });
      console.log("Muscle group added with ID: ", docRef.id);
    } catch (e) {
      console.error("Error adding muscle group: ", e);
    }
  };
// Function to add a new exercise to Firestore
export const addExercise = async (exerciseName, muscleGroup) => {
  try {
    const docRef = await addDoc(collection(db, "exercises"), {
      name: exerciseName, // Make sure we're storing the name field
      muscleGroup: muscleGroup,
    });
    console.log("Exercise added with ID: ", docRef.id);
  } catch (e) {
    console.error("Error adding exercise: ", e);
  }
};

export const getAllWorkoutLogs = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, "workoutLogs"));
    const logs = [];
    querySnapshot.forEach((doc) => {
      logs.push({
        id: doc.id,
        ...doc.data()
      });
    });
    return logs.sort((a, b) => new Date(b.date) - new Date(a.date)); // Sort by date descending
  } catch (e) {
    console.error("Error getting documents: ", e);
    return [];
  }
};

export const deleteWorkoutLog = async (workoutId) => {
  try {
    await deleteDoc(doc(db, "workoutLogs", workoutId));
    console.log("Document successfully deleted!");
  } catch (error) {
    console.error("Error deleting document: ", error);
    throw new Error('Failed to delete workout log');
  }
};