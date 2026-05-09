import { useState, useEffect, useCallback } from 'react'
import { getRecords } from '../lib/storage'
import type { CpeRecord } from '../types'

const CACHE_KEY = 'cpe_records_cache'

function readCache(): CpeRecord[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? (JSON.parse(raw) as CpeRecord[]) : null
  } catch {
    return null
  }
}

function writeCache(records: CpeRecord[]): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(records))
  } catch {}
}

export function useRecords() {
  const [records, setRecords] = useState<CpeRecord[]>(() => readCache() ?? [])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getRecords()
      setRecords(data)
      writeCache(data)
    } catch (e) {
      if (!readCache()) setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  return { records, loading, error, refresh: fetch, setRecords }
}
