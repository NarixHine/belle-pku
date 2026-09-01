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
    // Render each lesson one slot at a time. A lesson can therefore contain
    // clear slots and conflicting slots without painting the whole lesson as a
    // conflict. The hypothetical table includes the existing schedule too;
    // candidate slots are layered above it.
    const visibleExistingLessons = existingLessons.filter(lesson => lesson.dayOfWeek <= 5)
    const visibleCandidateLessons = section.lessons.filter(lesson => lesson.dayOfWeek <= 5)
    const candidateBlocks = visibleCandidateLessons.map((lesson, lessonIndex) =>
        toLessonBlock(lesson, 'candidate', section.courseName, lessonIndex, []),
    )
    // Existing lessons stay as one continuous visual block. Conflict state is
    // represented by the separate overlay blocks, never by splitting this box.
    const existingBlocks = visibleExistingLessons.map((lesson, lessonIndex) => {
        const conflictNames = visibleCandidateLessons.some(candidate => overlapsLesson(candidate, lesson))
            ? [section.courseName]
            : []
        return toLessonBlock(
            lesson,
            'existing',
            lesson.courseName || '已选课程',
            lessonIndex,
            conflictNames,
        )
    })

    const conflictOverlays = visibleCandidateLessons.flatMap(candidate =>
        visibleExistingLessons.flatMap(existing =>
            intersectionRanges(candidate, existing).map(range =>
                toConflictOverlay(candidate, range.start, range.end, section.courseName),
            ),
        ),
    )


    return {
        section,
        blocks: mergeAdjacentBlocks([...existingBlocks, ...candidateBlocks, ...conflictOverlays]),
        conflictCount: conflictOverlays.length,
    }
}

function mergeAdjacentBlocks(blocks: PreviewBlock[]): PreviewBlock[] {
    const merged: PreviewBlock[] = []
    for (const block of blocks) {
        const previous = merged[merged.length - 1]
        const canMerge =
            previous &&
            previous.kind === block.kind &&
            previous.column === block.column &&
            previous.rowStart + previous.rowSpan === block.rowStart &&
            previous.label === block.label &&
            previous.location === block.location &&
            (block.kind === 'existing' || previous.conflict === block.conflict) &&
            previous.hatching === block.hatching
        if (canMerge) {
            previous.rowSpan += block.rowSpan
            if (block.kind === 'existing') {
                previous.conflictNames = Array.from(new Set([...previous.conflictNames, ...block.conflictNames]))
                previous.conflict = previous.conflict || block.conflict
            }
            continue
        }
        merged.push({ ...block })
    }
    return merged
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
    candidateName: string,
): PreviewBlock {
    return {
        id: `conflict-overlay-${candidate.dayOfWeek}-${startSlot}-${endSlot}`,
        column: candidate.dayOfWeek,
        rowStart: startSlot,
        rowSpan: endSlot - startSlot + 1,
        kind: 'conflict-overlay',
        label: '',
        location: '',
        weeks: candidate.weeks,
        frequency: candidate.frequency,
        color: candidateName,
        showLabel: false,
        hatching: true,
        conflict: false,
        conflictNames: [],
    }
}

function intersectionRanges(a: LessonSlot, b: LessonSlot): Array<{ start: number; end: number }> {
    if (a.dayOfWeek !== b.dayOfWeek) return []
    const start = Math.max(1, a.startSlot, b.startSlot)
    const end = Math.min(SLOT_COUNT, a.endSlot, b.endSlot)
    return start <= end ? [{ start, end }] : []
}

function blocksForLesson(
    lesson: LessonSlot,
    kind: PreviewBlock['kind'],
    label: string,
    conflictAgainst: LessonSlot[],
    lessonIndex: number,
): PreviewBlock[] {
    const startSlot = Math.max(1, lesson.startSlot)
    const endSlot = Math.min(SLOT_COUNT, lesson.endSlot)

    return Array.from({ length: Math.max(0, endSlot - startSlot + 1) }, (_, offset) => {
        const slot = startSlot + offset
        const conflictNames = Array.from(
            new Set(
                conflictAgainst
                    .filter(other => overlapsSlot(other, lesson.dayOfWeek, slot))
                    .map(other => other.courseName || '已选课程'),
            ),
        )
        return toBlock(lesson, slot, kind, label, lessonIndex * SLOT_COUNT + offset, conflictNames, offset)
    })
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
        color: kind === 'candidate' ? '#d95f59' : colorForCourse(label),
        showLabel: slotOffset === 0,
        // Hatching is rendered by the separate conflict-overlay block so the
        // underlying existing lesson remains one continuous box.
        hatching: false,
    }
}

function overlapsSlot(lesson: LessonSlot, dayOfWeek: CourseSection['lessons'][number]['dayOfWeek'], slot: number): boolean {
    return lesson.dayOfWeek === dayOfWeek && lesson.startSlot <= slot && slot <= lesson.endSlot
}

function overlapsLesson(a: LessonSlot, b: LessonSlot): boolean {
    return a.dayOfWeek === b.dayOfWeek && a.startSlot <= b.endSlot && b.startSlot <= a.endSlot
}

function colorForCourse(courseName: string): string {
    let hash = 0
    for (const character of courseName) hash = (hash * 31 + character.charCodeAt(0)) >>> 0
    return COURSE_PALETTE[hash % COURSE_PALETTE.length] ?? COURSE_PALETTE[0]!
}
