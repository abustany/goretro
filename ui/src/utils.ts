export const getSetLocalStorage = (key: string, init: (() => any)): any => {
  let res = localStorage.getItem(key)
  if (res !== null) return res
  res = init()
  if (res !== null) localStorage.setItem(key, res)
  return res
}

export function trimBase64Padding(s: string): string {
  return s.replace(/=+$/, '');
}
