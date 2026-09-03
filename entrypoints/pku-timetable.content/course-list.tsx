import { useState } from 'preact/hooks'
import type { ComponentChildren } from 'preact'
import { TimetablePreview } from './timetable-preview'
import type {
    CoursePagination,
    ElectedCourse,
    ElectedSummary,
    LessonSlot,
    SelectableCourse,
} from './types'
import { createPreviewModel } from './visual-model'

interface CourseListProps {
    courses: SelectableCourse[]
    pagination: CoursePagination | null
    existingLessons: LessonSlot[]
    electedCourses: ElectedCourse[]
    electedSummary: ElectedSummary | null
    electedPagination: CoursePagination | null
    selectableHint: string
    electedHint: string
    heading?: string
}

type SortKey = 'default' | 'availability' | 'demand' | 'credits'
type ConflictFilter = 'all' | 'without-conflicts'

interface CourseViewState {
    query: string
    category: string
    availability: string
    conflictFilter: ConflictFilter
    sort: SortKey
}

const COURSE_VIEW_STATE_KEY = `belle-pku-course-view:${location.pathname}`

function readCourseViewState(): Partial<CourseViewState> {
    try {
        const value = sessionStorage.getItem(COURSE_VIEW_STATE_KEY)
        if (!value) return {}
        const parsed: unknown = JSON.parse(value)
        return parsed && typeof parsed === 'object' ? (parsed as Partial<CourseViewState>) : {}
    } catch {
        return {}
    }
}

function writeCourseViewState(update: Partial<CourseViewState>): void {
    try {
        sessionStorage.setItem(
            COURSE_VIEW_STATE_KEY,
            JSON.stringify({
                query: '',
                category: '全部类别',
                availability: '全部名额',
                conflictFilter: 'all',
                sort: 'default',
                ...readCourseViewState(),
                ...update,
            }),
        )
    } catch {
        // Storage can be unavailable in restrictive browser contexts.
    }
}

function FilterSelect({
    label,
    value,
    onChange,
    children,
}: {
    label: string
    value: string
    onChange: (value: string) => void
    children: ComponentChildren
}) {
    return (
        <label class='filter-select'>
            <span class='sr-only'>{label}</span>
            <select value={value} onChange={event => onChange(event.currentTarget.value)}>
                {children}
            </select>
        </label>
    )
}

const defaultCourseViewState: CourseViewState = {
    query: '',
    category: '全部类别',
    availability: '全部名额',
    conflictFilter: 'all',
    sort: 'default',
}

