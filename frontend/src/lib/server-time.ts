import { useEffect, useState } from 'react'

let serverTimeOffsetMs = 0
let isSynchronized = false

/**
 * Synchronize frontend clock with server timestamp to ensure 100% consistent time
 * across all client devices and prevent client clock tampering or drift.
 */
export function syncServerTime(serverIsoOrDate: string | Date | number): void {
  try {
    const serverTimestamp =
      typeof serverIsoOrDate === 'number'
        ? serverIsoOrDate
        : new Date(serverIsoOrDate).getTime()

    if (!isNaN(serverTimestamp)) {
      serverTimeOffsetMs = serverTimestamp - Date.now()
      isSynchronized = true
    }
  } catch {
    // Ignore invalid timestamps gracefully
  }
}

/**
 * Get current time synchronized with server clock.
 */
export function getServerTime(): Date {
  return new Date(Date.now() + serverTimeOffsetMs)
}

/**
 * Check if the clock has been synchronized with the server.
 */
export function isServerTimeSynchronized(): boolean {
  return isSynchronized
}

export interface FormattedDateTime {
  full: string       // "Sabtu, 17 Oktober 2026 • 13:45:54 WIB"
  compact: string    // "13:45:54 WIB"
  shortDate: string  // "17 Okt 2026"
  datePart: string   // "Sabtu, 17 Oktober 2026"
  timePart: string   // "13:45:54 WIB"
}

/**
 * Format date in Indonesian locale (id-ID) and locked to Asia/Jakarta (WIB) timezone.
 */
export function formatIndonesianDateTime(date: Date): FormattedDateTime {
  try {
    const datePart = new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date)

    const shortDate = new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date)

    const timeRaw = new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(date)

    // Standard id-ID replaces dots with colons for digital clock format: HH:mm:ss
    const timeFormatted = timeRaw.replace(/\./g, ':')

    return {
      full: `${datePart} • ${timeFormatted} WIB`,
      compact: `${timeFormatted} WIB`,
      shortDate,
      datePart,
      timePart: `${timeFormatted} WIB`,
    }
  } catch {
    return {
      full: date.toISOString(),
      compact: date.toTimeString(),
      shortDate: date.toLocaleDateString(),
      datePart: date.toDateString(),
      timePart: date.toTimeString(),
    }
  }
}

/**
 * React hook that yields current synchronized server time updating every 1000ms.
 */
export function useServerClock(): Date {
  const [currentTime, setCurrentTime] = useState<Date>(() => getServerTime())

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentTime(getServerTime())
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [])

  return currentTime
}
