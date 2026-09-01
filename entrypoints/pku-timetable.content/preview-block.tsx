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
    // continuous lesson box remains intact; the standalone overlay is
    // the only conflict detail drawn over its intersection.
    // The preview is a visual schedule only: never paint either the existing
    // lesson name or the candidate lesson name inside the grid.
    const details =
        block.conflictLabel ??
        (block.conflict ? `与${formatConflictNames(block.conflictNames)}冲突` : block.label)
    const visibleText =
        block.kind === 'conflict-overlay'
            ? (block.conflictLabel ?? '')
            : block.conflict
              ? ''
              : block.showLabel
                ? block.label
                : ''
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
        <div class={className} style={style} title={details} aria-label={ariaLabel}>
            {visibleText && (
                <span
                    class={
                        block.kind === 'conflict-overlay'
                            ? 'lesson-block__conflict'
                            : 'lesson-block__name'
                    }
                >
                    {visibleText}
                </span>
            )}
        </div>
    )
}

function formatConflictNames(names: string[]): string {
    return names.map(name => `「${name}」`).join('、')
}
