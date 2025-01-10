import { useEffect, useLayoutEffect, useRef } from 'react'

export function useWindowEventListener<K extends keyof HTMLElementEventMap>(
  event: K,
  onKeyDown: (e: HTMLElementEventMap[K]) => void,
) {
  const callbackRef = useRef(onKeyDown)
  useLayoutEffect(() => {
    callbackRef.current = onKeyDown
  })
  useEffect(() => {
    const listener = callbackRef.current
    if (!listener) return

    document.addEventListener(event, listener)
    return () => {
      document.removeEventListener(event, listener)
    }
  }, [event])
}

export function useEventListener<K extends keyof HTMLElementEventMap>(
  ref: React.RefObject<HTMLInputElement>,
  event: K,
  onKeyDown: (e: HTMLElementEventMap[K]) => void,
) {
  const callbackRef = useRef(onKeyDown)
  useLayoutEffect(() => {
    callbackRef.current = onKeyDown
  })
  useEffect(() => {
    const element = ref.current
    const listener = callbackRef.current
    if (!element || !listener) return

    element.addEventListener(event, listener)
    return () => {
      element.removeEventListener(event, listener)
    }
  }, [ref, event])
}