export function CourseList({
    courses,
    pagination,
    existingLessons,
    electedCourses,
    electedSummary,
    electedPagination,
    selectableHint,
    electedHint,
    heading = '本学期可选课程',
}: CourseListProps) {
    const [viewState, setViewState] = useState<CourseViewState>(() => ({
        ...defaultCourseViewState,
        ...readCourseViewState(),
    }))
    const { query, category, availability, conflictFilter, sort } = viewState
    const updateViewState = (update: Partial<CourseViewState>) => {
        const next = { ...viewState, ...update }
        setViewState(next)
        writeCourseViewState(next)
    }
    const categories = Array.from(new Set(courses.map(course => course.category).filter(Boolean)))
    const filteredCourses = (() => {
        const normalizedQuery = query.trim().toLocaleLowerCase()
        return courses
            .filter(course => {
                const matchesQuery =
                    !normalizedQuery ||
                    [course.courseName, course.courseCode, course.teacher, course.department].some(
                        value => value.toLocaleLowerCase().includes(normalizedQuery),
                    )
                const matchesCategory = category === '全部类别' || course.category === category
                const ratio = course.capacity ? (course.selected ?? 0) / course.capacity : 0
                const matchesAvailability =
                    availability === '全部名额' ||
                    (availability === '尚有名额' &&
                        course.capacity !== null &&
                        course.selected !== null &&
                        course.selected < course.capacity) ||
                    (availability === '竞争激烈' && course.capacity !== null && ratio >= 1)
                const matchesConflict = conflictFilter === 'all' || course.conflictCount === 0
                return matchesQuery && matchesCategory && matchesAvailability && matchesConflict
            })
            .sort((a, b) => {
                if (sort === 'availability')
                    return (
                        (b.capacity ?? 0) -
                        (b.selected ?? 0) -
                        ((a.capacity ?? 0) - (a.selected ?? 0))
                    )
                if (sort === 'demand') {
                    return (
                        (b.selected ?? 0) / Math.max(1, b.capacity ?? 0) -
                        (a.selected ?? 0) / Math.max(1, a.capacity ?? 0)
                    )
                }
                if (sort === 'credits') return (b.credits ?? 0) - (a.credits ?? 0)
                return 0
            })
    })()

    return (
        <main class='course-browser'>
            <header class='course-browser__header'>
                <div class='heading-with-hint'>
                    <h1>{heading}</h1>
                    {selectableHint ? <p class='section-hint'>{selectableHint}</p> : null}
                </div>
                <span class='result-count' aria-live='polite'>
                    显示 {filteredCourses.length} 门
                </span>
            </header>

            <section class='filters' aria-label='筛选与排序'>
                <label class='search-field'>
                    <span class='sr-only'>搜索课程</span>
                    <span class='search-marker' aria-hidden='true'>
                        [/]
                    </span>
                    <input
                        type='search'
                        value={query}
                        onInput={event => updateViewState({ query: event.currentTarget.value })}
                        placeholder='搜索课程、教师或课程号'
                    />
                </label>
                <FilterSelect
                    label='课程类别'
                    value={category}
                    onChange={value => updateViewState({ category: value })}
                >
                    <option>全部类别</option>
                    {categories.map(value => (
                        <option key={value}>{value}</option>
                    ))}
                </FilterSelect>
                <FilterSelect
                    label='名额状态'
                    value={availability}
                    onChange={value => updateViewState({ availability: value })}
                >
                    <option>全部名额</option>
                    <option>尚有名额</option>
                    <option>竞争激烈</option>
                </FilterSelect>
                <FilterSelect
                    label='冲突'
                    value={conflictFilter}
                    onChange={value => updateViewState({ conflictFilter: value as ConflictFilter })}
                >
                    <option value='all'>含冲突课程</option>
                    <option value='without-conflicts'>无冲突课程</option>
                </FilterSelect>
                <FilterSelect
                    label='排序'
                    value={sort}
                    onChange={value => updateViewState({ sort: value as SortKey })}
                >
                    <option value='default'>默认排序</option>
                    <option value='availability'>余量优先</option>
                    <option value='demand'>竞争度优先</option>
                    <option value='credits'>学分从高到低</option>
                </FilterSelect>
            </section>

            {filteredCourses.length ? (
                <section class='course-list' aria-label='课程列表'>
                    {filteredCourses.map(course => (
                        <CourseCard
                            course={course}
                            existingLessons={existingLessons}
                            key={course.id}
                        />
                    ))}
                </section>
            ) : (
                <section class='empty-state'>
                    <h2>没有符合条件的课程</h2>
                    <p>减少筛选条件或尝试其他关键词。</p>
                    <button
                        type='button'
                        onClick={() => {
                            updateViewState(defaultCourseViewState)
                        }}
                    >
                        清除筛选
                    </button>
                </section>
            )}
            {pagination && pagination.totalPages > 1 ? (
                <Pagination pagination={pagination} />
            ) : null}
            {electedCourses.length > 0 ? (
                <ElectedCourseList
                    courses={electedCourses}
                    summary={electedSummary}
                    pagination={electedPagination}
                    hint={electedHint}
                />
            ) : null}
        </main>
    )
}

function ElectedCourseList({
    courses,
    summary,
    pagination,
    hint,
}: {
    courses: ElectedCourse[]
    summary: ElectedSummary | null
    pagination: CoursePagination | null
    hint: string
}) {
    return (
        <section class='elected-section' aria-labelledby='elected-heading'>
            <header class='elected-section__header'>
                <div class='heading-with-hint'>
                    <h2 id='elected-heading'>已选列表</h2>
                    {hint ? <p class='section-hint'>{hint}</p> : null}
                </div>
                <div class='elected-section__summary'>
                    <span>{courses.length} 门课程</span>
                    {summary?.totalCredits ? (
                        <span>
                            已选总学分 <strong>{summary.totalCredits}</strong>
                        </span>
                    ) : null}
                    {summary?.remainingWillingness ? (
                        <span>
                            剩余意愿值 <strong>{summary.remainingWillingness}</strong>
                        </span>
                    ) : null}
                </div>
            </header>
            <div class='course-list elected-list' aria-label='已选课程列表'>
                {courses.map(course => (
                    <ElectedCourseCard course={course} key={course.id} />
                ))}
            </div>
            {pagination && pagination.totalPages > 1 ? (
                <Pagination pagination={pagination} />
            ) : null}
        </section>
    )
}

