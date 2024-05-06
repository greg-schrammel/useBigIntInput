import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { forwardRef, useRef, useState } from 'react'
import { twMerge } from 'tailwind-merge'
import { useBigIntInput } from 'use-bigint-input/useBigIntInput'
import { useStateWithHistory, useWindowEventListener } from 'use-bigint-input/useStateWithHistory'
import { Address, erc20Abi, formatUnits, http } from 'viem'
import { WagmiProvider, createConfig, useReadContract } from 'wagmi'
import { base } from 'wagmi/chains'
import { useSwapQuote } from './0x'
import { mergeRefs } from './mergeRefs'
import { useDebounce } from './useDebounce'

type Currency = {
  name: string
  symbol: string
  decimals: number
  iconUrl: string
}
type Erc20 = Currency & { address: Address; chainId: number }
type NativeToken = Currency & { chainId: number }

const weth = {
  address: '0x4200000000000000000000000000000000000006',
  name: 'Wrapped Ether',
  symbol: 'WETH',
  decimals: 18,
  chainId: base.id,
  iconUrl: 'https://etherscan.io/token/images/weth_28.png',
} as Erc20

const usdc = {
  address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  name: 'USDC',
  symbol: 'USDC',
  decimals: 6,
  chainId: base.id,
  iconUrl: 'https://etherscan.io/token/images/centre-usdc_28.png',
} as Erc20

const degen = {
  address: '0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed',
  name: 'Degen',
  symbol: 'DEGEN',
  decimals: 18,
  chainId: base.id,
  iconUrl: 'https://basescan.org/token/images/degentips_32.png',
} satisfies Erc20

const takerAddress = '0x507f0daa42b215273b8a063b092ff3b6d27767af'

const formatter = new Intl.NumberFormat(navigator.language, {
  minimumSignificantDigits: 1,
  maximumSignificantDigits: 4,
  notation: 'compact',
})
const formatNumberCompact = formatter.format

function useBalanceOf(account: Address, token: Erc20) {
  return useReadContract({
    chainId: token.chainId,
    address: token.address,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [account],
  })
}

function MaxBalance({
  account,
  token,
  onClick,
}: {
  account: Address
  token: Erc20
  onClick: (balance: bigint, token: Erc20) => void
}) {
  const { data: balance } = useBalanceOf(account, token)
  if (balance === undefined) return null
  return (
    <button
      disabled={balance === 0n}
      onClick={() => onClick(balance, token)}
      className="
        text-[10px] text-left whitespace-nowrap font-semibold text-neutral-400 
        max-w-14 overflow-ellipsis transition-all outline-none
        enabled:hover:text-indigo-500 enabled:active:scale-95 focus:scale-105 focus:text-indigo-500 
        opacity-0 h-0 overflow-y-hidden 
        group-hover:opacity-100 group-hover:h-4
        group-focus-within:opacity-100 group-focus-within:h-4
      "
    >
      {formatNumberCompact(+formatUnits(balance, token.decimals))}
    </button>
  )
}

function TokenSelector({ token, onClick }: { token: Erc20; onClick: () => void }) {
  return (
    <div className="flex items-center gap-1.5 transition-all" onClick={onClick}>
      <img src={token.iconUrl} alt={token.name} className="w-4 h-4" />
      <span className="text-sm font-semibold text-neutral-900">{token.symbol}</span>
    </div>
  )
}

const AmountInput = forwardRef(function TokenInput(
  {
    value,
    decimals,
    onChange,
    onFocus,
    className,
  }: {
    value: bigint
    decimals: number
    onChange: (value: bigint) => void
  } & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>,
  forwardedRef,
) {
  const ref = useRef<HTMLInputElement>(null)

  const [inputWidth, setInputWidth] = useState('4ch')

  const inputProps = useBigIntInput({
    ref: ref,
    decimals,
    value,
    onChange(value, rawValue, changedFromProps) {
      if (!changedFromProps) onChange(value)
      setInputWidth(Math.min(Math.max(rawValue.length, 4), 19) + 'ch')
    },
  })

  return (
    <input
      {...inputProps}
      onFocus={onFocus}
      style={{ width: inputWidth }}
      ref={mergeRefs(ref, forwardedRef)}
      className={twMerge(
        `
          bg-transparent outline-none 
          text-xl font-semibold tabular-nums text-neutral-900 placeholder:text-neutral-400 
          transition-all focus:scale-105
        `,
        className,
      )}
    />
  )
})

