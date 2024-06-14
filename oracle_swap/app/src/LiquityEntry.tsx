import React, { useEffect, useState } from "react";
import "./App.css";
import Web3 from "web3";
import { BigNumber } from "ethers";
import { TokenConfig, numberToTokenQty, tokenQtyToNumber } from "./utils";
import IPythAbi from "@pythnetwork/pyth-sdk-solidity/abis/IPyth.json";
import OracleSwapAbi from "./abi/OracleSwapAbi.json";
import { approveToken, getApprovedQuantity } from "./erc20";
import { EvmPriceServiceConnection } from "@pythnetwork/pyth-evm-js";

export function LiquidityEntry(props: {
    web3: Web3 | undefined;
    account: string | null;
    isBuy: boolean;
    approxPrice: number | undefined;
    baseToken: TokenConfig;
    quoteToken: TokenConfig;
    hermesUrl: string;
    pythContractAddress: string;
    swapContractAddress: string;
}) {
    const [share, setShare] = useState<string>("0");
    const [baseTokenAmount, setBaseTokenAmount] = useState<string>("0");
    const [quoteTokenAmount, setQuoteTokenAmount] = useState<string>("0");
    const [removeShare, setRemoveShare] = useState<BigNumber>(BigNumber.from("0"));


    const handleAddLiquidity = async () => {

        const baseToken = numberToTokenQty(baseTokenAmount, props.baseToken.decimals);
        const quoteToken = numberToTokenQty(quoteTokenAmount, props.quoteToken.decimals);
        const swapContract = new props.web3!.eth.Contract(
            OracleSwapAbi as any,
            props.swapContractAddress
        );
        const res = await swapContract.methods.addLiquidity(baseToken, quoteToken, 0).send({ from: props.account });
        refreshShare();
        console.log('addLiquidity', baseToken, quoteToken, res);
    };

    const handleRemoveLiquidity = async () => {
        const swapContract = new props.web3!.eth.Contract(
            OracleSwapAbi as any,
            props.swapContractAddress
        );
        const res = await swapContract.methods.removeLiquidity(removeShare, 0, 0).send({ from: props.account });
        refreshShare();
        console.log('removeLiquidity', res);
    };

    const refreshShare = async () => {
        const swapContract = new props.web3!.eth.Contract(
            OracleSwapAbi as any,
            props.swapContractAddress
        );
        const share = await swapContract.methods.balanceOf(props.account).call();
        console.log('share', share);
        setShare(share);
    };

    const getBigNumber = (value: string) => {
        if (value === "" || isNaN(Number(value))) {
            return BigNumber.from("0");
        }
        return BigNumber.from(value);
    }

    return (
        <><div className={"border-container"}>
            Please authorize the 'Buy' and 'Sell' operations by clicking the approve buttons in above two blocks first.
            <div className="border-container">

                <div>
                    <input type="text" defaultValue={0} onChange={e => setBaseTokenAmount(e.target.value)} />
                    {props.baseToken.name}
                </div>
                <div>

                    <input type="text" defaultValue={0} onChange={e => setQuoteTokenAmount(e.target.value)} />
                    {props.quoteToken.name}
                </div>
                <button
                    onClick={handleAddLiquidity}>
                    Add Liquidity
                </button>
            </div>

            <p />
            <div className="border-container">
                <input type="text" defaultValue={0} onChange={e => setRemoveShare(getBigNumber(e.target.value))} />
                Shares To Be Removed
                <button
                    onClick={handleRemoveLiquidity}>
                    Remove Liquidity
                </button>
            </div>

            <p />
            <span>{share} Shares
                <button
                    onClick={refreshShare}>
                    Refresh
                </button>
            </span>
            <p />

        </div>
        </>
    );
}