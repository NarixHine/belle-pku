import type { DayOfWeek, LessonSlot } from './types'

const dayMap: Record<string, DayOfWeek> = {
    一: 1,
    二: 2,
    三: 3,
    四: 4,
    五: 5,
    六: 6,
    日: 7,
    七: 7,
}

const lessonPattern =
    /(?:(\d+\s*[~\-至]\s*\d+周)\s*)?(?:(每周|单周|双周)\s*)?周([一二三四五六日七])(\d+)(?:\s*[~\-至]\s*(\d+))?节\s*(.*)/

export function splitHtmlLines(element: HTMLElement): string[] {
    return element.innerHTML
        .split(/<br\s*\/?>/i)
        .map(line => {
            const decoder = document.createElement('div')
            decoder.innerHTML = line
            return (decoder.textContent ?? '').replace(/\s+/g, ' ').trim()
        })
        .filter(Boolean)
}

export function parseScheduleLine(line: string): LessonSlot | null {
    const match = line.match(lessonPattern)
    if (!match) return null

    const weeks = match[1]
    const frequency = match[2]
    const day = match[3]
    const startText = match[4]
    const endText = match[5]
    const trailing = match[6] ?? ''
    if (!day || !startText) return null
    const startSlot = Number.parseInt(startText, 10)
    const endSlot = Number.parseInt(endText || startText, 10)
    const dayOfWeek = dayMap[day]

    if (
        !dayOfWeek ||
        !Number.isInteger(startSlot) ||
        !Number.isInteger(endSlot) ||
        startSlot < 1 ||
        endSlot < startSlot
    ) {
        return null
    }

    return {
        dayOfWeek,
        startSlot,
        endSlot,
        weeks: (weeks || '1~16周').replace(/\s+/g, ''),
        frequency: frequency || '每周',
        location: trailing.replace(/[；;]$/, '').trim(),
    }
}

export function parseScheduleLines(lines: string[]): LessonSlot[] {
    return lines.flatMap(line => {
        const lesson = parseScheduleLine(line)
        return lesson ? [lesson] : []
    })
}
