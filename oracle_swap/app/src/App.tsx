import React, { useEffect, useState } from "react";
import "./App.css";
import {
  EvmPriceServiceConnection,
  HexString,
  Price,
  PriceFeed,
} from "@pythnetwork/pyth-evm-js";
import { useMetaMask } from "metamask-react";
import Web3 from "web3";
import { ChainState, ExchangeRateMeta, tokenQtyToNumber } from "./utils";
import { OrderEntry } from "./OrderEntry";
import { PriceText } from "./PriceText";
import { MintButton } from "./MintButton";
import { getBalance } from "./erc20";
import { env } from "process";
import { LiquidityEntry } from "./LiquityEntry";

// Configuration for the app.
const CONFIG = {
  // Each token is configured with its ERC20 contract address and Pyth Price Feed ID.
  // You can find the list of price feed ids at https://pyth.network/developers/price-feed-ids
  baseToken: {
    name: "MockWETH",
    erc20Address: "0xD6754ec4c5d77a19dFaE367D9d5190E3a8fCF41D",
    pythPriceFeedId:
      "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
    decimals: 18,
  },
  quoteToken: {
    name: "MockSOL",
    erc20Address: "0xf0eD38a4E1571A0B4cF2bC985BA4E07C236f2FD8",
    pythPriceFeedId:
      "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d",
    decimals: 9,
  },
  swapContractAddress: "0x6928D27daC7Aa1C5398713733b5B718B9B1A9DBe",
  pythContractAddress: "0xDd24F84d36BF92C65F92307595335bdFab5Bbd21",
  hermesUrl: "https://hermes.pyth.network",
  mintQty: 100,
};

