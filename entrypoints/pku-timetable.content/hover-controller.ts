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

const COURSE_BADGE_SELECTOR = '[data-belle-course-badge]'
const COURSE_ROW_SELECTOR = 'tr.datagrid-even, tr.datagrid-odd'
const HOVER_DELAY = 100

export function createHoverController({
    ctx,
    onPreview,
    onClose,
    onLayoutChange,
}: HoverControllerOptions): () => void {
    let activeBadge: HTMLElement | null = null
    let hoverTimer: number | null = null
    let layoutFrame: number | null = null
    let didLogEventDelivery = false

    const clearHoverTimer = () => {
        if (hoverTimer !== null) window.clearTimeout(hoverTimer)
        hoverTimer = null
    }

    const close = () => {
        clearHoverTimer()
        activeBadge = null
        onClose()
    }

    const getBadgeFromEvent = (event: MouseEvent): HTMLElement | null => {
        const pathBadge = event
            .composedPath()
            .find(node => node instanceof HTMLElement && node.matches(COURSE_BADGE_SELECTOR))
        if (pathBadge instanceof HTMLElement) return pathBadge
        const target = event.target
        return target instanceof Element ? target.closest<HTMLElement>(COURSE_BADGE_SELECTOR) : null
    }

    const getRow = (badge: HTMLElement): HTMLTableRowElement | null => {
        const row = badge.closest<HTMLTableRowElement>(COURSE_ROW_SELECTOR)
        const table = findSelectableCourseTable()
        return row && table?.contains(row) ? row : null
    }

    const handleMouseEnter = (badge: HTMLElement) => {
        const row = getRow(badge)
        if (!row) {
            close()
            return
        }
        if (!didLogEventDelivery) {
            didLogEventDelivery = true
            debugLog('Hover: capture listener received its first mouseover', {
                target: row,
                rowConnected: row.isConnected,
                selectableTableFound: Boolean(findSelectableCourseTable()),
            })
        }
        if (badge === activeBadge) return

        clearHoverTimer()
        activeBadge = badge
        debugLog('Hover: course badge entered', {
            rowIndex: row.rowIndex,
            courseCode: row.cells[0]?.textContent?.trim(),
        })
        hoverTimer = ctx.setTimeout(() => {
            if (activeBadge !== badge || !row.isConnected) return
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
        const badge = getBadgeFromEvent(event)
        if (!badge || badge.contains(event.relatedTarget as Node | null)) return
        handleMouseEnter(badge)
    }

    const handleMouseOut = (event: MouseEvent) => {
        const badge = getBadgeFromEvent(event)
        if (!badge || badge !== activeBadge || badge.contains(event.relatedTarget as Node | null))
            return
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

    debugLog('Hover controller installed with badge pointer delegation')

    return () => {
        close()
        if (layoutFrame !== null) cancelAnimationFrame(layoutFrame)
    }
}
