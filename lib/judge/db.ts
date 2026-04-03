/**
 * ArtTime Judge — IndexedDB через Dexie
 * Хранит данные судейства для полной офлайн-работы
 */
import Dexie, { type Table } from 'dexie'

export interface JudgeSession {
  id: string               // festivalId + judgeId
  judgeId: string
  festivalId: string
  judgeName: string
  assignments: unknown[]
  applications: unknown[]
  savedAt: number          // timestamp
}

export interface PendingScore {
  id?: number              // auto-increment
  key: string              // `${applicationId}:${nominationId}`
  judgeId: string
  festivalId: string
  applicationId: string
  nominationId: string
  totalScore: number
  criteriaScores: Record<string, number>
  createdAt: number
  retries: number
}

export interface SyncedScore {
  key: string              // `${applicationId}:${nominationId}`
  judgeId: string
  totalScore: number
  criteriaScores: Record<string, number>
  syncedAt: number
}

class JudgeDatabase extends Dexie {
  sessions!: Table<JudgeSession>
  pending!: Table<PendingScore>
  synced!: Table<SyncedScore>

  constructor() {
    super('arttime-judge-v1')
    this.version(1).stores({
      sessions: 'id, judgeId, festivalId, savedAt',
      pending: '++id, key, judgeId, festivalId, createdAt',
      synced: 'key, judgeId, syncedAt',
    })
  }
}

// Singleton — безопасно для SSR (lazy init)
let _db: JudgeDatabase | null = null

export function getJudgeDb(): JudgeDatabase {
  if (typeof window === 'undefined') throw new Error('IndexedDB only on client')
  if (!_db) _db = new JudgeDatabase()
  return _db
}

// ============================================================
// Helpers
// ============================================================

/** Сохранить сессию судьи (данные с сервера) */
export async function saveJudgeSession(session: Omit<JudgeSession, 'savedAt'>) {
  const db = getJudgeDb()
  await db.sessions.put({ ...session, savedAt: Date.now() })
}

/** Загрузить последнюю сессию для данного festivalId + judgeId */
export async function loadJudgeSession(festivalId: string, judgeId: string): Promise<JudgeSession | undefined> {
  const db = getJudgeDb()
  return db.sessions.get(`${festivalId}:${judgeId}`)
}

/** Добавить оценку в очередь на синхронизацию */
export async function queueScore(score: Omit<PendingScore, 'id' | 'createdAt' | 'retries'>) {
  const db = getJudgeDb()
  // Удаляем предыдущую версию если есть
  await db.pending.where('key').equals(score.key).delete()
  await db.pending.add({ ...score, createdAt: Date.now(), retries: 0 })
}

/** Получить все ожидающие синхронизации оценки */
export async function getPendingScores(judgeId: string): Promise<PendingScore[]> {
  const db = getJudgeDb()
  return db.pending.where('judgeId').equals(judgeId).toArray()
}

/** Пометить оценку как синхронизированную */
export async function markScoreSynced(key: string, judgeId: string, totalScore: number, criteriaScores: Record<string, number>) {
  const db = getJudgeDb()
  await db.pending.where('key').equals(key).delete()
  await db.synced.put({ key, judgeId, totalScore, criteriaScores, syncedAt: Date.now() })
}

/** Загрузить все синхронизированные оценки для судьи */
export async function getSyncedScores(judgeId: string): Promise<SyncedScore[]> {
  const db = getJudgeDb()
  return db.synced.where('judgeId').equals(judgeId).toArray()
}