function App() {
  const { status, connect, account, ethereum } = useMetaMask();

  const [web3, setWeb3] = useState<Web3 | undefined>(undefined);

  useEffect(() => {
    if (status === "connected") {
      setWeb3(new Web3(ethereum));
    }
  }, [status, ethereum]);

  const [chainState, setChainState] = useState<ChainState | undefined>(
    undefined
  );

  useEffect(() => {
    async function refreshChainState() {
      if (web3 !== undefined && account !== null) {
        setChainState({
          accountBaseBalance: await getBalance(
            web3,
            CONFIG.baseToken.erc20Address,
            account
          ),
          accountQuoteBalance: await getBalance(
            web3,
            CONFIG.quoteToken.erc20Address,
            account
          ),
          poolBaseBalance: await getBalance(
            web3,
            CONFIG.baseToken.erc20Address,
            CONFIG.swapContractAddress
          ),
          poolQuoteBalance: await getBalance(
            web3,
            CONFIG.quoteToken.erc20Address,
            CONFIG.swapContractAddress
          ),
        });
      } else {
        setChainState(undefined);
      }
    }

    const interval = setInterval(refreshChainState, 3000);

    return () => {
      clearInterval(interval);
    };
  }, [web3, account]);

  const [pythOffChainPrice, setPythOffChainPrice] = useState<
    Record<HexString, Price>
  >({});

  // Subscribe to offchain prices. These are the prices that a typical frontend will want to show.
  useEffect(() => {
    // The Pyth price service client is used to retrieve the current Pyth prices and the price update data that
    // needs to be posted on-chain with each transaction.
    const pythPriceService = new EvmPriceServiceConnection(CONFIG.hermesUrl, {
      logger: {
        error: console.error,
        warn: console.warn,
        info: () => undefined,
        debug: () => undefined,
        trace: () => undefined,
      },
    });

    pythPriceService.subscribePriceFeedUpdates(
      [CONFIG.baseToken.pythPriceFeedId, CONFIG.quoteToken.pythPriceFeedId],
      (priceFeed: PriceFeed) => {
        const price = priceFeed.getPriceUnchecked(); // Fine to use unchecked (not checking for staleness) because this must be a recent price given that it comes from a websocket subscription.
        setPythOffChainPrice((prev) => ({ ...prev, [priceFeed.id]: price }));
      }
    );
  }, []);

  const [exchangeRateMeta, setExchangeRateMeta] = useState<
    ExchangeRateMeta | undefined
  >(undefined);

  useEffect(() => {
    let basePrice = pythOffChainPrice[CONFIG.baseToken.pythPriceFeedId];
    let quotePrice = pythOffChainPrice[CONFIG.quoteToken.pythPriceFeedId];

    if (basePrice !== undefined && quotePrice !== undefined) {
      const exchangeRate =
        basePrice.getPriceAsNumberUnchecked() /
        quotePrice.getPriceAsNumberUnchecked();
      const lastUpdatedTime = new Date(
        Math.max(basePrice.publishTime, quotePrice.publishTime) * 1000
      );
      setExchangeRateMeta({ rate: exchangeRate, lastUpdatedTime });
    } else {
      setExchangeRateMeta(undefined);
    }
  }, [pythOffChainPrice]);

  const [time, setTime] = useState<Date>(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => {
      clearInterval(interval);
    };
  }, []);

  const [isBuy, setIsBuy] = useState<boolean>(true);

  return (
    <div className="App">
      <div className="control-panel">
        <h3>Control Panel</h3>

        <div>
          {status === "connected" ? (
            <label>
              Connected Wallet: <br /> {account}
            </label>
          ) : (
            <button
              onClick={async () => {
                connect();
              }}
            >
              {" "}
              Connect Wallet{" "}
            </button>
          )}
        </div>

        <div>
          <h3>Wallet Balances</h3>
          {chainState !== undefined ? (
            <div>
              <p>
                {tokenQtyToNumber(
                  chainState.accountBaseBalance,
                  CONFIG.baseToken.decimals
                )}{" "}
                {CONFIG.baseToken.name}
                <MintButton
                  web3={web3!}
                  sender={account!}
                  erc20Address={CONFIG.baseToken.erc20Address}
                  destination={account!}
                  qty={CONFIG.mintQty}
                  decimals={CONFIG.baseToken.decimals}
                />
              </p>
              <p>
                {tokenQtyToNumber(
                  chainState.accountQuoteBalance,
                  CONFIG.quoteToken.decimals
                )}{" "}
                {CONFIG.quoteToken.name}
                <MintButton
                  web3={web3!}
                  sender={account!}
                  erc20Address={CONFIG.quoteToken.erc20Address}
                  destination={account!}
                  qty={CONFIG.mintQty}
                  decimals={CONFIG.quoteToken.decimals}
                />
              </p>
            </div>
          ) : (
            <p>loading...</p>
          )}
        </div>

        <h3>AMM Balances</h3>
        <div>
          <p>Contract address: {CONFIG.swapContractAddress}</p>
          {chainState !== undefined ? (
            <div>
              <p>
                {tokenQtyToNumber(
                  chainState.poolBaseBalance,
                  CONFIG.baseToken.decimals
                )}{" "}
                {CONFIG.baseToken.name}
                <MintButton
                  web3={web3!}
                  sender={account!}
                  erc20Address={CONFIG.baseToken.erc20Address}
                  destination={CONFIG.swapContractAddress}
                  qty={CONFIG.mintQty}
                  decimals={CONFIG.baseToken.decimals}
                />
              </p>
              <p>
                {tokenQtyToNumber(
                  chainState.poolQuoteBalance,
                  CONFIG.quoteToken.decimals
                )}{" "}
                {CONFIG.quoteToken.name}
                <MintButton
                  web3={web3!}
                  sender={account!}
                  erc20Address={CONFIG.quoteToken.erc20Address}
                  destination={CONFIG.swapContractAddress}
                  qty={CONFIG.mintQty}
                  decimals={CONFIG.quoteToken.decimals}
                />
              </p>
            </div>
          ) : (
            <p>loading...</p>
          )}
        </div>
      </div>

      <div className={"main"}>
        <h3>
          Swap between {CONFIG.baseToken.name} and {CONFIG.quoteToken.name}
        </h3>
        <PriceText
          price={pythOffChainPrice}
          currentTime={time}
          rate={exchangeRateMeta}
          baseToken={CONFIG.baseToken}
          quoteToken={CONFIG.quoteToken}
        />
        <div className="tab-header">
          <div
            className={`tab-item ${isBuy ? "active" : ""}`}
            onClick={() => setIsBuy(true)}
          >
            Buy
          </div>
          <div
            className={`tab-item ${!isBuy ? "active" : ""}`}
            onClick={() => setIsBuy(false)}
          >
            Sell
          </div>
        </div>
        <div className="tab-content">
          <OrderEntry
            web3={web3}
            account={account}
            isBuy={isBuy}
            approxPrice={exchangeRateMeta?.rate}
            baseToken={CONFIG.baseToken}
            quoteToken={CONFIG.quoteToken}
            hermesUrl={CONFIG.hermesUrl}
            pythContractAddress={CONFIG.pythContractAddress}
            swapContractAddress={CONFIG.swapContractAddress}
          />
        </div>
        <LiquidityEntry
          web3={web3}
          account={account}
          isBuy={isBuy}
          approxPrice={exchangeRateMeta?.rate}
          baseToken={CONFIG.baseToken}
          quoteToken={CONFIG.quoteToken}
          hermesUrl={CONFIG.hermesUrl}
          pythContractAddress={CONFIG.pythContractAddress}
          swapContractAddress={CONFIG.swapContractAddress}
        />
      </div>
    </div>
  );
}

export default App;
