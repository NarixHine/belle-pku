export const PKU_ELECTIVE_ORIGIN = 'https://elective.pku.edu.cn'
export const ELECTIVE_WORK_PATH = '/elective2008/edu/pku/stu/elective/controller/electiveWork/'
export const COURSE_QUERY_PATH = '/elective2008/edu/pku/stu/elective/controller/courseQuery/'
export const SUPPLEMENT_PATH = '/elective2008/edu/pku/stu/elective/controller/supplement/'
export const ELECTIVE_WORK_CONTROLLER_PATH = `${ELECTIVE_WORK_PATH}ElectiveWorkController.jpf`
export const ELECTIVE_RESULTS_PATH = `${ELECTIVE_WORK_PATH}showResults.do`
export const SUPPLEMENT_CONTROLLER_PATH = `${SUPPLEMENT_PATH}SupplyCancel.do`

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

export function isSupplementUrl(input = location.href): boolean {
    try {
        const url = new URL(input)
        return url.origin === PKU_ELECTIVE_ORIGIN && url.pathname === SUPPLEMENT_CONTROLLER_PATH
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
                url.pathname.startsWith(COURSE_QUERY_PATH) ||
                url.pathname.startsWith(SUPPLEMENT_PATH))
        )
    } catch {
        return false
    }
}
