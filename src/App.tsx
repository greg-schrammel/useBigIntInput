import { useRef, useState } from 'react'
import './index.css'
import { useBigIntInput } from './useBigIntInput'
import { useInputStateWithHistory } from './useStateWithHistory'

const minmax = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)
const safeBigInt = (value: string) => {
  try {
    return BigInt(value)
  } catch {
    return undefined
  }
}

function BigIntInput() {
  const ref = useRef<HTMLInputElement>(null)

  const [decimals, setDecimals] = useState(18)
  const [bigIntValue, setBigIntValue] = useInputStateWithHistory(ref, 123456789000000000000000000n)

  const inputProps = useBigIntInput({
    ref: ref,
    decimals: decimals,
    value: bigIntValue,
    onChange(value) {
      setBigIntValue(value)
    },
  })

  return (
    <div className="px-5 py-4 flex flex-col gap-3 w-full">
      <input
        autoFocus
        className="-mx-5 px-5 bg-transparent outline-none w-full placeholder:text-neutral-300 text-xl font-semibold text-neutral-900 tabular-nums"
        {...inputProps}
      />

      <div className="flex flex-col gap-1 ">
        <div className="flex gap-1 text-indigo-500 text-xs font-medium">
          <span>bigint</span>
          <input
            onChange={(e) =>
              setBigIntValue(safeBigInt(e.target.value.replace('n', '')) || bigIntValue)
            }
            value={bigIntValue.toString() + 'n'}
            className="bg-transparent outline-none w-full tabular-nums"
          />
        </div>

        <div className="flex gap-1 text-amber-500 text-xs font-medium">
          <span>decimals</span>
          <input
            type="number"
            max={18}
            min={0}
            onChange={(e) => setDecimals(minmax(+e.target.value, 0, 18))}
            value={decimals}
            className="bg-transparent outline-none tabular-nums"
          />
        </div>
      </div>
    </div>
  )
}

function App() {
  return (
    <main className="flex items-center justify-center h-[100vh] bg-neutral-50">
      <div className="h-[500px] w-[400px]">
        <BigIntInput />
      </div>
    </main>
  )
}

export default App
