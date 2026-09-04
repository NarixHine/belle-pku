import { findElectedCourseTable, parseCourseRow } from './parse-course-table'
import { debugLog } from './debug'
import type { LessonSlot } from './types'

const COURSE_ROW_SELECTOR = 'tr.datagrid-even, tr.datagrid-odd'

export function findElectedResultsTable(): HTMLTableElement | null {
    const tables = Array.from(document.querySelectorAll<HTMLTableElement>('table.datagrid'))
    return (
        tables.find(table => {
            const header = Array.from(table.rows).find(row => row.querySelector('th'))
            if (!header) return false
            const headers = Array.from(header.cells).map(cell => normalize(cell.textContent))
            return (
                headers.includes('课程号') &&
                headers.includes('课程名') &&
                headers.includes('教室信息') &&
                headers.includes('选课结果')
            )
        }) ?? null
    )
}

export function findSupplementElectedTable(): HTMLTableElement | null {
    const tables = Array.from(document.querySelectorAll<HTMLTableElement>('table.datagrid'))
    return (
        tables.find(table => {
            const header = Array.from(table.rows).find(row => row.querySelector('th'))
            if (!header) return false
            const headers = Array.from(header.cells).map(cell => normalize(cell.textContent))
            return (
                headers.includes('课程号') &&
                headers.includes('课程名') &&
                headers.includes('上课/考试信息') &&
                headers.includes('选课状态')
            )
        }) ?? null
    )
}

export function parseSupplementElectedLessons(
    table: HTMLTableElement | null = findSupplementElectedTable(),
): LessonSlot[] | null {
    if (!table) return null
    const header = Array.from(table.rows).find(row => row.querySelector('th'))
    if (!header) return null

    const headers = Array.from(header.cells).map(cell => normalize(cell.textContent))
    const statusIndex = headers.indexOf('选课状态')
    if (statusIndex < 0) return null

    const rows = Array.from(table.querySelectorAll<HTMLTableRowElement>(COURSE_ROW_SELECTOR))
    const parsedRows = rows.map(row => ({
        section: parseCourseRow(row),
        status: normalize(row.cells[statusIndex]?.textContent),
    }))
    if (parsedRows.some(({ section, status }) => !section || status !== '已选上')) return null

    return parsedRows.flatMap(({ section }) =>
        section
            ? section.lessons.map(lesson => ({ ...lesson, courseName: section.courseName }))
            : [],
    )
}

export function parseElectedLessons(
    table: HTMLTableElement | null = findElectedCourseTable(),
): LessonSlot[] {
    if (!table) {
        debugLog('Existing lessons: elected table not found; using an empty schedule')
        return []
    }

    const lessons = Array.from(
        table.querySelectorAll<HTMLTableRowElement>(COURSE_ROW_SELECTOR),
    ).flatMap(row => {
        const section = parseCourseRow(row)
        if (!section) return []

        return section.lessons.map(lesson => ({
            ...lesson,
            courseName: section.courseName,
        }))
    })
    debugLog('Existing lessons parsed', { count: lessons.length, lessons })
    return lessons
}

export function parseElectedResultsLessons(
    table: HTMLTableElement | null = findElectedResultsTable(),
): LessonSlot[] | null {
    if (!table) return null
    const header = Array.from(table.rows).find(row => row.querySelector('th'))
    if (!header) return null

    const headers = Array.from(header.cells).map(cell => normalize(cell.textContent))
    const resultIndex = headers.indexOf('选课结果')
    if (resultIndex < 0) return null

    const rows = Array.from(table.querySelectorAll<HTMLTableRowElement>(COURSE_ROW_SELECTOR))
    const parsedRows = rows.map(row => {
        const section = parseCourseRow(row)
        const result = normalize(row.cells[resultIndex]?.textContent)
        return { section, result }
    })
    if (parsedRows.some(({ section, result }) => !section || !result)) return null

    const lessons = parsedRows.flatMap(({ section, result }) =>
        result.includes('已选上') && section
            ? section.lessons.map(lesson => ({ ...lesson, courseName: section.courseName }))
            : [],
    )
    debugLog('Existing lessons parsed from results', { count: lessons.length, lessons })
    return lessons
}

function normalize(value: string | null | undefined): string {
    return (value ?? '').replace(/\s+/g, '').trim()
}
