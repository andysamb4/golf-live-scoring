import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, setDoc, doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Course, TeeSet, Group } from '../types';

// Web app config from the MCP we just provisioned!
const firebaseConfig = {
  apiKey: "AIzaSyAjis1FNqgxi3f1kvUxpfXOcLtM1yvxpe0",
  authDomain: "golf-live-scoring-db.firebaseapp.com",
  projectId: "golf-live-scoring-db",
  storageBucket: "golf-live-scoring-db.firebasestorage.app",
  messagingSenderId: "52553785102",
  appId: "1:52553785102:web:adefdcdee17b375011c15f"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Collection Reference
const coursesCollection = collection(db, 'courses');

/** Generate a stable document ID from the course name */
const slugify = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

/**
 * Searches the crowdsourced database for courses matching the given name.
 */
export const searchCoursesFromDb = async (courseName: string): Promise<Course[]> => {
  try {
    const querySnapshot = await getDocs(coursesCollection);
    const courses: Course[] = [];
    const searchLower = courseName.toLowerCase();

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data() as Course;
      if (data.name.toLowerCase().includes(searchLower)) {
        courses.push({ ...data, id: data.id || docSnap.id });
      }
    });

    return courses;
  } catch (error) {
    console.error('Error searching courses in DB:', error);
    throw error;
  }
};

export type SaveResult =
  | { status: 'saved'; id: string }
  | { status: 'duplicate'; id: string; existingCourse: Course }
  | { status: 'merged'; id: string }; // new tee sets added to an existing doc

/**
 * Saves or updates a course in the crowdsourced database.
 * - New course           → saves and returns { status: 'saved' }
 * - Exact name match     → returns { status: 'duplicate', existingCourse }
 *   UNLESS the incoming course has tee sets that don't exist yet → { status: 'merged' }
 */
export const saveCourseToDb = async (course: Course): Promise<SaveResult> => {
  try {
    const slugId = slugify(course.name);
    const docRef = doc(db, 'courses', slugId);
    const existingDoc = await getDoc(docRef);

    if (!existingDoc.exists()) {
      // Brand new course — save everything
      await setDoc(docRef, { ...course, id: slugId });
      return { status: 'saved', id: slugId };
    }

    // Course already exists
    const existingCourse = { ...existingDoc.data(), id: slugId } as Course;

    // Check if there are new tee sets to merge in
    const incomingTeeSets: TeeSet[] = course.teeSets ?? [];
    const existingTeeSets: TeeSet[] = existingCourse.teeSets ?? [];

    const newTees = incomingTeeSets.filter(
      (incoming) =>
        !existingTeeSets.some(
          (ex) => ex.name.toLowerCase() === incoming.name.toLowerCase()
        )
    );

    if (newTees.length > 0) {
      // Merge new tee sets in
      const mergedTeeSets = [...existingTeeSets, ...newTees];
      await updateDoc(docRef, { teeSets: mergedTeeSets });
      return { status: 'merged', id: slugId };
    }

    // Pure duplicate — return existing so UI can offer it
    return { status: 'duplicate', id: slugId, existingCourse };
  } catch (error) {
    console.error('Error saving course to DB:', error);
    throw error;
  }
};

/** Fetch a single course document by its slug ID */
export const getCourseById = async (id: string): Promise<Course | null> => {
  try {
    const docRef = doc(db, 'courses', id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;
    return { ...docSnap.data(), id } as Course;
  } catch (error) {
    console.error('Error fetching course by ID:', error);
    return null;
  }
};

export { db };

// ─── Groups Collection ────────────────────────────────────────────────────────

const groupsCollection = collection(db, 'groups');

/** Load all groups from Firestore */
export const loadGroupsFromDb = async (): Promise<Group[]> => {
  try {
    const snapshot = await getDocs(groupsCollection);
    return snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Group));
  } catch (error) {
    console.error('Error loading groups from DB:', error);
    return [];
  }
};

/** Create or overwrite a group document in Firestore */
export const saveGroupToDb = async (group: Group): Promise<void> => {
  try {
    const docRef = doc(db, 'groups', group.id);
    await setDoc(docRef, group);
  } catch (error) {
    console.error('Error saving group to DB:', error);
    throw error;
  }
};

/** Delete a group document from Firestore */
export const deleteGroupFromDb = async (id: string): Promise<void> => {
  try {
    const docRef = doc(db, 'groups', id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting group from DB:', error);
    throw error;
  }
};

/** Fetch a single group document from Firestore */
export const getGroupFromDb = async (id: string): Promise<Group | undefined> => {
  try {
    const docRef = doc(db, 'groups', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return undefined;
    return { ...snap.data(), id } as Group;
  } catch (error) {
    console.error('Error fetching group from DB:', error);
    return undefined;
  }
};
