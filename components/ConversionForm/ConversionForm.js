import React, { useState, useEffect, useCallback, useMemo } from 'react'
import styled from 'styled-components'
import { OverlayTrigger, Tooltip } from 'react-bootstrap'
import Converter from 'components/converter/Converter'
import {
  useConverterStatus,
  CONVERTER_STATUSES,
} from 'components/converter/converter-status'
import Balance from 'components/SplitScreen/Balance'
import NavBar from 'components/NavBar/NavBar'
import SplitScreen from 'components/SplitScreen/SplitScreen'
import AmountInput from 'components/AmountInput/AmountInput'
import {
  useBondingCurvePrice,
  useTokenBalance,
  useTokenDecimals,
  useOpenOrder,
  useClaimOrder,
} from 'lib/web3-contracts'
import { formatUnits, parseUnits } from 'lib/web3-utils'
import { useWeb3Connect } from 'lib/web3-connect'
import { bigNum } from 'lib/utils'
import question from '../converter/assets/question.svg'

const options = ['ANT', 'ANJ']

// Filters and parse the input value of a token amount.
// Returns a BN.js instance and the filtered value.
function parseInputValue(inputValue, decimals) {
  if (decimals === -1) {
    return null
  }

  inputValue = inputValue.trim()

  // amount is the parsed value (BN.js instance)
  const amount = parseUnits(inputValue, { digits: decimals })

  if (amount.lt(0)) {
    return null
  }

  return { amount, inputValue }
}

function useConvertInputs(otherSymbol, forwards = true) {
  const [inputValueRecipient, setInputValueRecipient] = useState('')
  const [inputValueSource, setInputValueSource] = useState('0.0')
  const [amountRecipient, setAmountRecipient] = useState(bigNum(0))
  const [amountSource, setAmountSource] = useState(bigNum(0))
  const [editing, setEditing] = useState(null)
  const {
    loading: bondingPriceLoading,
    price: bondingCurvePrice,
  } = useBondingCurvePrice(amountSource, forwards)
  const anjDecimals = useTokenDecimals('ANJ')
  const otherDecimals = useTokenDecimals(otherSymbol)

  // convertFromAnj is used as a toggle to execute a conversion to or from ANJ.
  const [convertFromAnj, setConvertFromAnj] = useState(false)

  // Reset the inputs anytime the selected token changes
  useEffect(() => {
    setInputValueSource('')
    setInputValueRecipient('')
    setAmountRecipient(bigNum(0))
    setAmountSource(bigNum(0))
  }, [otherSymbol])

  // Calculate the ANJ amount from the other amount
  useEffect(() => {
    if (
      anjDecimals === -1 ||
      otherDecimals === -1 ||
      convertFromAnj ||
      bondingPriceLoading ||
      editing === 'anj'
    ) {
      return
    }

    const amount = bondingCurvePrice

    setAmountRecipient(amount)
    setInputValueRecipient(
      formatUnits(amount, { digits: anjDecimals, truncateToDecimalPlace: 8 })
    )
  }, [
    amountSource,
    anjDecimals,
    bondingCurvePrice,
    bondingPriceLoading,
    convertFromAnj,
    editing,
    otherDecimals,
  ])

  // Alternate the comma-separated format, based on the fields focus state.
  const setEditModeOther = useCallback(
    editMode => {
      setEditing(editMode ? 'other' : null)
      setInputValueSource(
        formatUnits(amountSource, {
          digits: otherDecimals,
          commas: !editMode,
        })
      )
    },
    [amountSource, otherDecimals]
  )

  const setEditModeAnj = useCallback(
    editMode => {
      setEditing(editMode ? 'anj' : null)
      setInputValueRecipient(
        formatUnits(amountRecipient, {
          digits: anjDecimals,
          commas: !editMode,
        })
      )
    },
    [amountRecipient, anjDecimals]
  )

  const handleOtherInputChange = useCallback(
    event => {
      setConvertFromAnj(false)

      if (otherDecimals === -1) {
        return
      }

      const parsed = parseInputValue(event.target.value, otherDecimals)
      if (parsed !== null) {
        setInputValueSource(parsed.inputValue)
        setAmountSource(parsed.amount)
      }
    },
    [otherDecimals]
  )

  const handleAnjInputChange = useCallback(
    event => {
      setConvertFromAnj(true)

      if (anjDecimals === -1) {
        return
      }

      const parsed = parseInputValue(event.target.value, anjDecimals)
      if (parsed !== null) {
        setInputValueRecipient(parsed.inputValue)
        setAmountRecipient(parsed.amount)
      }
    },
    [anjDecimals]
  )

  const handleManualInputChange = useCallback(
    amount => {
      if (otherDecimals === -1) {
        return
      }

      const parsed = parseInputValue(amount, otherDecimals)
      if (parsed !== null) {
        setInputValueSource(parsed.inputValue)
        setAmountSource(parsed.amount)
      }
    },
    [otherDecimals]
  )

  const bindOtherInput = useMemo(
    () => ({
      onChange: handleOtherInputChange,
      onBlur: () => setEditModeOther(false),
      onFocus: () => setEditModeOther(true),
    }),
    [setEditModeOther, handleOtherInputChange]
  )

  const bindAnjInput = useMemo(
    () => ({
      onChange: handleAnjInputChange,
      onBlur: () => setEditModeAnj(false),
      onFocus: () => setEditModeAnj(true),
    }),
    [setEditModeAnj, handleAnjInputChange]
  )

  return {
    // The parsed amount
    amountSource,
    amountRecipient,
    // Event handlers to bind the inputs
    bindOtherInput,
    bindAnjInput,
    bondingPriceLoading,
    handleManualInputChange,
    // The value to be used for inputs
    inputValueRecipient,
    inputValueSource,
  }
}

