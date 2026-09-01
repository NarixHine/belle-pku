import { render } from 'preact'
import { createShadowRootUi } from 'wxt/utils/content-script-ui/shadow-root'
import { debugError, debugLog } from './debug'
import { createHoverController } from './hover-controller'
import {
    getCourseTableDiagnostics,
    parseCourseRow,
    findSelectableCourseTable,
} from './parse-course-table'
import { parseElectedLessons } from './parse-timetable'
import { calculateOverlayPosition } from './positioning'
import { TimetablePreview } from './timetable-preview'
import type { PreviewModel } from './types'
import { isSupportedUrl } from './url'
import { createPreviewModel } from './visual-model'
import './styles.css'

const HOST_NAME = 'belle-pku-timetable'

export default defineContentScript({
    matches: ['https://elective.pku.edu.cn/elective2008/*'],
    runAt: 'document_idle',
    cssInjectionMode: 'ui',

    main(ctx) {
        debugLog('Content script loaded', {
            href: location.href,
            supportedUrl: isSupportedUrl(),
        })
        let removeRoute: (() => void) | null = null
        let starting = false

        const stopRoute = () => {
            removeRoute?.()
            removeRoute = null
            document.querySelector(HOST_NAME)?.remove()
        }

        const startRoute = async () => {
            if (starting || removeRoute || !isSupportedUrl() || document.querySelector(HOST_NAME)) {
                return
            }

            starting = true
            try {
                let model: PreviewModel | null = null
                const ui = await createShadowRootUi(ctx, {
                    name: HOST_NAME,
                    position: 'modal',
                    anchor: 'body',
                    zIndex: 2147483000,
                    onMount(container) {
                        const draw = () => render(<TimetablePreview model={model} />, container)
                        draw()
                        return { container, draw }
                    },
                    onRemove(mounted) {
                        if (mounted) render(null, mounted.container)
                    },
                })

                if (!isSupportedUrl() || ctx.isInvalid) return
                ui.mount()
                debugLog('Shadow UI mounted', {
                    host: HOST_NAME,
                    diagnostics: getCourseTableDiagnostics(),
                })
                const host = ui.shadowHost
                const floating = ui.uiContainer
                const hostStyle = (property: string, value: string) =>
                    host.style.setProperty(property, value, 'important')
                const floatingStyle = (property: string, value: string) =>
                    floating.style.setProperty(property, value, 'important')
                // Keep the containing custom element out of document flow. The
                // modal helper normally creates a zero-sized relative wrapper;
                // making it a viewport-sized fixed layer gives the absolute card
                // a stable viewport coordinate system.
                hostStyle('position', 'fixed')
                hostStyle('inset', '0px')
                hostStyle('width', '100vw')
                hostStyle('height', '100vh')
                hostStyle('overflow', 'visible')
                hostStyle('z-index', '2147483000')
                floatingStyle('position', 'fixed')
                floatingStyle('display', 'block')
                floatingStyle('pointer-events', 'none')
                floatingStyle('inset', 'auto')
                floatingStyle('right', 'auto')
                floatingStyle('bottom', 'auto')
                floatingStyle('width', 'max-content')
                floatingStyle('height', 'max-content')
                floatingStyle('max-width', 'calc(100vw - 24px)')
                floatingStyle('max-height', 'calc(100vh - 24px)')
                hostStyle('display', 'block')
                hostStyle('visibility', 'visible')
                floatingStyle('display', 'none')
                floatingStyle('margin', '0')
                floatingStyle('padding', '0')
                floatingStyle('transform', 'none')
                floatingStyle('visibility', 'hidden')
                hostStyle('pointer-events', 'none')

                let layoutFrame: number | null = null

                const position = () => {
                    if (!model) return
                    const sourceRow = model.section.sourceRow
                    if (!sourceRow.isConnected) {
                        close()
                        return
                    }

                    const availableWidth = Math.max(0, window.innerWidth - 24)
                    const availableHeight = Math.max(0, window.innerHeight - 24)
                    hostStyle('--belle-available-width', `${availableWidth}px`)
                    hostStyle('--belle-available-height', `${availableHeight}px`)
                    const preview = ui.shadow.querySelector<HTMLElement>('.preview')
                    if (!preview) return
                    const rowRect = sourceRow.getBoundingClientRect()
                    const previewRect = preview.getBoundingClientRect()
                    const { left, top } = calculateOverlayPosition(rowRect, previewRect)
                    floatingStyle('left', `${Math.round(left)}px`)
                    floatingStyle('top', `${Math.round(top)}px`)
                    floatingStyle('visibility', 'visible')
                    debugLog('Preview positioned and revealed', {
                        position: { left, top },
                        sourceRowRect: rowRect.toJSON(),
                        floatingRect: floating.getBoundingClientRect().toJSON(),
                        hostRect: host.getBoundingClientRect().toJSON(),
                        hostDisplay: getComputedStyle(host).display,
                        hostVisibility: getComputedStyle(host).visibility,
                        hostPosition: getComputedStyle(host).position,
                        hostLeft: getComputedStyle(host).left,
                        hostTop: getComputedStyle(host).top,
                    })
                }

                const refreshBadges = () => {
                    const table = findSelectableCourseTable()
                    if (!table) return
                    for (const badge of Array.from(
                        document.querySelectorAll<HTMLElement>('[data-belle-course-badge]'),
                    )) {
                        badge.remove()
                    }
                    const existing = parseElectedLessons()
                    for (const row of Array.from(
                        table.querySelectorAll<HTMLTableRowElement>(
                            'tr.datagrid-even, tr.datagrid-odd',
                        ),
                    )) {
                        const section = parseCourseRow(row)
                        if (!section) continue
                        const conflicts = createPreviewModel(existing, section).conflictCount
                        const badge = document.createElement('span')
                        badge.dataset.belleCourseBadge = 'true'
                        badge.dataset.belleConflictBadge = conflicts ? 'true' : 'false'
                        badge.textContent = conflicts ? '存在冲突' : '无冲突'
                        badge.title = conflicts ? '存在冲突' : '无冲突'
                        badge.style.cssText = conflicts
                            ? 'display:inline-block;margin-left:6px;padding:2px 6px;border-radius:999px;font:600 11px/1.2 sans-serif;vertical-align:middle;color:#8d332d;background:#fdebec;border:1px solid #e8b9b5;'
                            : 'display:inline-block;margin-left:6px;padding:2px 6px;border-radius:999px;font:600 11px/1.2 sans-serif;vertical-align:middle;color:#456c48;background:#edf3ec;border:1px solid #c7d8c5;'
                        section.infoCell.append(badge)
                    }
                }

                const close = () => {
                    model = null
                    if (layoutFrame !== null) cancelAnimationFrame(layoutFrame)
                    layoutFrame = null
                    ui.mounted?.draw()
                    floatingStyle('display', 'none')
                    floatingStyle('visibility', 'hidden')
                }

                refreshBadges()
                const cleanupHover = createHoverController({
                    ctx,
                    onPreview(section, existing) {
                        model = createPreviewModel(existing, section)
                        floatingStyle('display', 'block')
                        floatingStyle('visibility', 'hidden')
                        ui.mounted?.draw()

                        debugLog('Preview rendered', {
                            courseName: section.courseName,
                            blocks: model.blocks.length,
                            conflicts: model.conflictCount,
                        })
                        ctx.requestAnimationFrame(position)
                    },
                    onClose: close,
                    onLayoutChange() {
                        if (layoutFrame !== null) return
                        layoutFrame = ctx.requestAnimationFrame(() => {
                            layoutFrame = null
                            position()
                        })
                    },
                })

                let badgeFrame: number | null = null
                const observeCourseTables = () => {
                    badgeObserver.observe(document.body, { childList: true, subtree: true })
                }
                const badgeObserver = new MutationObserver(records => {
                    const courseTableChanged = records.some(record => {
                        if (
                            record.target instanceof Element &&
                            record.target.closest('table.datagrid')
                        ) {
                            return true
                        }
                        return [...record.addedNodes, ...record.removedNodes].some(
                            node =>
                                node instanceof Element &&
                                (node.matches('table.datagrid') ||
                                    Boolean(node.querySelector('table.datagrid'))),
                        )
                    })
                    if (!courseTableChanged || badgeFrame !== null) return
                    badgeFrame = ctx.requestAnimationFrame(() => {
                        badgeFrame = null
                        // The portal may replace the complete table. Rediscover it while
                        // disconnected so badge updates do not trigger another refresh.
                        badgeObserver.disconnect()
                        if (model && !model.section.sourceRow.isConnected) close()
                        refreshBadges()
                        observeCourseTables()
                    })
                })
                observeCourseTables()

                removeRoute = () => {
                    badgeObserver.disconnect()
                    if (badgeFrame !== null) cancelAnimationFrame(badgeFrame)
                    cleanupHover()
                    ui.remove()
                }
            } catch (error) {
                debugError('Failed to initialize timetable preview', error)
                document.querySelector(HOST_NAME)?.remove()
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
