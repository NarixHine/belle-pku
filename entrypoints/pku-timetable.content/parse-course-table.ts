import { parseScheduleLines, splitHtmlLines } from './parse-schedule'
import { debugLog, debugWarn } from './debug'
import type {
    CoursePagination,
    CourseSection,
    ElectedCourse,
    ElectedSummary,
    LessonSlot,
    SelectableCourse,
} from './types'
import { createPreviewModel } from './visual-model'

interface CourseColumns {
    courseCode: number
    courseName: number
    teacher: number
    sectionNumber: number
    info: number
}

interface SelectableCourseColumns extends CourseColumns {
    category: number
    credits: number
    weeklyHours: number
    department: number
    grade: number
    pnp: number
    capacity: number
    willingness: number
    action: number
}

const columnLabels: Record<keyof CourseColumns, string> = {
    courseCode: '课程号',
    courseName: '课程名',
    teacher: '教师',
    sectionNumber: '班号',
    info: '上课/考试信息',
}

const selectableColumnLabels: Record<keyof SelectableCourseColumns, string> = {
    ...columnLabels,
    category: '课程类别',
    credits: '学分',
    weeklyHours: '周学时',
    department: '开课单位',
    grade: '年级',
    pnp: '自选P/NP',
    capacity: '限数/已选',
    willingness: '意愿值',
    action: '预选',
}

export function findSelectableCourseTable(): HTMLTableElement | null {
    return findCourseTableByAction('预选', 'electCourse.do')
}

export function findElectedCourseTable(): HTMLTableElement | null {
    return findCourseTableByAction('取消', 'cancelCourse.do')
}