function ConversionForm() {
  const [selectedOption, setSelectedOption] = useState(1)
  const [inverted, setInverted] = useState(true)
  const [isFinal, setIsFinal] = useState(false)
  const [transactionHash, setTransactionHash] = useState(null)
  const forwards = useMemo(() => !inverted, [inverted])
  const openOrder = useOpenOrder()
  const claimOrder = useClaimOrder()
  const {
    amountSource,
    amountRecipient,
    bindOtherInput,
    bondingPriceLoading,
    handleManualInputChange,
    inputValueRecipient,
    inputValueSource,
  } = useConvertInputs(options[selectedOption], forwards)
  const tokenBalance = useTokenBalance(options[selectedOption])

  const { account } = useWeb3Connect()
  const inputDisabled = useMemo(() => !Boolean(account), [account])
  const inputError = useMemo(() => Boolean(tokenBalance.lt(amountSource)))
  const converterStatus = useConverterStatus()

  const handleInvert = useCallback(() => {
    setInverted(inverted => !inverted)
    setSelectedOption(option => (option + 1) % 2)
  }, [])
  const handleConvertMax = useCallback(() => {
    handleManualInputChange(
      formatUnits(tokenBalance, { truncateToDecimalPlace: 3 }),
      forwards
    )
  }, [tokenBalance, forwards])

  const handleConvert = useCallback(async () => {
    setIsFinal(false)
    setTransactionHash(null)
    try {
      converterStatus.setStatus(CONVERTER_STATUSES.PENDING)
      const tx = await openOrder(amountSource, forwards)
      setTransactionHash(tx.hash)
      converterStatus.setStatus(CONVERTER_STATUSES.SIGNING)
      await tx.wait()
      converterStatus.setStatus(CONVERTER_STATUSES.SUCCESS)
      const finalTx = await claimOrder(tx.hash, forwards)
      setIsFinal(true)
      setTransactionHash(finalTx.hash)
      converterStatus.setStatus(CONVERTER_STATUSES.SIGNING)
      await finalTx.wait()
      converterStatus.setStatus(CONVERTER_STATUSES.SUCCESS)
    } catch (err) {
      console.log(err)
      converterStatus.setStatus(CONVERTER_STATUSES.ERROR)
    }
  }, [amountSource, forwards, converterStatus])

  const handleLegalTerms = useCallback(async () => {
    converterStatus.setStatus(CONVERTER_STATUSES.LEGAL)
  }, [converterStatus])

  const submitButtonDisabled = Boolean(!account || bondingPriceLoading)

  const navbarLogoMode = useMemo(() => {
    if (converterStatus.status !== CONVERTER_STATUSES.FORM) {
      return 'normal'
    }
    return inverted ? 'anj' : 'ant'
  }, [converterStatus, inverted])

  return (
    <div
      css={`
        position: relative;
        height: 100vh;
      `}
    >
      <NavBar logoMode={navbarLogoMode} />
      <SplitScreen
        inverted={inverted}
        onConvert={handleConvert}
        onInvert={handleInvert}
        primary={
          <div
            css={`
              display: flex;
              flex-direction: column;
              align-items: center;
            `}
          >
            <AmountInput
              error={inputError}
              symbol={inverted ? 'ANJ' : 'ANT'}
              color={false}
              value={inputValueSource}
              disabled={inputDisabled}
              {...bindOtherInput}
            />
            <Balance
              tokenBalance={tokenBalance}
              tokenAmountToConvert={amountSource}
            />
            {account && (
              <MaxButton
                css={`
                  margin-top: 12px;
                `}
                onClick={handleConvertMax}
              >
                Convert all
              </MaxButton>
            )}
          </div>
        }
        secondary={
          <div
            css={`
              display: flex;
              flex-direction: column;
              align-items: center;
            `}
          >
            <AmountInput
              symbol={inverted ? 'ANT' : 'ANJ'}
              color={true}
              value={inputValueRecipient}
              onChange={() => null}
            />
            <LabelWithOverlay
              label="The conversion amount is an estimate"
              description="This tool uses a bonding curve to convert ANT into ANJ and
                      back at a pre-defined rate. The price is calculated by an
                      automated market maker smart contract that defines a
                      relationship between token price and token supply. You can
                      also convert ANT into other tokens such as ETH or DAI on
                      various exchanges like
                      Uniswap.
"
              overlayPlacement="top"
            />
            <div
              css={`
                position: relative;
                width: 100vw;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
              `}
            >
              <Button
                onClick={handleLegalTerms}
                disabled={submitButtonDisabled}
                css={`
                  width: 90%;
                `}
              >
                Convert
              </Button>
              <Docs />
            </div>
          </div>
        }
        reveal={
          converterStatus.status === CONVERTER_STATUSES.FORM ? null : (
            <Converter
              handleConvert={handleConvert}
              amountRequested={amountRecipient}
              backToSplit={() => null}
              toAnj={forwards}
              transactionHash={transactionHash}
              isFinal={isFinal}
            />
          )
        }
      />
    </div>
  )
}

