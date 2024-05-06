import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { formatUnits, parseUnits as viemParseUnits } from 'viem/utils'

type FormattingOptions =
  | { decimalSeparator: '.'; thousandsSeparator: ',' }
  | { decimalSeparator: ','; thousandsSeparator: '.' }

// some locales use "," as decimal separator and "." as thousands separator
const formattingOptions = (() => {
  const decimalSeparator = (1.1).toLocaleString(navigator.languages[0]).substring(1, 2)
  if (decimalSeparator === '.') return { decimalSeparator: '.', thousandsSeparator: ',' } as const
  return { decimalSeparator: ',', thousandsSeparator: '.' } as const
})()

function mask(value: string, options: FormattingOptions = formattingOptions) {
  const [whole, fraction] = value.split(options.decimalSeparator)
  const formattedWhole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, options.thousandsSeparator)
  if (fraction !== undefined) return [formattedWhole, fraction].join(options.decimalSeparator)
  return formattedWhole
}

const unmask = (value: string, { thousandsSeparator }: FormattingOptions = formattingOptions) => {
  return value.replaceAll(thousandsSeparator, '')
}

const parseUnits = (value: string, decimals: number) => {
  return viemParseUnits(value.replace(',', '.'), decimals)
}

function toNumericString(
  value: string,
  decimals: number,
  { decimalSeparator, thousandsSeparator }: FormattingOptions = formattingOptions,
) {
  // removes non-numeric characters but keep the first `decimalSeparator`

  if (value === decimalSeparator) return ''

  // WORKAROUND: the fucking iphone shows a keyboard in a style that's not the same as the safari navigator language ????
  if (value.endsWith(thousandsSeparator)) value = value.slice(0, -1) + decimalSeparator
  // -------------------------

  // match any character that is not a digit or the decimal separator
  // then split the string by the decimal separator (maybe the user try to input more than one decimal separator eg. "1.2.3")
  const [whole, ...fraction] = value
    .replace(new RegExp(`[^\\d${decimalSeparator}]`, 'g'), '')
    .split(decimalSeparator)
  if (fraction.length === 0) return whole

  // keeps the first decimals separator and remove the rest
  const fractionString = fraction.join('').substring(0, decimals) // limit the decimals
  return [whole, fractionString].join(decimalSeparator)
}

const removeCharAt = (value: string, index: number) =>
  value.slice(0, index - 1) + value.slice(index)

const adjustCursorPosition = (inputValue: string, maskedInput: string, cursor: number) => {
  let cursorPosition = cursor

  // masked is LONGER than the input value when we ADD a thousand separator
  // so we jump cursor one position
  if (inputValue.length < maskedInput.length) cursorPosition = cursorPosition + 1

  // masked is SMALLER than the input value when we REMOVE a thousand separator
  // so we move cursor back one position
  if (inputValue.length > maskedInput.length) cursorPosition = cursorPosition - 1

  return cursorPosition > 0 ? cursorPosition : 0
}

function handleMaskedInput(
  e: React.ChangeEvent<HTMLInputElement>,
  decimals: number,
  { thousandsSeparator }: FormattingOptions = formattingOptions,
) {
  const rawInputValue = e.target.value
  const numericValue = toNumericString(rawInputValue, decimals)
  const maskedValue = mask(numericValue)

  const cursor = e.target.selectionStart ?? maskedValue.length // should only be null when the input is blurred, fallback to end just in case and to make ts happy

  // if the user tries to delete a thousand separator we delete the number before it
  if (
    'inputType' in e.nativeEvent && // TODO: check if it's react ts types missing or something else (?)
    e.nativeEvent.inputType === 'deleteContentBackward' &&
    maskedValue[cursor] === thousandsSeparator
  ) {
    // the input before the mask doesn't have thousand separators, but the cursor is in an index of a masked input
    // so we have to remove the thousand separators before the cursor, to find the correct index in the unmasked input
    const thousandSeparatorsBeforeCursor =
      maskedValue.slice(0, cursor).split(thousandsSeparator).length - 1

    // here we remove the number behind the thousand separator the cursor is on
    // like 1,000,000,|000
    //                ^ cursor is here (gonna delete the 0 before the comma)
    const newNumericValue = removeCharAt(numericValue, cursor - thousandSeparatorsBeforeCursor)
    const newMaskedInput = mask(newNumericValue)

    // adjust the cursor if the new value is more than one character shorter than the previous one
    // like 1,000,000,000 -> 100,000,000 (removed one "0" and one ",")
    // the other case is 10,000,000,000 -> 1,000,000,000 (removed just one "0")
    const newCursor = maskedValue.length - newMaskedInput.length > 1 ? cursor - 2 : cursor - 1

    return {
      numericValue: newNumericValue,
      maskedValue: newMaskedInput,
      cursor: newCursor > 0 ? newCursor : 0,
    }
  }

  return {
    numericValue,
    maskedValue,
    cursor: adjustCursorPosition(rawInputValue, maskedValue, cursor),
  }
}

export type UseBigIntInput = {
  ref: React.RefObject<HTMLInputElement>
  value?: bigint
  decimals: number
  onChange: (value: bigint, rawValue: string, changedFromProps: boolean) => void
}
export function useBigIntInput({ ref, value, decimals, onChange: onValueChange }: UseBigIntInput) {
  const [input, setInput] = useState(() => {
    const internalValue = value ? mask(formatUnits(value, decimals)) : ''
    return { internalValue, cursor: internalValue.length }
  })

  // react can't keep track of the cursor position when the input value changes and it's not the same e.target.value
  // so to make the mask work we have to keep track of the cursor position and set it manually
  useLayoutEffect(() => {
    ref.current?.setSelectionRange(input.cursor, input.cursor)
  }, [input, ref])

  // use this "latest ref pattern" so the user don't need to worry about stabilizing the `onChange` callback
  const onValueChangeRef = useRef(onValueChange)
  useLayoutEffect(() => {
    onValueChangeRef.current = onValueChange
  })

  // update internal value if the value prop changes
  if (value !== undefined && value !== parseUnits(unmask(input.internalValue), decimals)) {
    const maskedValue = mask(formatUnits(value, decimals))
    const newInternalValue = value === 0n ? '' : maskedValue
    setInput((s) => ({ internalValue: newInternalValue, cursor: s.cursor }))
    onValueChangeRef.current?.(value, newInternalValue, true)
  }

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { numericValue, maskedValue, cursor } = handleMaskedInput(e, decimals)

      setInput({ internalValue: maskedValue, cursor })
      onValueChangeRef.current?.(parseUnits(numericValue, decimals), maskedValue, false)
    },
    [decimals],
  )

  return useMemo(
    () =>
      ({
        value: input.internalValue,
        onChange,
        ref,
        inputMode: 'decimal',
        placeholder: `0${formattingOptions.decimalSeparator}00`,
      }) as const,
    [input.internalValue, onChange, ref],
  )
}