function ElectedCourseCard({ course }: { course: ElectedCourse }) {
    const [willingness, setWillingness] = useState(course.willingness)
    const badges = [
        ...course.teacher
            .split(',')
            .map(teacher => teacher.trim())
            .filter(Boolean),
        course.sectionNumber ? `${course.sectionNumber} 班` : '',
        course.grade ? `${course.grade} 级` : '',
        course.pnp,
    ].filter(Boolean)
    const updateWillingness = (value: string) => {
        setWillingness(value)
        if (!course.willingnessInput) return
        course.willingnessInput.value = value
        course.willingnessInput.dispatchEvent(new Event('input', { bubbles: true }))
        course.willingnessInput.dispatchEvent(new Event('change', { bubbles: true }))
    }

    return (
        <article class='course-card elected-card'>
            <div class='course-card__top'>
                <div class='course-identity'>
                    <div class='course-kicker'>
                        <span>{course.courseCode}</span>
                        <span aria-hidden='true'>/</span>
                        <span>{course.category}</span>
                        <span aria-hidden='true'>/</span>
                        <span>{course.department}</span>
                    </div>
                    <h2>
                        {course.detailUrl ? (
                            <a href={course.detailUrl}>{course.courseName}</a>
                        ) : (
                            course.courseName
                        )}
                    </h2>
                    <div class='badges' aria-label='课程附加信息'>
                        {badges.map(badge => (
                            <span class='badge' key={badge}>
                                {badge}
                            </span>
                        ))}
                    </div>
                </div>
                <div class='primary-metrics'>
                    <div class='metric metric--compact'>
                        <span class='metric__label'>学分 / 周学时</span>
                        <strong>
                            <span>{formatNumber(course.credits)}</span>
                            <small>
                                <span>/</span>
                                {formatNumber(course.weeklyHours)}
                            </small>
                        </strong>
                    </div>
                    <div class='metric metric--capacity'>
                        <span class='metric__label'>已选 / 限数</span>
                        <strong>
                            <span>{course.selected}</span>
                            <small>
                                <span>/</span>
                                {course.capacity}
                            </small>
                        </strong>
                    </div>
                </div>
            </div>
            <div class='course-card__schedule'>
                <details class='raw-schedule'>
                    <summary>查看详细时间与考试信息</summary>
                    <div>
                        {course.scheduleLines.map((line, index) => (
                            <p key={`${line}-${index}`}>{line}</p>
                        ))}
                    </div>
                </details>
            </div>
            <div class='course-card__actions'>
                <div class='course-actions'>
                    {course.willingnessInput ? (
                        <div class='willingness-control'>
                            <label class='willingness'>
                                <span>意愿值</span>
                                <input
                                    type='number'
                                    min={course.willingnessMin || undefined}
                                    max={course.willingnessMax || undefined}
                                    value={willingness}
                                    onInput={event => updateWillingness(event.currentTarget.value)}
                                    aria-label={`${course.courseName}意愿值`}
                                />
                            </label>
                            {course.willingnessUpdateLink ? (
                                <button
                                    type='button'
                                    class='cancel-button'
                                    onClick={() => course.willingnessUpdateLink?.click()}
                                >
                                    修改
                                </button>
                            ) : null}
                        </div>
                    ) : null}
                    <button
                        type='button'
                        class='cancel-button'
                        onClick={() => course.cancelLink.click()}
                    >
                        取消
                    </button>
                </div>
            </div>
        </article>
    )
}