type SwapState = {
  buyToken: Erc20
  sellToken: Erc20
  amount: bigint
  direction: 'sell' | 'buy'
}

const initialState = {
  buyToken: degen,
  sellToken: weth,
  direction: 'sell',
  amount: 0n,
} satisfies SwapState

const isSameToken = (a: Erc20, b: Erc20) => a.address === b.address && a.chainId === b.chainId

function TokenAmountQuote({
  sellToken,
  buyToken,
  amount,
}: {
  sellToken: Erc20
  buyToken: Erc20
  amount: bigint
}) {
  return (
    <span
      className="
    absolute -bottom-3 left-0 w-full
    text-[10px] text-left font-medium text-neutral-400 
    overflow-ellipsis transition-all whitespace-nowrap
  "
    >
      ~${formatNumberCompact(1321.24)}
    </span>
  )
}

function TokenAmountInput({
  onChangeAmount,
  onChangeToken,
  amount,
  token,
  isLoading,
}: {
  onChangeAmount: (amount: bigint) => void
  onChangeToken: () => void
  amount: bigint
  token: Erc20
  isLoading: boolean
}) {
  return (
    <div className="relative flex gap-3 items-center transition-all group">
      <AmountInput
        autoFocus
        onChange={onChangeAmount}
        className={isLoading ? 'opacity-20 animate-pulse' : ''}
        value={amount}
        decimals={token.decimals}
      />
      <TokenAmountQuote sellToken={token} buyToken={usdc} amount={amount} />
      <div className="flex flex-col transition-all">
        <TokenSelector token={token} onClick={onChangeToken} />
        <MaxBalance token={token} account={takerAddress} onClick={onChangeAmount} />
      </div>
    </div>
  )
}

const Swap = () => {
  const [{ buyToken, sellToken, amount, direction }, setSwapState, { undo, redo }] =
    useStateWithHistory<SwapState>(initialState)

  const onChangeAmount = (direction: 'buy' | 'sell') => (amount: bigint) => {
    setSwapState((currentState) => ({ ...currentState, amount, direction }))
  }

  const onChangeToken = (direction: 'buy' | 'sell') => (token: Erc20) => {
    setSwapState((currentState) => {
      if (isSameToken(token, currentState[direction === 'buy' ? 'sellToken' : 'buyToken'])) {
        return { ...currentState, buyToken: sellToken, sellToken: buyToken }
      }
      return { ...currentState, [`${direction}Token`]: token }
    })
  }

  useWindowEventListener('keydown', (e) => {
    if (e.metaKey && e.code === 'KeyZ') {
      e.preventDefault()
      if (e.shiftKey) redo()
      else undo()
    }
  })

  const debouncedAmount = useDebounce(amount, 1000)

  const { data, isFetching } = useSwapQuote({
    chainId: sellToken.chainId,
    sellToken: sellToken.address,
    buyToken: buyToken.address,
    amount: debouncedAmount,
    direction,
    takerAddress,
  })

  const oppositeDirection = direction === 'sell' ? 'buy' : 'sell'
  const values = {
    [direction]: amount,
    [oppositeDirection]:
      (direction === 'sell' ? data?.grossBuyAmount : data?.grossSellAmount) || 0n,
  } as Record<'sell' | 'buy', bigint>

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-3 h-10 transition-all">
        <span className="text-sm font-semibold text-neutral-900">Trade</span>
        <TokenAmountInput
          onChangeToken={() => onChangeToken('sell')(buyToken)}
          onChangeAmount={onChangeAmount('sell')}
          isLoading={direction === 'buy' && isFetching}
          token={sellToken}
          amount={values.sell}
        />
      </div>
      <div className="flex items-center gap-3 h-10">
        <span className="text-sm font-semibold text-neutral-900">for</span>
        <TokenAmountInput
          onChangeToken={() => onChangeToken('buy')(sellToken)}
          onChangeAmount={onChangeAmount('buy')}
          isLoading={direction === 'sell' && isFetching}
          token={buyToken}
          amount={values.buy}
        />
      </div>
    </div>
  )
}

const queryClient = new QueryClient()

const config = createConfig({
  chains: [base],
  transports: {
    [base.id]: http(),
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={config}>
        <main className="flex items-center justify-center h-[100vh] bg-neutral-50 font-mono p-4">
          <div className="h-[200px]">
            <Swap />
          </div>
        </main>
      </WagmiProvider>
    </QueryClientProvider>
  )
}
export default App
