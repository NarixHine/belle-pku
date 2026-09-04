export type DayOfWeek = 1 | 2 | 3 | 4 | 5 | 6 | 7

export interface LessonSlot {
    dayOfWeek: DayOfWeek
    startSlot: number
    endSlot: number
    weeks: string
    frequency: string
    location: string
    courseName?: string
    sourceCell?: HTMLTableCellElement
}

export interface CourseSection {
    id: string
    courseCode: string
    courseName: string
    teacher: string
    sectionNumber: string
    lessons: LessonSlot[]
    infoCell: HTMLTableCellElement
    sourceRow: HTMLTableRowElement
}

export interface SelectableCourse extends CourseSection {
    category: string
    credits: number | null
    weeklyHours: number | null
    department: string
    grade: string
    pnp: string
    capacity: number | null
    selected: number | null
    waitlisted: number | null
    willingness: string
    extraFields: Array<{ label: string; value: string }>
    scheduleLines: string[]
    detailUrl: string
    actionLink: HTMLAnchorElement
    actionLabel: string
    requiresCaptcha: boolean
    captchaInputs: HTMLInputElement[]
    captchaImageSrc: string
    willingnessInput: HTMLInputElement | null
    willingnessMin: string
    willingnessMax: string
    conflictCount: number
}

export interface ElectedCourse extends CourseSection {
    category: string
    credits: number
    weeklyHours: number
    department: string
    grade: string
    pnp: string
    capacity: number
    selected: number
    waitlisted: number | null
    willingness: string
    scheduleLines: string[]
    detailUrl: string
    cancelLink: HTMLAnchorElement
    willingnessInput: HTMLInputElement | null
    willingnessUpdateLink: HTMLAnchorElement | null
    willingnessMin: string
    willingnessMax: string
    selectionStatus: string
}

export interface ElectedSummary {
    totalCredits: string
    remainingWillingness: string
}

export interface CoursePagination {
    currentPage: number
    totalPages: number
    firstLink: HTMLAnchorElement | null
    nextLink: HTMLAnchorElement | null
    lastLink: HTMLAnchorElement | null
    pageSelect: HTMLSelectElement | null
}

export type PreviewBlockKind = 'existing' | 'candidate' | 'conflict-overlay'

export interface PreviewBlock {
    id: string
    column: DayOfWeek
    rowStart: number
    rowSpan: number
    label: string
    location: string
    weeks: string
    frequency: string
    kind: PreviewBlockKind
    conflict: boolean
    conflictNames: string[]
    color: string
    showLabel: boolean
    hatching: boolean
    conflictLabel?: string
}

export interface PreviewModel {
    section: CourseSection
    blocks: PreviewBlock[]
    conflictCount: number
}