function CourseCard({
    course,
    existingLessons,
}: {
    course: SelectableCourse
    existingLessons: LessonSlot[]
}) {
    const [willingness, setWillingness] = useState(course.willingness)
    const demand = course.capacity ? (course.selected ?? 0) / course.capacity : 0
    const progress = Math.min(100, demand * 100)
    const overCapacity = demand >= 1
    const badges = [
        ...course.teacher
            .split(',')
            .map(teacher => teacher.trim())
            .filter(Boolean),
        course.sectionNumber ? `${course.sectionNumber} 班` : '',
        course.grade ? `${course.grade} 级` : '',
        course.pnp,
        ...course.extraFields.map(field => `${field.label} ${field.value}`),
    ].filter(Boolean)

    const updateWillingness = (value: string) => {
        setWillingness(value)
        if (!course.willingnessInput) return
        course.willingnessInput.value = value
        course.willingnessInput.dispatchEvent(new Event('input', { bubbles: true }))
        course.willingnessInput.dispatchEvent(new Event('change', { bubbles: true }))
    }

    return (
        <article class='course-card'>
            <div class='course-card__top'>
                <div class='course-identity'>
                    <div class='course-kicker'>
                        <span>{course.courseCode}</span>
                        <span aria-hidden='true'>/</span>
                        <span>{course.category}</span>
                        <span aria-hidden='true'>/</span>
                        <span>{course.department}</span>
                    </div>
                    <h2>
                        {course.detailUrl ? (
                            <a href={course.detailUrl}>{course.courseName}</a>
                        ) : (
                            course.courseName
                        )}
                    </h2>
                    <div class='badges' aria-label='课程附加信息'>
                        {badges.map(badge => (
                            <span class='badge' key={badge}>
                                {badge}
                            </span>
                        ))}
                        {course.conflictCount ? (
                            <span class='badge badge--danger'>{course.conflictCount} 处冲突</span>
                        ) : null}
                    </div>
                </div>

                {course.credits !== null ||
                course.weeklyHours !== null ||
                (course.capacity !== null && course.selected !== null) ? (
                    <div
                        class={`primary-metrics${
                            (course.credits !== null || course.weeklyHours !== null) &&
                            course.capacity !== null &&
                            course.selected !== null
                                ? ''
                                : ' primary-metrics--single'
                        }`}
                    >
                        {course.credits !== null || course.weeklyHours !== null ? (
                            <div class='metric metric--compact'>
                                <span class='metric__label'>学分 / 周学时</span>
                                <strong>
                                    <span>{formatOptionalNumber(course.credits)}</span>
                                    <small>
                                        <span>/</span>
                                        {formatOptionalNumber(course.weeklyHours)}
                                    </small>
                                </strong>
                            </div>
                        ) : null}
                        {course.capacity !== null && course.selected !== null ? (
                            <div class='metric metric--capacity'>
                                <span class='metric__label'>已选 / 限数</span>
                                <strong class={overCapacity ? 'is-danger' : ''}>
                                    <span>{course.selected}</span>
                                    <small>
                                        <span>/</span>
                                        {course.capacity}
                                    </small>
                                </strong>
                                <div
                                    class='progress'
                                    role='progressbar'
                                    aria-label='已选人数占限数比例'
                                    aria-valuemin={0}
                                    aria-valuemax={course.capacity}
                                    aria-valuenow={course.selected}
                                >
                                    <span
                                        class={overCapacity ? 'is-over' : ''}
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                                <span class='metric__hint'>
                                    {overCapacity
                                        ? `超出容量 ${course.selected - course.capacity} 人`
                                        : `剩余 ${Math.max(0, course.capacity - course.selected)} 个名额`}
                                </span>
                            </div>
                        ) : null}
                    </div>
                ) : null}
            </div>

            <div class='course-card__schedule'>
                <TimetablePreview model={createPreviewModel(existingLessons, course)} />
                <details class='raw-schedule'>
                    <summary>查看详细时间与考试信息</summary>
                    <div>
                        {course.scheduleLines.map((line, index) => (
                            <p key={`${line}-${index}`}>{line}</p>
                        ))}
                    </div>
                </details>
            </div>
            <div class='course-card__actions'>
                <div class='course-actions'>
                    {course.willingnessInput ? (
                        <label class='willingness'>
                            <span>意愿值</span>
                            <input
                                type='number'
                                min={course.willingnessMin || undefined}
                                max={course.willingnessMax || undefined}
                                value={willingness}
                                onInput={event => updateWillingness(event.currentTarget.value)}
                                aria-label={`${course.courseName}意愿值`}
                            />
                        </label>
                    ) : null}
                    <button
                        type='button'
                        class='select-button'
                        onClick={() => course.actionLink.click()}
                    >
                        {course.actionLabel}
                    </button>
                </div>
            </div>
        </article>
    )
}

function Pagination({ pagination }: { pagination: CoursePagination }) {
    const goToPage = (page: number) => {
        if (!pagination.pageSelect) return
        const option = pagination.pageSelect.options.item(page - 1)
        if (!option) return
        pagination.pageSelect.value = option.value
        pagination.pageSelect.dispatchEvent(new Event('change', { bubbles: true }))
    }

    return (
        <nav class='pagination' aria-label='课程分页'>
            <span>
                第 {pagination.currentPage} / {pagination.totalPages} 页
            </span>
            <div>
                <button
                    type='button'
                    disabled={pagination.currentPage <= 1}
                    onClick={() => goToPage(pagination.currentPage - 1)}
                >
                    上一页
                </button>
                <button
                    type='button'
                    disabled={!pagination.nextLink}
                    onClick={() => pagination.nextLink?.click()}
                >
                    下一页
                </button>
                <button
                    type='button'
                    disabled={!pagination.lastLink}
                    onClick={() => pagination.lastLink?.click()}
                >
                    末页
                </button>
            </div>
        </nav>
    )
}

function formatNumber(value: number): string {
    return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

function formatOptionalNumber(value: number | null): string {
    return value === null ? '-' : formatNumber(value)
}
