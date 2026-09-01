export const PKU_ELECTIVE_ORIGIN = 'https://elective.pku.edu.cn'
export const ELECTIVE_WORK_PATH = '/elective2008/edu/pku/stu/elective/controller/electiveWork/'

export function isSupportedUrl(input = location.href): boolean {
    try {
        const url = new URL(input)
        return url.origin === PKU_ELECTIVE_ORIGIN && url.pathname.startsWith(ELECTIVE_WORK_PATH)
    } catch {
        return false
    }
}
