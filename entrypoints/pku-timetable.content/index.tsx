import { render } from 'preact'
import { createShadowRootUi } from 'wxt/utils/content-script-ui/shadow-root'
import { CourseList } from './course-list'
import { debugError, debugLog } from './debug'
import {
    findSelectableCourseTable,
    getCourseTableDiagnostics,
    parseCoursePagination,
    parseSelectableCourses,
} from './parse-course-table'
import { parseElectedLessons } from './parse-timetable'
import { isSupportedUrl } from './url'
import './styles.css'

const HOST_NAME = 'belle-pku-timetable'
const HIDDEN_TABLE_ATTRIBUTE = 'data-belle-hidden-course-table'

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
                            table.setAttribute(HIDDEN_TABLE_ATTRIBUTE, 'true')
                            table.style.setProperty('display', 'none', 'important')
                            render(
                                <CourseList
                                    courses={parseSelectableCourses(existingLessons, table)}
                                    pagination={parseCoursePagination(table)}
                                    existingLessons={existingLessons}
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
}
