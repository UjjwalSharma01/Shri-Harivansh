import { doc, getDoc, setDoc, deleteDoc, increment, serverTimestamp, collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from './firebase';

export async function syncProgressToFirebase(user, collectionId, sectionId, verseNumber) {
  if (!user) return;
  try {
    const progressRef = doc(db, 'users', user.uid, 'progress', collectionId);
    await setDoc(progressRef, {
      sectionId,
      verseNumber,
      lastUpdated: serverTimestamp()
    }, { merge: true });
  } catch (error) {
    console.error('Error syncing progress:', error);
  }
}

export async function getProgressFromFirebase(user, collectionId) {
  if (!user) return null;
  try {
    const progressRef = doc(db, 'users', user.uid, 'progress', collectionId);
    const snap = await getDoc(progressRef);
    if (snap.exists()) {
      return snap.data();
    }
  } catch (error) {
    console.error('Error getting progress:', error);
  }
  return null;
}

export async function setCalendarMarker(user, dateString, markerColorsArray) {
  if (!user || !dateString) return;
  try {
    const activityRef = doc(db, 'users', user.uid, 'dailyActivity', dateString);
    if (!markerColorsArray || markerColorsArray.length === 0 || markerColorsArray === 'clear') {
      // Allow clearing markers
      await setDoc(activityRef, { colors: [], color: null, date: dateString, lastUpdated: serverTimestamp() }, { merge: true });
    } else {
      await setDoc(activityRef, {
        date: dateString,
        colors: Array.isArray(markerColorsArray) ? markerColorsArray : [markerColorsArray],
        color: Array.isArray(markerColorsArray) ? markerColorsArray[0] : markerColorsArray, // Legacy compat
        lastUpdated: serverTimestamp()
      }, { merge: true });
    }
  } catch (error) {
    console.error('Error setting calendar marker:', error);
  }
}

export async function getCalendarMarkers(user) {
  if (!user) return {};
  try {
    const activityRef = collection(db, 'users', user.uid, 'dailyActivity');
    const querySnapshot = await getDocs(activityRef);
    const markers = {};
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.colors && Array.isArray(data.colors) && data.colors.length > 0) {
        markers[data.date] = data.colors;
      } else if (data.color) {
        markers[data.date] = [data.color];
      }
    });
    return markers;
  } catch (error) {
    console.error('Error getting calendar markers:', error);
    return {};
  }
}

export async function getCalendarColors(user) {
  if (!user) return null;
  try {
    const legendRef = doc(db, 'users', user.uid, 'settings', 'calendarLegend');
    const snap = await getDoc(legendRef);
    if (snap.exists() && snap.data().calendarColors) {
      return snap.data().calendarColors;
    }
    // Fallback if they had the old legendMap (backwards compatibility)
    if (snap.exists() && snap.data().legendMap) {
      return null; // Force them to use defaults that we map or handle in UI
    }
  } catch (error) {
    console.error('Error getting calendar legend:', error);
  }
  return null;
}

export async function setCalendarColors(user, calendarColors) {
  if (!user) return;
  try {
    const legendRef = doc(db, 'users', user.uid, 'settings', 'calendarLegend');
    await setDoc(legendRef, { calendarColors, lastUpdated: serverTimestamp() }, { merge: true });
  } catch (error) {
    console.error('Error setting calendar legend:', error);
  }
}

export async function getCalendarStartDate(user) {
  if (!user) return null;
  try {
    const legendRef = doc(db, 'users', user.uid, 'settings', 'calendarLegend');
    const snap = await getDoc(legendRef);
    if (snap.exists() && snap.data().customStartDate) {
      return snap.data().customStartDate;
    }
  } catch (error) {
    console.error('Error getting calendar start date:', error);
  }
  return null;
}

export async function setCalendarStartDate(user, startDateStr) {
  if (!user) return;
  try {
    const legendRef = doc(db, 'users', user.uid, 'settings', 'calendarLegend');
    await setDoc(legendRef, { customStartDate: startDateStr, lastUpdated: serverTimestamp() }, { merge: true });
  } catch (error) {
    console.error('Error setting calendar start date:', error);
  }
}


export async function toggleBookmark(user, collectionId, sectionId, verseNumber, isBookmarked) {
  if (!user) return;
  try {
    const bookmarkRef = doc(db, 'users', user.uid, 'bookmarks', `${collectionId}_${sectionId}_${verseNumber}`);
    if (isBookmarked) {
      await setDoc(bookmarkRef, {
        collectionId,
        sectionId,
        verseNumber,
        timestamp: serverTimestamp()
      });
    } else {
      await deleteDoc(bookmarkRef);
    }
  } catch (error) {
    console.error('Error toggling bookmark:', error)
  }
}

export async function getBookmarks(user) {
  if (!user) return [];
  try {
    const bookmarksRef = collection(db, 'users', user.uid, 'bookmarks');
    const q = query(bookmarksRef, orderBy('timestamp', 'desc'));
    const querySnapshot = await getDocs(q);
    const bookmarks = [];
    querySnapshot.forEach((doc) => {
      bookmarks.push(doc.data());
    });
    return bookmarks;
  } catch (error) {
    console.error('Error getting bookmarks:', error);
    return [];
  }
}
