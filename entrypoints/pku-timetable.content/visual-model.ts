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
    const candidateBlocks = visibleCandidateLessons.flatMap((lesson, lessonIndex) =>
        blocksForLesson(lesson, 'candidate', section.courseName, visibleExistingLessons, lessonIndex),
    )
    const existingBlocks = visibleExistingLessons.flatMap((lesson, lessonIndex) =>
        blocksForLesson(lesson, 'existing', lesson.courseName || '已选课程', visibleCandidateLessons, lessonIndex),
    )

    for (const block of existingBlocks) {
        const names = candidateBlocks
            .filter(candidate => candidate.column === block.column && candidate.rowStart === block.rowStart)
            .map(candidate => candidate.label)
        block.conflictNames = Array.from(new Set(names))
        block.conflict = block.conflictNames.length > 0
    }

    return {
        section,
        blocks: mergeAdjacentBlocks([...existingBlocks, ...candidateBlocks]),
        conflictCount: candidateBlocks.filter(block => block.conflict).length,
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
            previous.conflict === block.conflict &&
            previous.hatching === block.hatching
        if (canMerge) {
            previous.rowSpan += block.rowSpan
            continue
        }
        merged.push({ ...block })
    }
    return merged
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
): PreviewBlock {
    return {
        id: `${kind}-${lesson.dayOfWeek}-${slot}-${index}`,
        column: lesson.dayOfWeek,
        rowStart: slot,
        rowSpan: 1,
        label,
        location: lesson.location,
        weeks: lesson.weeks,
        frequency: lesson.frequency,
        kind,
        conflict: conflictNames.length > 0,
        conflictNames,
        color: colorForCourse(label),
        showLabel: slotOffset === 0,
        // Candidate conflict slots are exactly the candidate/existing overlap;
        // hatch those cells, not the whole multi-slot lesson.
        hatching: kind === 'candidate' && conflictNames.length > 0,
    }
}

function overlapsSlot(lesson: LessonSlot, dayOfWeek: CourseSection['lessons'][number]['dayOfWeek'], slot: number): boolean {
    return lesson.dayOfWeek === dayOfWeek && lesson.startSlot <= slot && slot <= lesson.endSlot
}

function colorForCourse(courseName: string): string {
    let hash = 0
    for (const character of courseName) hash = (hash * 31 + character.charCodeAt(0)) >>> 0
    return COURSE_PALETTE[hash % COURSE_PALETTE.length] ?? COURSE_PALETTE[0]!
}
