import type { ContentScriptContext } from 'wxt/utils/content-script-context'
import { debugLog, debugWarn } from './debug'
import { findSelectableCourseTable, parseCourseRow } from './parse-course-table'
import { parseElectedLessons } from './parse-timetable'
import type { CourseSection, LessonSlot } from './types'

interface HoverControllerOptions {
    ctx: ContentScriptContext
    onPreview: (section: CourseSection, existing: LessonSlot[]) => void
    onClose: () => void
    onLayoutChange: () => void
}

const COURSE_ROW_SELECTOR = 'tr.datagrid-even, tr.datagrid-odd'
const HOVER_DELAY = 100

export function createHoverController({
    ctx,
    onPreview,
    onClose,
    onLayoutChange,
}: HoverControllerOptions): () => void {
    let activeRow: HTMLTableRowElement | null = null
    let hoverTimer: number | null = null
    let layoutFrame: number | null = null
    let didLogEventDelivery = false

    const clearHoverTimer = () => {
        if (hoverTimer !== null) window.clearTimeout(hoverTimer)
        hoverTimer = null
    }

    const close = () => {
        clearHoverTimer()
        activeRow = null
        onClose()
    }

    const getRowFromEvent = (event: MouseEvent): HTMLTableRowElement | null => {
        const pathRow = event.composedPath().find(
            node => node instanceof HTMLTableRowElement && node.matches(COURSE_ROW_SELECTOR),
        )
        const target = event.target
        const row = pathRow instanceof HTMLTableRowElement
            ? pathRow
            : target instanceof Element
              ? target.closest<HTMLTableRowElement>(COURSE_ROW_SELECTOR)
              : null
        const table = findSelectableCourseTable()
        return row && table?.contains(row) ? row : null
    }

    const handleMouseEnter = (row: HTMLTableRowElement) => {
        if (!didLogEventDelivery) {
            didLogEventDelivery = true
            debugLog('Hover: capture listener received its first mouseover', {
                target: row,
                rowConnected: row.isConnected,
                selectableTableFound: Boolean(findSelectableCourseTable()),
            })
        }
        if (row === activeRow) return

        clearHoverTimer()
        activeRow = row
        debugLog('Hover: selectable row entered', {
            rowIndex: row.rowIndex,
            courseCode: row.cells[0]?.textContent?.trim(),
        })
        hoverTimer = ctx.setTimeout(() => {
            if (activeRow !== row || !row.isConnected) return
            const section = parseCourseRow(row)
            if (!section) {
                debugWarn('Hover: row was found but could not be parsed', row)
                close()
                return
            }
            const existing = parseElectedLessons()
            debugLog('Hover: opening preview', {
                candidate: section.courseName,
                candidateMeetings: section.lessons.length,
                existingMeetings: existing.length,
            })
            onPreview(section, existing)
        }, HOVER_DELAY)
    }

    const handleMouseOver = (event: MouseEvent) => {
        const row = getRowFromEvent(event)
        if (!row || row.contains(event.relatedTarget as Node | null)) return
        handleMouseEnter(row)
    }

    const handleMouseOut = (event: MouseEvent) => {
        const row = getRowFromEvent(event)
        if (!row || row !== activeRow || row.contains(event.relatedTarget as Node | null)) return
        close()
    }

    const scheduleLayout = () => {
        if (layoutFrame !== null) return
        layoutFrame = ctx.requestAnimationFrame(() => {
            layoutFrame = null
            onLayoutChange()
        })
    }

    ctx.addEventListener(window, 'mouseover', handleMouseOver, { capture: true, passive: true })
    ctx.addEventListener(window, 'mouseout', handleMouseOut, { capture: true, passive: true })
    ctx.addEventListener(window, 'scroll', scheduleLayout, { passive: true })
    ctx.addEventListener(window, 'resize', scheduleLayout, { passive: true })

    debugLog('Hover controller installed with row pointer delegation')

    return () => {
        close()
        if (layoutFrame !== null) cancelAnimationFrame(layoutFrame)
    }
}
