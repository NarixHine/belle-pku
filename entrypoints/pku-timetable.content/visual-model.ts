import type { CourseSection, LessonSlot, PreviewBlock, PreviewModel } from './types'

export const SLOT_COUNT = 12

const COURSE_PALETTE = [
    '#fbf8cc',
    '#fde4cf',
    '#ffcfd2',
    '#f1c0e8',
    '#cfbaf0',
    '#a3c4f3',
    '#90dbf4',
    '#8eecf5',
    '#98f5e1',
    '#b9fbc0',
]

export function createPreviewModel(
    existingLessons: LessonSlot[],
    section: CourseSection,
): PreviewModel {
    const visibleExistingLessons = existingLessons.filter(lesson => lesson.dayOfWeek <= 5)
    const visibleCandidateLessons = section.lessons.filter(lesson => lesson.dayOfWeek <= 5)
    // The candidate is always one continuous box. Conflict intersections are
    // represented by separate overlays and never split or relabel this box.
    const candidateBlocks = visibleCandidateLessons.map((lesson, lessonIndex) => {
        const conflictNames = Array.from(
            new Set(
                visibleExistingLessons
                    .filter(existing => overlapsLesson(existing, lesson))
                    .map(existing => existing.courseName || '已选课程'),
            ),
        )
        return toLessonBlock(lesson, 'candidate', section.courseName, lessonIndex, conflictNames)
    })
    // Existing lessons stay as one continuous visual block. Mark the whole
    // box when it overlaps the candidate so its conflict styling can apply;
    // the separate overlay still identifies the exact intersection.
    const existingBlocks = visibleExistingLessons.map((lesson, lessonIndex) => {
        const conflictNames = Array.from(
            new Set(
                visibleCandidateLessons
                    .filter(candidate => overlapsLesson(candidate, lesson))
                    .map(() => section.courseName || '待选课程'),
            ),
        )
        return toLessonBlock(lesson, 'existing', lesson.courseName || '已选课程', lessonIndex, conflictNames)
    })

    const conflictOverlays = visibleCandidateLessons.flatMap((candidate, candidateIndex) =>
        visibleExistingLessons.flatMap((existing, existingIndex) =>
            intersectionRanges(candidate, existing).map(range =>
                toConflictOverlay(
                    candidate,
                    range.start,
                    range.end,
                    existing.courseName || '已选课程',
                    candidateIndex,
                    existingIndex,
                ),
            ),
        ),
    )

    return {
        section,
        blocks: [...existingBlocks, ...candidateBlocks, ...conflictOverlays],
        conflictCount: conflictOverlays.length,
    }
}

function toLessonBlock(
    lesson: LessonSlot,
    kind: PreviewBlock['kind'],
    label: string,
    lessonIndex: number,
    conflictNames: string[],
): PreviewBlock {
    const rowStart = Math.max(1, lesson.startSlot)
    const endSlot = Math.min(SLOT_COUNT, lesson.endSlot)
    return toBlock(lesson, rowStart, kind, label, lessonIndex * SLOT_COUNT, conflictNames, 0, Math.max(1, endSlot - rowStart + 1))
}

function toConflictOverlay(
    candidate: LessonSlot,
    startSlot: number,
    endSlot: number,
    existingName: string,
    candidateIndex: number,
    existingIndex: number,
): PreviewBlock {
    return {
        id: `conflict-overlay-${candidateIndex}-${existingIndex}-${candidate.dayOfWeek}-${startSlot}-${endSlot}`,
        column: candidate.dayOfWeek,
        rowStart: startSlot,
        rowSpan: endSlot - startSlot + 1,
        kind: 'conflict-overlay',
        label: '',
        location: '',
        weeks: candidate.weeks,
        frequency: candidate.frequency,
        color: '#d95f59',
        showLabel: false,
        hatching: true,
        conflict: false,
        conflictNames: [existingName],
        conflictLabel: `与「${existingName}」冲突`,
    }
}

function intersectionRanges(a: LessonSlot, b: LessonSlot): Array<{ start: number; end: number }> {
    if (a.dayOfWeek !== b.dayOfWeek || !teachingWeeksOverlap(a, b)) return []
    const start = Math.max(1, a.startSlot, b.startSlot)
    const end = Math.min(SLOT_COUNT, a.endSlot, b.endSlot)
    return start <= end ? [{ start, end }] : []
}

function toBlock(
    lesson: LessonSlot,
    slot: number,
    kind: PreviewBlock['kind'],
    label: string,
    index: number,
    conflictNames: string[],
    slotOffset: number,
    rowSpan = 1,
): PreviewBlock {
    return {
        id: `${kind}-${lesson.dayOfWeek}-${slot}-${index}`,
        column: lesson.dayOfWeek,
        rowStart: slot,
        rowSpan,
        label,
        location: lesson.location,
        weeks: lesson.weeks,
        frequency: lesson.frequency,
        kind,
        conflict: conflictNames.length > 0,
        conflictNames,
        color: kind === 'candidate' && conflictNames.length > 0 ? '#d95f59' : colorForCourse(label),
        showLabel: slotOffset === 0,
        // Hatching is rendered by the separate conflict-overlay block so the
        // underlying existing lesson remains one continuous box.
        hatching: false,
    }
}

function overlapsLesson(a: LessonSlot, b: LessonSlot): boolean {
    return intersectionRanges(a, b).length > 0
}

function teachingWeeksOverlap(a: LessonSlot, b: LessonSlot): boolean {
    const aRange = parseWeekRange(a.weeks)
    const bRange = parseWeekRange(b.weeks)
    if (!aRange || !bRange) return true

    const firstWeek = Math.max(aRange.start, bRange.start)
    const lastWeek = Math.min(aRange.end, bRange.end)
    for (let week = firstWeek; week <= lastWeek; week += 1) {
        if (includesWeek(a.frequency, week) && includesWeek(b.frequency, week)) return true
    }
    return false
}

function parseWeekRange(weeks: string): { start: number; end: number } | null {
    const match = weeks.match(/^(\d+)(?:[~\-至](\d+))?周$/)
    if (!match?.[1]) return null
    const start = Number.parseInt(match[1], 10)
    const end = Number.parseInt(match[2] || match[1], 10)
    return start <= end ? { start, end } : null
}

function includesWeek(frequency: string, week: number): boolean {
    if (frequency === '单周') return week % 2 === 1
    if (frequency === '双周') return week % 2 === 0
    return true
}

function colorForCourse(courseName: string): string {
    let hash = 0
    for (const character of courseName) hash = (hash * 31 + character.charCodeAt(0)) >>> 0
    return COURSE_PALETTE[hash % COURSE_PALETTE.length] ?? COURSE_PALETTE[0]!
}
