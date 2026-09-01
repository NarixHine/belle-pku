export interface OverlayPosition {
    left: number
    top: number
}

const EDGE_GAP = 12
const ANCHOR_GAP = 10

export function calculateOverlayPosition(anchor: DOMRect, overlay: DOMRect): OverlayPosition {
    const maxLeft = Math.max(EDGE_GAP, window.innerWidth - overlay.width - EDGE_GAP)
    const centeredLeft = anchor.left + anchor.width / 2 - overlay.width / 2
    const left = clamp(centeredLeft, EDGE_GAP, maxLeft)

    const below = anchor.bottom + ANCHOR_GAP
    const above = anchor.top - overlay.height - ANCHOR_GAP
    const fitsBelow = below + overlay.height <= window.innerHeight - EDGE_GAP
    const top = fitsBelow
        ? below
        : above >= EDGE_GAP
          ? above
          : clamp(
                below,
                EDGE_GAP,
                Math.max(EDGE_GAP, window.innerHeight - overlay.height - EDGE_GAP),
            )

    return { left, top }
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max)
}
