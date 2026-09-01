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
