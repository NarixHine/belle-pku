import { render } from 'preact'
import { createShadowRootUi } from 'wxt/utils/content-script-ui/shadow-root'
import { CourseList } from './course-list'
import { debugError, debugLog } from './debug'
import { readElectedLessonsCache, writeElectedLessonsCache } from './elected-lessons-cache'
import {
    findActionableCourseTable,
    findElectedCourseTable,
    getCourseTableDiagnostics,
    parseCoursePagination,
    parseElectedCourses,
    parseElectedSummary,
    parseActionableCourses,
} from './parse-course-table'
import {
    findElectedResultsTable,
    findSupplementElectedTable,
    parseElectedLessons,
    parseElectedResultsLessons,
    parseSupplementElectedLessons,
} from './parse-timetable'
import { isElectiveResultsUrl, isElectiveWorkUrl, isSupplementUrl, isSupportedUrl } from './url'
import './styles.css'

const HOST_NAME = 'belle-pku-timetable'
const HIDDEN_TABLE_ATTRIBUTE = 'data-belle-hidden-course-table'
const HIDDEN_HINT_ATTRIBUTE = 'data-belle-hidden-course-hint'
const HIDDEN_PORTAL_ELEMENT_ATTRIBUTE = 'data-belle-hidden-portal-element'

export default defineContentScript({
    matches: ['https://elective.pku.edu.cn/elective2008/*'],
    runAt: 'document_idle',
    cssInjectionMode: 'ui',

    main(ctx) {
        let removeRoute: (() => void) | null = null
        let routeVersion = 0
        let startingVersion: number | null = null

        const stopRoute = () => {
            routeVersion += 1
            startingVersion = null
            removeRoute?.()
            removeRoute = null
            document.querySelector(HOST_NAME)?.remove()
            restoreTables()
        }

        const startRoute = async () => {
            const version = routeVersion
            refreshElectedLessonsCache()
            if (
                startingVersion !== null ||
                removeRoute ||
                !isSupportedUrl() ||
                !findActionableCourseTable()
            )
                return
            startingVersion = version
            try {
                const ui = await createShadowRootUi(ctx, {
                    name: HOST_NAME,
                    position: 'inline',
                    anchor: () => findActionableCourseTable(),
                    append: 'before',
                    isolateEvents: ['keyup', 'keydown', 'keypress', 'input', 'change'],
                    onMount(container) {
                        const draw = () => {
                            refreshElectedLessonsCache()
                            const table = findActionableCourseTable()
                            if (!table) return
                            const electedLessonTable =
                                findElectedCourseTable() ?? findSupplementElectedTable()
                            const existingLessons = electedLessonTable
                                ? parseElectedLessons(electedLessonTable)
                                : readElectedLessonsCache()
                            const courses = parseActionableCourses(existingLessons, table)
                            if (courses.length === 0) {
                                table.style.removeProperty('display')
                                table.removeAttribute(HIDDEN_TABLE_ATTRIBUTE)
                                render(null, container)
                                return
                            }
                            table.setAttribute(HIDDEN_TABLE_ATTRIBUTE, 'true')
                            table.style.setProperty('display', 'none', 'important')
                            const isPlanQuery = courses[0]?.actionLabel === '加入选课计划'
                            const isSupplement = courses[0]?.requiresCaptcha === true
                            const supplementElectedTable = isSupplement
                                ? findSupplementElectedTable()
                                : null
                            const selectableHint = isPlanQuery
                                ? ''
                                : hidePortalHint(
                                      isSupplement
                                          ? '只有点击“补选”后加入“已选上列表”的课程才为选上的课程'
                                          : '只有点击“预选”后加入"已选列表"的课程才为预选期间选择的课程',
                                  )
                            const electedTable = isPlanQuery
                                ? null
                                : isSupplement
                                  ? supplementElectedTable
                                  : findElectedCourseTable()
                            const electedCourses = parseElectedCourses(electedTable)
                            const electedHint = isPlanQuery
                                ? ''
                                : hidePortalHint(
                                      isSupplement
                                          ? '"已选上列表"中列出的是本学期已经选上的课程'
                                          : '"已选列表"中列出的是预选期间选择的课程，是否选上待抽签之后才能确定',
                                  )
                            if (!isPlanQuery && !isSupplement) {
                                hidePortalRow('选课计划中本学期可选列表')
                                hidePortalRow('已选列表')
                                hidePortalRow(
                                    '注：上课时间标注红色，表明所有选课（主辅修）上课时间或考试时间有冲突。',
                                )
                            }
                            if (isSupplement) {
                                hidePortalRow('选课计划中本学期可选列表')
                                hidePortalRow('已选上列表')
                            }
                            if (electedTable && electedCourses.length > 0) {
                                electedTable.setAttribute(HIDDEN_TABLE_ATTRIBUTE, 'true')
                                electedTable.style.setProperty('display', 'none', 'important')
                            }
                            if (supplementElectedTable) {
                                supplementElectedTable.setAttribute(HIDDEN_TABLE_ATTRIBUTE, 'true')
                                supplementElectedTable.style.setProperty(
                                    'display',
                                    'none',
                                    'important',
                                )
                            }
                            render(
                                <CourseList
                                    key={
                                        isPlanQuery
                                            ? 'course-plan'
                                            : isSupplement
                                              ? 'supplement'
                                              : 'selectable'
                                    }
                                    courses={courses}
                                    pagination={parseCoursePagination(table)}
                                    existingLessons={existingLessons}
                                    electedCourses={electedCourses}
                                    electedSummary={parseElectedSummary(electedTable)}
                                    electedPagination={
                                        electedTable ? parseCoursePagination(electedTable) : null
                                    }
                                    selectableHint={selectableHint}
                                    electedHint={electedHint}
                                    heading={
                                        isPlanQuery
                                            ? '加入选课计划'
                                            : isSupplement
                                              ? '补退选'
                                              : '本学期可选课程'
                                    }
                                    requiresCaptcha={isSupplement}
                                    showHomeButton
                                    electedHeading={isSupplement ? '已选上列表' : '已选列表'}
                                    electedCaptchaInputs={
                                        isSupplement ? courses[0]?.captchaInputs : undefined
                                    }
                                    electedCaptchaImageSrc={
                                        isSupplement ? courses[0]?.captchaImageSrc : undefined
                                    }
                                    viewStateKey={
                                        isPlanQuery
                                            ? 'course-plan'
                                            : isSupplement
                                              ? 'supplement'
                                              : 'selectable'
                                    }
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

                if (version !== routeVersion || !isSupportedUrl() || ctx.isInvalid) {
                    ui.remove()
                    return
                }
                ui.mount()
                ui.shadowHost.style.setProperty('display', 'block', 'important')
                ui.shadowHost.style.setProperty('width', '100%', 'important')
                debugLog('Course cards mounted', getCourseTableDiagnostics())

                let refreshFrame: number | null = null
                const observer = new MutationObserver(records => {
                    const courseTableChanged = records.some(
                        record =>
                            record.target instanceof Element &&
                            (Boolean(record.target.closest('table.datagrid')) ||
                                [...record.addedNodes, ...record.removedNodes].some(
                                    node =>
                                        node instanceof Element &&
                                        Boolean(
                                            node.matches('table.datagrid') ||
                                            node.querySelector('table.datagrid'),
                                        ),
                                )),
                    )
                    if (!courseTableChanged || refreshFrame !== null) return
                    refreshFrame = ctx.requestAnimationFrame(() => {
                        refreshFrame = null
                        if (!ui.shadowHost.isConnected && findActionableCourseTable()) ui.mount()
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
                if (startingVersion === version) startingVersion = null
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

function refreshElectedLessonsCache() {
    if (isElectiveResultsUrl()) {
        const lessons = parseElectedResultsLessons(findElectedResultsTable())
        if (lessons) {
            writeElectedLessonsCache(lessons)
            debugLog('Existing lessons cache refreshed from results', { count: lessons.length })
        }
        return
    }
    if (isElectiveWorkUrl()) {
        const table = findElectedCourseTable()
        if (!table) return
        const lessons = parseElectedLessons(table)
        writeElectedLessonsCache(lessons)
        debugLog('Existing lessons cache refreshed', { count: lessons.length })
        return
    }
    if (isSupplementUrl()) {
        const table = findSupplementElectedTable()
        if (!table) return
        const lessons = parseSupplementElectedLessons(table)
        if (!lessons) return
        writeElectedLessonsCache(lessons)
        debugLog('Existing lessons cache refreshed from supplement', { count: lessons.length })
    }
}

function restoreTables() {
    for (const table of document.querySelectorAll<HTMLElement>(`[${HIDDEN_TABLE_ATTRIBUTE}]`)) {
        table.style.removeProperty('display')
        table.removeAttribute(HIDDEN_TABLE_ATTRIBUTE)
    }
    for (const hint of document.querySelectorAll<HTMLElement>(`[${HIDDEN_HINT_ATTRIBUTE}]`)) {
        hint.style.removeProperty('display')
        hint.removeAttribute(HIDDEN_HINT_ATTRIBUTE)
    }
    for (const element of document.querySelectorAll<HTMLElement>(
        `[${HIDDEN_PORTAL_ELEMENT_ATTRIBUTE}]`,
    )) {
        element.style.removeProperty('display')
        element.removeAttribute(HIDDEN_PORTAL_ELEMENT_ATTRIBUTE)
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

function hidePortalRow(phrase: string) {
    const heading = Array.from(document.querySelectorAll<HTMLElement>('.subTitle')).find(element =>
        (element.textContent ?? '').replace(/\s+/g, ' ').includes(phrase),
    )
    const fallback = heading
        ? null
        : Array.from(document.querySelectorAll<HTMLTableRowElement>('tr')).find(element =>
              (element.textContent ?? '').replace(/\s+/g, ' ').includes(phrase),
          )
    const container = heading?.closest('td') ?? fallback
    if (!container || container.hasAttribute(HIDDEN_PORTAL_ELEMENT_ATTRIBUTE)) return
    container.setAttribute(HIDDEN_PORTAL_ELEMENT_ATTRIBUTE, 'true')
    container.style.setProperty('display', 'none', 'important')
}