function findCourseTableByAction(
    actionHeader: string,
    actionPath: string,
): HTMLTableElement | null {
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
    if (!courseName) {
        debugWarn('Row parser: course name is missing', {
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

export function parseSelectableCourses(
    existingLessons: LessonSlot[],
    table: HTMLTableElement | null = findSelectableCourseTable(),
): SelectableCourse[] {
    if (!table) return []
    const columns = getColumnsFromLabels(table, selectableColumnLabels)
    if (!columns) return []

    return Array.from(
        table.querySelectorAll<HTMLTableRowElement>('tr.datagrid-even, tr.datagrid-odd'),
    ).flatMap(row => {
        const section = parseCourseRow(row)
        const actionLink = row.querySelector<HTMLAnchorElement>('a[href*="electCourse.do"]')
        if (!section || !actionLink) return []

        const [capacity = 0, selected = 0] = cellText(row, columns.capacity)
            .split('/')
            .map(value => Number.parseInt(value.trim(), 10) || 0)
        const willingnessCell = row.cells[columns.willingness]
        const willingnessInput = willingnessCell?.querySelector<HTMLInputElement>('input') ?? null
        const scheduleLines = splitHtmlLines(section.infoCell).filter(
            line => !line.includes('data-belle-course-badge'),
        )

        return [
            {
                ...section,
                category: cellText(row, columns.category),
                credits: Number.parseFloat(cellText(row, columns.credits)) || 0,
                weeklyHours: Number.parseFloat(cellText(row, columns.weeklyHours)) || 0,
                department: cellText(row, columns.department),
                grade: cellText(row, columns.grade),
                pnp: formatPnp(cellText(row, columns.pnp)),
                capacity,
                selected,
                willingness: willingnessInput?.value || cellText(row, columns.willingness),
                scheduleLines,
                detailUrl:
                    row.querySelector<HTMLAnchorElement>('a[href*="goNested.do"]')?.href || '',
                actionLink,
                willingnessInput,
                willingnessMin: willingnessInput?.min || '',
                willingnessMax: willingnessInput?.max || '',
                conflictCount: createPreviewModel(existingLessons, section).conflictCount,
            },
        ]
    })
}

export function parseElectedCourses(
    table: HTMLTableElement | null = findElectedCourseTable(),
): ElectedCourse[] {
    if (!table) return []
    const columns = getColumnsFromLabels(table, { ...selectableColumnLabels, action: '取消' })
    if (!columns) return []

    return Array.from(
        table.querySelectorAll<HTMLTableRowElement>('tr.datagrid-even, tr.datagrid-odd'),
    ).flatMap(row => {
        const section = parseCourseRow(row)
        const cancelLink = row.querySelector<HTMLAnchorElement>('a[href*="cancelCourse.do"]')
        if (!section || !cancelLink) return []
        const [capacity = 0, selected = 0] = cellText(row, columns.capacity)
            .split('/')
            .map(value => Number.parseInt(value.trim(), 10) || 0)
        const willingnessInput =
            row.cells[columns.willingness]?.querySelector<HTMLInputElement>('input') ?? null
        return [
            {
                ...section,
                category: cellText(row, columns.category),
                credits: Number.parseFloat(cellText(row, columns.credits)) || 0,
                weeklyHours: Number.parseFloat(cellText(row, columns.weeklyHours)) || 0,
                department: cellText(row, columns.department),
                grade: cellText(row, columns.grade),
                pnp: formatPnp(cellText(row, columns.pnp)),
                capacity,
                selected,
                willingness: willingnessInput?.value || cellText(row, columns.willingness),
                scheduleLines: splitHtmlLines(section.infoCell),
                detailUrl:
                    row.querySelector<HTMLAnchorElement>('a[href*="goNested.do"]')?.href || '',
                cancelLink,
                willingnessInput,
                willingnessUpdateLink:
                    Array.from(
                        row.cells[columns.willingness]?.querySelectorAll<HTMLAnchorElement>('a') ??
                            [],
                    ).find(link => link.textContent?.trim() === '修改') ?? null,
                willingnessMin: willingnessInput?.min || '',
                willingnessMax: willingnessInput?.max || '',
            },
        ]
    })
}

export function parseElectedSummary(
    table: HTMLTableElement | null = findElectedCourseTable(),
): ElectedSummary | null {
    if (!table) return null
    const text = Array.from(table.rows)
        .map(row => row.textContent ?? '')
        .join(' ')
    const totalCredits = text.match(/当前已选总学分为：\s*([\d.]+)/)?.[1] || ''
    const remainingWillingness = text.match(/剩余意愿值：\s*([\d.]+)/)?.[1] || ''
    return totalCredits || remainingWillingness ? { totalCredits, remainingWillingness } : null
}

export function parseCoursePagination(table: HTMLTableElement): CoursePagination | null {
    const footerText = Array.from(table.rows)
        .map(row => row.textContent ?? '')
        .find(text => /Page\s+\d+\s+of\s+\d+/i.test(text))
    const match = footerText?.match(/Page\s+(\d+)\s+of\s+(\d+)/i)
    if (!match?.[1] || !match[2]) return null

    const links = Array.from(table.querySelectorAll<HTMLAnchorElement>('a'))
    return {
        currentPage: Number.parseInt(match[1], 10),
        totalPages: Number.parseInt(match[2], 10),
        nextLink: links.find(link => link.textContent?.trim() === 'Next') ?? null,
        lastLink: links.find(link => link.textContent?.trim() === 'Last') ?? null,
        pageSelect: table.querySelector<HTMLSelectElement>('select[name="netui_row"]'),
    }
}

function formatPnp(value: string): string {
    if (!value) return ''
    return /P\s*\/\s*NP/i.test(value) ? value : `${value} P/NP`
}

function getColumns(table: HTMLTableElement): CourseColumns | null {
    return getColumnsFromLabels(table, columnLabels)
}

function getColumnsFromLabels<T extends Record<keyof T, string>>(
    table: HTMLTableElement,
    labels: T,
): { [Key in keyof T]: number } | null {
    const header = Array.from(table.rows).find(row => row.querySelector('th'))
    if (!header) return null

    const headers = Array.from(header.cells).map(cell =>
        (cell.textContent ?? '').replace(/\s+/g, '').trim(),
    )
    const columns = Object.fromEntries(
        Object.entries(labels).map(([key, label]) => [
            key,
            headers.findIndex(headerText => headerText.includes(String(label))),
        ]),
    ) as { [Key in keyof T]: number }

    const requiredColumns = Object.values(columns) as number[]
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
