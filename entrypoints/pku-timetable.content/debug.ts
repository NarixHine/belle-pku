const PREFIX = '[Belle PKU]'

export const DEBUG_STORAGE_KEY = 'belle-pku-debug'

export function isDebugEnabled(): boolean {
    try {
        return sessionStorage.getItem(DEBUG_STORAGE_KEY) !== '0'
    } catch {
        return true
    }
}

export function debugLog(message: string, details?: unknown): void {
    if (!isDebugEnabled()) return
    if (details === undefined) console.info(PREFIX, message)
    else console.info(PREFIX, message, details)
}

export function debugWarn(message: string, details?: unknown): void {
    if (!isDebugEnabled()) return
    if (details === undefined) console.warn(PREFIX, message)
    else console.warn(PREFIX, message, details)
}

export function debugError(message: string, error: unknown): void {
    console.error(PREFIX, message, error)
}
