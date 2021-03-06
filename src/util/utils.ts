export const doTimeout = (ms: number): Promise<void> =>
  new Promise((res): NodeJS.Timeout => setTimeout(res, ms))

export const delay = async (ms: number): Promise<void> => await doTimeout(ms)
