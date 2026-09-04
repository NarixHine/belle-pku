export const PKU_ELECTIVE_ORIGIN = 'https://elective.pku.edu.cn'
export const ELECTIVE_WORK_PATH = '/elective2008/edu/pku/stu/elective/controller/electiveWork/'
export const COURSE_QUERY_PATH = '/elective2008/edu/pku/stu/elective/controller/courseQuery/'
export const ELECTIVE_WORK_CONTROLLER_PATH = `${ELECTIVE_WORK_PATH}ElectiveWorkController.jpf`
export const ELECTIVE_RESULTS_PATH = `${ELECTIVE_WORK_PATH}showResults.do`

export function isElectiveWorkUrl(input = location.href): boolean {
    try {
        const url = new URL(input)
        return url.origin === PKU_ELECTIVE_ORIGIN && url.pathname === ELECTIVE_WORK_CONTROLLER_PATH
    } catch {
        return false
    }
}

export function isElectiveResultsUrl(input = location.href): boolean {
    try {
        const url = new URL(input)
        return url.origin === PKU_ELECTIVE_ORIGIN && url.pathname === ELECTIVE_RESULTS_PATH
    } catch {
        return false
    }
}

export function isSupportedUrl(input = location.href): boolean {
    try {
        const url = new URL(input)
        return (
            url.origin === PKU_ELECTIVE_ORIGIN &&
            (url.pathname.startsWith(ELECTIVE_WORK_PATH) ||
                url.pathname.startsWith(COURSE_QUERY_PATH))
        )
    } catch {
        return false
    }
}