function LabelWithOverlay({ label, description, overlayPlacement }) {
  return (
    <OverlayTrigger
      placement={overlayPlacement}
      delay={{ hide: 400 }}
      overlay={props => (
        <Tooltip {...props} show="true">
          {description}
        </Tooltip>
      )}
    >
      <Label>
        {label}
        <img src={question} alt="" />
      </Label>
    </OverlayTrigger>
  )
}

function Docs() {
  return (
    <ul
      css={`
        position: absolute;
        bottom: 0px;
        right: 8px;
        list-style: none;
        color: #a0a8c2;
        font-size: 16px;
        padding: 0;
        li {
          display: inline;
          margin: 0 32px;
          a {
            color: #a0a8c2;
          }
        }
        @media screen and (max-width: 1024px) {
          position: relative;
          bottom: -32px;
        }
      `}
    >
      <li>
        <a href="https://anj.aragon.org/" target="_blank">
          About
        </a>
      </li>
      <li>
        <a
          href="https://help.aragon.org/article/41-aragon-court"
          target="_blank"
        >
          Docs
        </a>
      </li>
      <li>
        <a href="https://court.aragon.org/dashboard" target="_blank">
          Court
        </a>
      </li>
    </ul>
  )
}

const Button = styled.button`
  background: linear-gradient(189.76deg, #ffb36d 6.08%, #ff8888 93.18%);
  box-shadow: 0px 2px 4px rgba(0, 0, 0, 0.15);
  border: solid 0px transparent;
  border-radius: 6px;
  color: white;
  width: 100%;
  min-width: 330px;
  max-width: 470px;
  height: 52px;
  font-size: 20px;
  font-weight: 600;
  cursor: pointer;
  &:disabled,
  &[disabled] {
    opacity: 0.5;
    cursor: inherit;
  }
`

const Label = styled.label`
  font-size: 16px;
  line-height: 38px;
  color: #8a96a0;
  margin-bottom: 6px;

  span {
    color: #08bee5;
  }
  img {
    padding-left: 10px;
  }
`

const MaxButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 150px;
  height: 32px;
  margin-top: 8px;
  line-height: 32px;
  text-align: center;
  font-size: 16px;
  font-weight: 800;
  text-align: center;
  color: #fff;
  background: transparent;
  border: 1px solid #fff;
  border-radius: 3px;
  cursor: pointer;
  outline: 0 !important;
  box-shadow: 0px 1px 3px rgba(0, 0, 0, 0.1);

  &:hover,
  &:active {
    outline: 0 !important;
  }
  &:focus,
  &:active {
    padding: 0;
    transform: translateY(0.5px);
    box-shadow: 0px 1px 3px rgba(0, 0, 0, 0.05);
  }
`

export default ConversionForm
