import env from './environment'

import tokenAbi from './abi/token.json'
import bancorAbi from './abi/bancor.json'
import fundraisingAbi from './abi/fundraising.json'

const KNOWN_CONTRACTS_BY_ENV = new Map([
  [
    '1',
    {
      BANCOR_FORMULA: '0x274Aac49b63F07Bf6998964aD20020b18383a09D',
      BONDING_CURVE_TREASURY: '0xEc0DD1579551964703246BeCfbF199C27Cb84485',
      FUNDRAISING: '0x0b4D742d52EE0C4391439f80822B26fDF1ad6Ee7',
      MARKET_MAKER: '0x5D9DbF55aF65498FaA84BDD4dDe37f7F3f8c7af1',
      TOKEN_ANT: '0x960b236A07cf122663c4303350609A66A7B288C0',
      TOKEN_ANJ: '0xcD62b1C403fa761BAadFC74C525ce2B51780b184',
    },
  ],
  [
    '4',
    {
      BANCOR_FORMULA: '0x9ac140F489Df1481C20FeB318f09b29A4f744915',
      BONDING_CURVE_TREASURY: '0x628d8c3475dceca1f8c1b84bEEe4DB08Ea19e031',
      FUNDRAISING: '0x99f8ed6EB58b25295632dd0556275e248EDD495C',
      MARKET_MAKER: '0x160e221B887D737b6defB5E29a8e7BAD2c99e766',
      TOKEN_ANT: '0x5cC7986D7A793b9930BD80067ca54c3E6D2F261B',
      TOKEN_ANJ: '0x975Ef6B5fde81C24C4Ec605091f2e945872b6036',
    },
  ],
])

const ABIS = new Map([
  ['TOKEN_ANT', tokenAbi],
  ['TOKEN_ANJ', tokenAbi],
  ['BANCOR_FORMULA', bancorAbi],
  ['FUNDRAISING', fundraisingAbi],
])

export function getKnownContract(name) {
  const knownContracts = KNOWN_CONTRACTS_BY_ENV.get(env('CHAIN_ID')) || {}
  return [knownContracts[name] || null, ABIS.get(name) || []]
}

export default KNOWN_CONTRACTS_BY_ENV
