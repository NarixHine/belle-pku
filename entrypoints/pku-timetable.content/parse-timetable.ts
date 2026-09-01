import { findElectedCourseTable, parseCourseRow } from './parse-course-table'
import { debugLog } from './debug'
import type { LessonSlot } from './types'

const COURSE_ROW_SELECTOR = 'tr.datagrid-even, tr.datagrid-odd'

export function parseElectedLessons(
    table: HTMLTableElement | null = findElectedCourseTable(),
): LessonSlot[] {
    if (!table) {
        debugLog('Existing lessons: elected table not found; using an empty schedule')
        return []
    }

    const lessons = Array.from(
        table.querySelectorAll<HTMLTableRowElement>(COURSE_ROW_SELECTOR),
    ).flatMap(
        row => {
            const section = parseCourseRow(row)
            if (!section) return []

            return section.lessons.map(lesson => ({
                ...lesson,
                courseName: section.courseName,
            }))
        },
    )
    debugLog('Existing lessons parsed', { count: lessons.length, lessons })
    return lessons
}
