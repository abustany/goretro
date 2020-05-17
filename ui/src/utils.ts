export const getSetLocalStorage = (key: string, init: (() => any)): any => {
  let res = localStorage.getItem(key)
  if (res !== null) return res
  res = init()
  if (res !== null) localStorage.setItem(key, res)
  return res
}
