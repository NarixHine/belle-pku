import type { JSX } from 'preact'
import type { PreviewBlock as PreviewBlockData } from './types'

interface PreviewBlockProps {
    block: PreviewBlockData
}

export function PreviewBlock({ block }: PreviewBlockProps) {
    const style = {
        '--block-column': block.column + 1,
        '--block-row': block.rowStart + 1,
        '--block-span': block.rowSpan,
        '--block-color': block.color,
    } as JSX.CSSProperties
    // Conflict cells intentionally contain no old/new lesson name. The
    // continuous lesson box remains intact; the standalone slash overlay is
    // the only conflict detail drawn over its intersection.
    // The preview is a visual schedule only: never paint either the existing
    // lesson name or the candidate lesson name inside the grid.
    const details = block.conflict
        ? `与 ${block.conflictNames.join('、')}冲突`
        : block.label
    const className = [
        'lesson-block',
        `lesson-block--${block.kind}`,
        block.conflict ? 'is-conflict' : 'is-clear',
        block.hatching ? 'has-hatching' : '',
    ]
        .filter(Boolean)
        .join(' ')

    const ariaLabel = details

    return (
        <div
            class={className}
            style={style}
            title={details}
            aria-label={ariaLabel}
        >

        </div>
    )
}
