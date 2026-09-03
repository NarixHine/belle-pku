import { render } from 'preact'
import { createShadowRootUi } from 'wxt/utils/content-script-ui/shadow-root'
import { CourseList } from './course-list'
import { debugError, debugLog } from './debug'
import {
    findSelectableCourseTable,
    findElectedCourseTable,
    getCourseTableDiagnostics,
    parseCoursePagination,
    parseElectedCourses,
    parseElectedSummary,
    parseSelectableCourses,
} from './parse-course-table'
import { parseElectedLessons } from './parse-timetable'
import { isSupportedUrl } from './url'
import './styles.css'

const HOST_NAME = 'belle-pku-timetable'
const HIDDEN_TABLE_ATTRIBUTE = 'data-belle-hidden-course-table'
const HIDDEN_HINT_ATTRIBUTE = 'data-belle-hidden-course-hint'

export default defineContentScript({
    matches: ['https://elective.pku.edu.cn/elective2008/*'],
    runAt: 'document_idle',
    cssInjectionMode: 'ui',

    main(ctx) {
        let removeRoute: (() => void) | null = null
        let starting = false

        const stopRoute = () => {
            removeRoute?.()
            removeRoute = null
            document.querySelector(HOST_NAME)?.remove()
            restoreTables()
        }

        const startRoute = async () => {
            if (starting || removeRoute || !isSupportedUrl() || !findSelectableCourseTable()) return
            starting = true
            try {
                const ui = await createShadowRootUi(ctx, {
                    name: HOST_NAME,
                    position: 'inline',
                    anchor: () => findSelectableCourseTable(),
                    append: 'before',
                    isolateEvents: ['keyup', 'keydown', 'keypress', 'input', 'change'],
                    onMount(container) {
                        const draw = () => {
                            const table = findSelectableCourseTable()
                            if (!table) return
                            const existingLessons = parseElectedLessons()
                            const courses = parseSelectableCourses(existingLessons, table)
                            if (courses.length === 0) {
                                table.style.removeProperty('display')
                                table.removeAttribute(HIDDEN_TABLE_ATTRIBUTE)
                                render(null, container)
                                return
                            }
                            table.setAttribute(HIDDEN_TABLE_ATTRIBUTE, 'true')
                            table.style.setProperty('display', 'none', 'important')
                            const selectableHint = hidePortalHint('只有点击“预选”后加入"已选列表"的课程才为预选期间选择的课程')
                            const electedTable = findElectedCourseTable()
                            const electedCourses = parseElectedCourses(electedTable)
                            const electedHint = hidePortalHint('"已选列表"中列出的是预选期间选择的课程，是否选上待抽签之后才能确定')
                            if (electedTable && electedCourses.length > 0) {
                                electedTable.setAttribute(HIDDEN_TABLE_ATTRIBUTE, 'true')
                                electedTable.style.setProperty('display', 'none', 'important')
                            }
                            render(
                                <CourseList
                                    courses={courses}
                                    pagination={parseCoursePagination(table)}
                                    existingLessons={existingLessons}
                                    electedCourses={electedCourses}
                                    electedSummary={parseElectedSummary(electedTable)}
                                    electedPagination={electedTable ? parseCoursePagination(electedTable) : null}
                                    selectableHint={selectableHint}
                                    electedHint={electedHint}
                                />,
                                container,
                            )
                        }
                        draw()
                        return { container, draw }
                    },
                    onRemove(mounted) {
                        if (mounted) render(null, mounted.container)
                    },
                })

                if (!isSupportedUrl() || ctx.isInvalid) return
                ui.mount()
                ui.shadowHost.style.setProperty('display', 'block', 'important')
                ui.shadowHost.style.setProperty('width', '100%', 'important')
                debugLog('Course cards mounted', getCourseTableDiagnostics())

                let refreshFrame: number | null = null
                const observer = new MutationObserver(records => {
                    const courseTableChanged = records.some(record =>
                        record.target instanceof Element &&
                        (Boolean(record.target.closest('table.datagrid')) ||
                            [...record.addedNodes, ...record.removedNodes].some(
                                node => node instanceof Element && Boolean(node.matches('table.datagrid') || node.querySelector('table.datagrid')),
                            )),
                    )
                    if (!courseTableChanged || refreshFrame !== null) return
                    refreshFrame = ctx.requestAnimationFrame(() => {
                        refreshFrame = null
                        if (!ui.shadowHost.isConnected && findSelectableCourseTable()) ui.mount()
                        ui.mounted?.draw()
                    })
                })
                observer.observe(document.body, { childList: true, subtree: true })

                removeRoute = () => {
                    observer.disconnect()
                    if (refreshFrame !== null) cancelAnimationFrame(refreshFrame)
                    ui.remove()
                    restoreTables()
                }
            } catch (error) {
                debugError('Failed to initialize course cards', error)
                document.querySelector(HOST_NAME)?.remove()
                restoreTables()
            } finally {
                starting = false
            }
        }

        const handleLocationChange = () => {
            stopRoute()
            if (isSupportedUrl()) void startRoute()
        }

        if (isSupportedUrl()) void startRoute()
        ctx.addEventListener(window, 'wxt:locationchange', handleLocationChange)
        ctx.onInvalidated(stopRoute)
    },
})

function restoreTables() {
    for (const table of document.querySelectorAll<HTMLElement>(`[${HIDDEN_TABLE_ATTRIBUTE}]`)) {
        table.style.removeProperty('display')
        table.removeAttribute(HIDDEN_TABLE_ATTRIBUTE)
    }
    for (const hint of document.querySelectorAll<HTMLElement>(`[${HIDDEN_HINT_ATTRIBUTE}]`)) {
        hint.style.removeProperty('display')
        hint.removeAttribute(HIDDEN_HINT_ATTRIBUTE)
    }
}

function hidePortalHint(phrase: string): string {
    const hint = Array.from(document.querySelectorAll<HTMLElement>('.errmsg')).find(element =>
        (element.textContent ?? '').includes(phrase),
    )
    if (!hint) return ''
    hint.setAttribute(HIDDEN_HINT_ATTRIBUTE, 'true')
    hint.style.setProperty('display', 'none', 'important')
    return phrase
}
