import { openDB, DBSchema, IDBPDatabase } from 'idb'

interface PendingAttendance {
  id?: number
  studentId: string
  roomId: string
  date: string
  status: string
  markedBy: string
  createdAt: string
}

interface CachedGrade {
  id?: number
  studentId: string
  subjectId: string
  assignmentId: string
  score: number
  maxScore: number
  cachedAt: string
}

interface OfflineDB extends DBSchema {
  pendingAttendance: {
    key: number
    value: PendingAttendance
    indexes: { 'by-student': string; 'by-date': string }
  }
  cachedGrades: {
    key: number
    value: CachedGrade
    indexes: { 'by-student': string; 'by-subject': string }
  }
}

let dbPromise: Promise<IDBPDatabase<OfflineDB>> | null = null

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<OfflineDB>('school-platform-offline', 1, {
      upgrade(db) {
        const attendanceStore = db.createObjectStore('pendingAttendance', {
          keyPath: 'id',
          autoIncrement: true,
        })
        attendanceStore.createIndex('by-student', 'studentId')
        attendanceStore.createIndex('by-date', 'date')

        const gradesStore = db.createObjectStore('cachedGrades', {
          keyPath: 'id',
          autoIncrement: true,
        })
        gradesStore.createIndex('by-student', 'studentId')
        gradesStore.createIndex('by-subject', 'subjectId')
      },
    })
  }
  return dbPromise
}

export async function savePendingAttendance(attendance: Omit<PendingAttendance, 'id' | 'createdAt'>) {
  const db = await getDB()
  await db.add('pendingAttendance', {
    ...attendance,
    createdAt: new Date().toISOString(),
  })
}

export async function getPendingAttendance(): Promise<PendingAttendance[]> {
  const db = await getDB()
  return db.getAll('pendingAttendance')
}

export async function clearPendingAttendance() {
  const db = await getDB()
  await db.clear('pendingAttendance')
}

export async function deletePendingAttendance(id: number) {
  const db = await getDB()
  await db.delete('pendingAttendance', id)
}

export async function saveCachedGrades(grades: Omit<CachedGrade, 'id' | 'cachedAt'>[]) {
  const db = await getDB()
  const tx = db.transaction('cachedGrades', 'readwrite')
  await tx.store.clear()
  for (const grade of grades) {
    await tx.store.add({
      ...grade,
      cachedAt: new Date().toISOString(),
    })
  }
  await tx.done
}

export async function getCachedGrades(studentId?: string): Promise<CachedGrade[]> {
  const db = await getDB()
  if (studentId) {
    return db.getAllFromIndex('cachedGrades', 'by-student', studentId)
  }
  return db.getAll('cachedGrades')
}

export async function clearCachedGrades() {
  const db = await getDB()
  await db.clear('cachedGrades')
}

export async function hasPendingData(): Promise<boolean> {
  const db = await getDB()
  const pending = await db.count('pendingAttendance')
  return pending > 0
}

export async function syncPendingData(): Promise<{ success: boolean; synced: number; failed: number }> {
  const pending = await getPendingAttendance()
  let synced = 0
  let failed = 0

  for (const attendance of pending) {
    try {
      const { id, ...data } = attendance
      const token = localStorage.getItem("token");
      if (!token) {
        console.error("No authentication token found for offline sync.");
        failed++;
        continue;
      }

      const response = await fetch("/api/attendance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        await deletePendingAttendance(id!)
        synced++
      } else {
        failed++
      }
    } catch {
      failed++
    }
  }

  return { success: failed === 0, synced, failed }
}
