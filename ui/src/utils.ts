export function getSetLocalStorage(key: string, init: (() => any)): any {
  let res = localStorage.getItem(key)
  if (res !== null) return res
  res = init()
  if (res !== null) localStorage.setItem(key, res)
  return res
}

export function trimBase64Padding(s: string): string {
  return s.replace(/=+$/, '');
}

export function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// URL

export function setURLParam(param: string, val: string) {
  const url = (new URL(window.location.toString()))
  url.searchParams.set(param, val)
  window.history.replaceState(null, document.title, url.toString());
}

export function getURLParam(param: string): string | null {
  const roomId = (new URL(window.location.toString())).searchParams.get(param)
  return roomId || null
}

// Retry

interface WithRetryOpts {
  only?: any[],
  attempt?: number
}
export async function withRetry<T>(fn: () => T, opts?: WithRetryOpts): Promise<T> {
  let {only, attempt} = opts || {}
  if (attempt === undefined) attempt = 1
  if (only === undefined) only = []

  const wait = Math.min((2 ** (attempt! - 1)) * 100, 10000)

  try {
    return await fn()
  } catch(err) {
    if (only && !only.some((type) => err instanceof type)) throw err
    await sleep(wait)
    return withRetry<T>(fn, {...opts, attempt: attempt + 1})
  }
}

// Promises

export function makeUnresolvedPromise<T>(): [Promise<T>, (value?: T) => void] {
  let outerResolve: (value?: T) => void
  const promise = new Promise<T>((innerResolve, _) => { outerResolve = innerResolve })
  outerResolve = outerResolve!
  return [promise, outerResolve]
}

export function makeUnresolvablePromise<T>(): Promise<T> {
  // unresolved Promise
  return new Promise<T>(() => {})
}

// Clipboard

export function toClipboard(content: string) {
  // Try multiple ways
  if (navigator.clipboard) {
    navigator.clipboard.writeText(content)
  } else {
    toClipboardWithExecCommand(content)
  }
}

function toClipboardWithExecCommand(content: string) {
  if (!content) return
  const textArea = document.createElement("textarea");
  textArea.style.cssText = 'display:hidden;'
  textArea.value = content
  document.body.appendChild(textArea);
  textArea.select();
  document.execCommand("copy");
  textArea.remove();
}
