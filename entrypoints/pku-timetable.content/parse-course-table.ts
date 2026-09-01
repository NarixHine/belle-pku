import { parseScheduleLines, splitHtmlLines } from './parse-schedule'
import { debugLog, debugWarn } from './debug'
import type { CourseSection } from './types'

interface CourseColumns {
    courseCode: number
    courseName: number
    teacher: number
    sectionNumber: number
    info: number
}

const columnLabels: Record<keyof CourseColumns, string> = {
    courseCode: '课程号',
    courseName: '课程名',
    teacher: '教师',
    sectionNumber: '班号',
    info: '上课/考试信息',
}

export function findSelectableCourseTable(): HTMLTableElement | null {
    return findCourseTableByAction('预选', 'electCourse.do')
}

export function findElectedCourseTable(): HTMLTableElement | null {
    return findCourseTableByAction('取消', 'cancelCourse.do')
}

function findCourseTableByAction(actionHeader: string, actionPath: string): HTMLTableElement | null {
    const tables = Array.from(document.querySelectorAll<HTMLTableElement>('table.datagrid'))
    const table =
        tables.find(table => table.querySelector(`a[href*="${actionPath}"]`)) ??
        tables.find(table => {
            const header = Array.from(table.rows).find(row => row.querySelector('th'))
            if (!header) return false

            const headers = Array.from(header.cells).map(cell =>
                (cell.textContent ?? '').replace(/\s+/g, '').trim(),
            )
            return (
                headers.some(header => header.includes(columnLabels.info)) &&
                headers.some(header => header.includes(actionHeader))
            )
        }) ??
        null

    return table
}

export function parseCourseRow(row: HTMLTableRowElement): CourseSection | null {
    const table = row.closest('table')
    if (!(table instanceof HTMLTableElement)) {
        debugWarn('Row parser: row has no parent table', row)
        return null
    }

    const columns = getColumns(table)
    if (!columns || row.cells.length <= Math.max(...Object.values(columns))) {
        debugWarn('Row parser: required columns are missing', {
            cellCount: row.cells.length,
            columns,
        })
        return null
    }

    const courseCode = cellText(row, columns.courseCode)
    if (!/^\d+$/.test(courseCode)) {
        debugWarn('Row parser: course code is not numeric', { courseCode })
        return null
    }

    const courseName = cellText(row, columns.courseName)
    const teacher = cellText(row, columns.teacher)
    const sectionNumber = cellText(row, columns.sectionNumber)
    const infoCell = row.cells[columns.info]
    if (!infoCell) {
        debugWarn('Row parser: schedule cell is missing', { courseCode, columns })
        return null
    }
    const scheduleLines = splitHtmlLines(infoCell)
    const lessons = parseScheduleLines(scheduleLines)
    if (!courseName || lessons.length === 0) {
        debugWarn('Row parser: no lesson lines parsed', {
            courseCode,
            courseName,
            scheduleLines,
        })
        return null
    }

    const detailUrl = row.querySelector<HTMLAnchorElement>('a[href*="goNested.do"]')?.href
    const rowIndex = Array.from(table.rows).indexOf(row)

    const section = {
        id: detailUrl || `${courseCode}-${sectionNumber || rowIndex}`,
        courseCode,
        courseName,
        teacher,
        sectionNumber,
        lessons,
        infoCell,
        sourceRow: row,
    }
    debugLog('Row parser: candidate parsed', section)
    return section
}

function getColumns(table: HTMLTableElement): CourseColumns | null {
    const header = Array.from(table.rows).find(row => row.querySelector('th'))
    if (!header) return null

    const headers = Array.from(header.cells).map(cell =>
        (cell.textContent ?? '').replace(/\s+/g, '').trim(),
    )
    const columns = Object.fromEntries(
        Object.entries(columnLabels).map(([key, label]) => [
            key,
            headers.findIndex(headerText => headerText.includes(label)),
        ]),
    ) as unknown as CourseColumns

    const requiredColumns = Object.values(columns)
    return requiredColumns.every(index => index >= 0) ? columns : null
}

export function getCourseTableDiagnostics(): object {
    const tables = Array.from(document.querySelectorAll<HTMLTableElement>('table.datagrid'))
    const describe = (table: HTMLTableElement) => ({
        headers: Array.from(table.querySelectorAll('th')).map(th =>
            (th.textContent ?? '').replace(/\s+/g, ' ').trim(),
        ),
        rows: table.querySelectorAll('tr.datagrid-even, tr.datagrid-odd').length,
        hasElectAction: Boolean(table.querySelector('a[href*="electCourse.do"]')),
        hasCancelAction: Boolean(table.querySelector('a[href*="cancelCourse.do"]')),
    })

    return {
        datagridCount: tables.length,
        selectableFound: Boolean(findSelectableCourseTable()),
        electedFound: Boolean(findElectedCourseTable()),
        tables: tables.map(describe),
    }
}

function cellText(row: HTMLTableRowElement, index: number): string {
    if (index < 0) return ''
    return (row.cells[index]?.textContent ?? '').replace(/\s+/g, ' ').trim()
}
