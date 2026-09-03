import type { DayOfWeek, LessonSlot } from './types'

const STORAGE_KEY = 'belle-pku:elected-lessons:v1'

interface ElectedLessonsCache {
    version: 1
    updatedAt: number
    lessons: LessonSlot[]
}

export function writeElectedLessonsCache(lessons: LessonSlot[]): void {
    const cache: ElectedLessonsCache = {
        version: 1,
        updatedAt: Date.now(),
        lessons: lessons.map(
            ({ dayOfWeek, startSlot, endSlot, weeks, frequency, location, courseName }) => ({
                dayOfWeek,
                startSlot,
                endSlot,
                weeks,
                frequency,
                location,
                courseName,
            }),
        ),
    }

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cache))
    } catch {
        // The elective portal can run with storage disabled in restrictive browser contexts.
    }
}

export function readElectedLessonsCache(): LessonSlot[] {
    try {
        const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
        if (!isCache(parsed)) return []
        return parsed.lessons
    } catch {
        return []
    }
}

function isCache(value: unknown): value is ElectedLessonsCache {
    if (!value || typeof value !== 'object') return false
    const cache = value as Partial<ElectedLessonsCache>
    return (
        cache.version === 1 &&
        typeof cache.updatedAt === 'number' &&
        Array.isArray(cache.lessons) &&
        cache.lessons.every(isLessonSlot)
    )
}

function isLessonSlot(value: unknown): value is LessonSlot {
    if (!value || typeof value !== 'object') return false
    const lesson = value as Partial<LessonSlot>
    return (
        isDayOfWeek(lesson.dayOfWeek) &&
        typeof lesson.startSlot === 'number' &&
        typeof lesson.endSlot === 'number' &&
        typeof lesson.weeks === 'string' &&
        typeof lesson.frequency === 'string' &&
        typeof lesson.location === 'string' &&
        (lesson.courseName === undefined || typeof lesson.courseName === 'string')
    )
}

function isDayOfWeek(value: unknown): value is DayOfWeek {
    return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 7
}
