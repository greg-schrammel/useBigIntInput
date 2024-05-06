import { useQuery } from '@tanstack/react-query'
import { Address } from 'viem'
import { arbitrum, base, mainnet, optimism, polygon } from 'viem/chains'

const supported_chains = [mainnet.id, polygon.id, optimism.id, arbitrum.id, base.id]

type QuoteParams = {
  sellToken: Address
  buyToken: Address
  takerAddress: Address
  priceImpactProtectionPercentage?: `0.${number}` // 1 is 100% and disables the feat
} & ({ sellAmount: bigint; buyAmount?: never } | { sellAmount?: never; buyAmount: bigint })

const parseQuoteParams = ({ sellAmount, buyAmount, ...params }: QuoteParams) =>
  new URLSearchParams({
    ...params,
    ...(sellAmount && { sellAmount: sellAmount.toString() }),
    ...(buyAmount && { buyAmount: buyAmount.toString() }),
    feeType: 'volume',
    feeSellTokenPercentage: '0.05',
    feeRecipient: '0x507f0daa42b215273b8a063b092ff3b6d27767af',
  }).toString()

const zeroX = 'https://api.0x.org/tx-relay/v1/swap'
const zeroXApiKey = 'd24b3b8b-003e-446b-8a24-b6b2b6a9c4a1'

export const useSwapQuote = ({
  chainId,
  direction,
  amount,
  sellToken,
  buyToken,
  takerAddress,
}: {
  chainId: keyof typeof supported_chains
  sellToken: Address
  buyToken: Address
  takerAddress: Address
  priceImpactProtectionPercentage?: `0.${string}` // 1 is 100% and disables the feat
  amount: bigint
  direction: 'sell' | 'buy'
}) => {
  const parsedParams = parseQuoteParams({
    sellToken,
    buyToken,
    takerAddress,
    ...(direction === 'sell' ? { sellAmount: amount } : { buyAmount: amount }),
  })
  return useQuery({
    queryKey: ['swapQuote', { chainId, params: parsedParams }] as const,
    queryFn: async ({ queryKey, signal }) => {
      const response = await fetch(`${zeroX}/price?${queryKey[1].params}`, {
        headers: { '0x-api-key': zeroXApiKey, '0x-chain-id': chainId.toString() },
        signal,
      })
      const a = await response.json()
      return {
        ...a,
        buyAmount: BigInt(a.buyAmount),
        grossBuyAmount: BigInt(a.grossBuyAmount),
        sellAmount: BigInt(a.sellAmount),
        grossSellAmount: BigInt(a.grossSellAmount),
      } as PriceQuote
    },
    enabled: !!chainId && !!(amount && buyToken && sellToken && takerAddress),
    staleTime: 1000 * 10, // 10s
    gcTime: 1000 * 30, // 30s
    refetchInterval: 1000 * 10, // 10s
  })
}

type FloatString = string
type BigIntString = string
type PriceQuote<SellToken = Address, BuyToken = Address> = {
  allowanceTarget: SellToken
  buyAmount: BigIntString // '112721869456304342889162'
  buyTokenAddress: BuyToken
  estimatedPriceImpact: FloatString // '0.0252'
  fees: {
    integratorFee: {
      billingType: 'on-chain'
      feeAmount: BigIntString
      feeToken: SellToken
      feeType: 'volume'
    }
    zeroExFee: {
      billingType: 'on-chain'
      feeAmount: BigIntString
      feeToken: SellToken
      feeType: 'volume'
    }
    gasFee: {
      billingType: 'on-chain'
      feeAmount: BigIntString
      feeToken: SellToken
      feeType: 'gas'
    }
  }
  grossBuyAmount: BigIntString
  grossEstimatedPriceImpact: FloatString
  grossPrice: FloatString
  grossSellAmount: BigIntString
  liquidityAvailable: boolean
  price: FloatString
  sellAmount: BigIntString
  sellTokenAddress: SellToken
  sources: { name: string; proportion: FloatString }[]
}
