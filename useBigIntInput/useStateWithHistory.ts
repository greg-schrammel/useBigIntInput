import { useEffect, useLayoutEffect, useRef, useState } from 'react'

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

export function useStateWithHistory<T>(initialState: T) {
  const [state, setState] = useState(initialState)
  const history = useRef([initialState])
  const index = useRef(0)

  const set = (_newState: T | ((s: T) => T)) => {
    const newState = typeof _newState === 'function' ? (_newState as (s: T) => T)(state) : _newState
    if (newState === state) return
    history.current = history.current.slice(0, index.current + 1)
    history.current.push(newState)
    index.current = history.current.length - 1
    setState(newState)
  }

  const undo = () => {
    if (index.current === 0) return
    const value = history.current[index.current - 1]
    setState(value)
    index.current--
  }

  const redo = () => {
    const value = history.current[index.current + 1]
    if (value === undefined) return
    setState(value)
    index.current++
  }

  return [state, set, { undo, redo }] as const
}
