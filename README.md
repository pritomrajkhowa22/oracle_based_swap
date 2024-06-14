# Pyth Oracle AMM

This directory contains an example of an AMM application using Pyth Price Feeds.
This AMM application manages a pool of two tokens and allows a user to trade with the pool at the current Pyth price.

This application has two components. The first component is a smart contract (in the `contract` directory) that manages the pool and implements the trading functionality.
The second is a frontend application (in the `app` directory) that communicates with the smart contract.

Please see the [Pyth documentation](https://docs.pyth.network/documentation/pythnet-price-feeds) for more information about Pyth and how to integrate it into your application.

**Warning** this AMM is intended only as a demonstration of Pyth price feeds and is **not for production use**.


## AMM VIDEO

https://github.com/pritomrajkhowa22/oracle_based_swap/blob/main/test_video.mov


##Oracle Swap AMM operates

    1. Initial Pool Setup: When users deposit various stablecoins into a liquidity pool, it is ideal for these stablecoins to maintain a 1:1 value ratio.
    
    2. Invariant Function: Instead of utilizing the constant product invariant found in traditional AMMs, Oracle Swap AMMs employ an invariant function specifically tailored to stablecoins. This function is designed to ensure the balanced value of assets within the pool.
    
    3. Swap Execution: Upon a user's request to exchange one stablecoin for another, the Oracle Swap AMM calculates the most efficient trade path to minimize slippage. This process involves dynamically adjusting the proportions of stablecoins within the pool.
    
    4. Fees and Incentives: Users who provide liquidity to the pool receive a share of the trading fees generated, thereby creating an incentive for liquidity provision.
    
    5. Stability Maintenance: The Oracle Swap AMM continuously rebalances the pool to uphold stablecoin pegs. Arbitrageurs are motivated to rectify deviations from the peg by capitalizing on price differences across various exchanges. 


#Advantages of Oracle Swap AMMsAfter gaining a comprehensive understanding of how Stable Swap AMMs operate, let's delve into their advantages:

    1. Minimal Slippage: Oracle Swap AMMs are optimized for stablecoin trading, ensuring minimal slippage even during significant volume fluctuations.
    
    2. Lower Fees: In comparison to centralized exchanges, Oracle Swap AMMs typically feature reduced trading fees, making them appealing to users.
    
    3. Decentralization: Operating on blockchain networks, they eliminate the need for intermediaries, providing users with full control over their assets.
    
    4. Liquidity Provision: Users have the opportunity to earn passive income by providing liquidity to Oracle Swap AMMs and receiving a share of the trading fees.
    

These benefits make Stable Swap AMMs an attractive option for traders and liquidity providers in the decentralized finance (DeFi) space.

#Challenges and ConsiderationsAlthough Oracle Swap AMMs offer numerous advantages, it's important to acknowledge the challenges and considerations that accompany them.:

    1. Impermanent Loss: Liquidity providers may experience impermanent loss if the relative prices of stablecoins in the pool deviate from the external market.
    
    2. Algorithm Complexity: Creating an efficient Oracle Swap AMM algorithm can be challenging, as it requires balancing stability with flexibility.
    
    3. Regulatory Scrutiny: The DeFi space, including Oracle Swap AMMs, is facing growing regulatory scrutiny in various jurisdictions.



## AMM Contract

All of the commands in this section expect to be run from the `contract` directory.

### Building

You need to have [Foundry](https://getfoundry.sh/) and `node` installed to run this example.
Once you have installed these tools, run the following commands from the [`contract`](./contract) directory to install openzeppelin and forge dependencies:

```
forge install foundry-rs/forge-std@v1.8.0 --no-git --no-commit
forge install OpenZeppelin/openzeppelin-contracts@v4.8.1 --no-git --no-commit
```

After installing the above dependencies, you need to install pyth-sdk-solidity.

```
npm init -y
npm install @pythnetwork/pyth-sdk-solidity
```

### Testing

Simply run `forge test` in the [`contract`](./contract) directory. This command will run the
tests located in the [`contract/test`](./contract/test) directory.

### Deploying
#### Evironment:
To deploy the contract, you first need to set up your environment with the following values, create a .env file at the root directory with the following variables:

``` bash
RPC_URL="YOUR_RPC_URL"
PRIVATE_KEY="YOUR_PRIVATE_KEY"
PYTH_ADDRESS="PYTH_ADDRESS"

TOKEN_NAME_1=MockWETH
TOKEN_SYMBOL_1=mWETH
TOKEN_NAME_2=MockSOL
TOKEN_SYMBOL_2=mSOL


BASE_PRICE_ID=0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace # ETH/USD
QUOTE_PRICE_ID=0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d # SOL/USD
```

Here, `RPC_URL` is the URL of the EVM chain you want to use, `PRIVATE_KEY` is the private key of the account you want to deploy from, and `WALLET_ADDRESS` is the address of the account associated with the private key. Make sure the account has enough funds to pay for the gas.

Check [Pyth Contract Address](https://docs.pyth.network/price-feeds/contract-addresses/evm) to get the `PYTH_ADDRESS` for your respective network.

`TOKEN_NAME_1` and `TOKEN_SYMBOL_1` are the name and symbol of the base token in the pool, and `TOKEN_NAME_2` and `TOKEN_SYMBOL_2` are the name and symbol of the quote token in the pool. **NOTE:** The above values are made up, and you can use any name and symbol you want. 




We will use the `BASE_PRICE_ID` and `QUOTE_PRICE_ID` to get the price of the tokens from the Pyth oracle. These price feeds should be in the form of `BASE/USD` and `QUOTE/USD`. Above we are using `ETH/USD` and `SOL/USD` price feeds.

We can assume our ERC20 tokens to be any coin that has a price feed on Pyth. 

For example, if we need a pair for `ETH/SOL`, we can use the following price ids:

Check [Pyth Price Feed Ids](https://pyth.network/developers/price-feed-ids) for the complete list of supported feeds.

use cmd:
```bash
source .env
```
to set up the environment variables.

After setting up the environment, you can deploy the contract by running the following command:

``` bash
forge script scripts/OracleDeployment.s.sol --rpc-url $RPC_URL --broadcast
```

This script will deploy 2 ERC20 tokens, the OracleSwap contract, and initialize the pool with the Pyth price feed.
It also transfers some of the tokens to the pool for testing purposes.

After deploying the contract, you will see the address of the deployed contract in the output.
You can use this address to interact with the contract.

#### Processing Log
 The log of deploying the contract in our project is :
 ```bash
 == Logs ==
  Base Token deployed at address:  0xD6754ec4c5d77a19dFaE367D9d5190E3a8fCF41D
  Quote Token deployed at address:  0xf0eD38a4E1571A0B4cF2bC985BA4E07C236f2FD8
  OracleSwap contract deployed at address:  0x6928D27daC7Aa1C5398713733b5B718B9B1A9DBe
 ```

### Create ABI

If you change the contract, you will need to create a new ABI.
The frontend uses this ABI to create transactions.
You can overwrite the existing ABI by running the following command:

```
forge inspect OracleSwap abi > ../app/src/abi/OracleSwapAbi.json
```

## Frontend Application
### UI
![alt text](<img1.png>)
The left side of page is the info of the token pairs of your address and the AMM address.
The right side of page contains two parts:1.Swap block 2. liquidity block.
In swap block, you can buy or sell baseToken.
In liquidity block, you can add/remove liquidity and check the shares.
### Set up
By default, the frontend is configured to use the already deployed version of the oracle AMM
at address [`0x6928D27daC7Aa1C5398713733b5B718B9B1A9DBe`]on Sepolia Testnet.
This means you can start playing with the application without going through the steps above (Remember to switch your wallet to Sepolia and claim funds from a faucet to pay for the gas).

To set the variables of contract info, you need to set the variables in 'pyth-examples/price_feeds/evm/oracle_swap/app/src/App.tsx' and copy the values from .env and the contract deployment log.

### Build

From the `app/` directory, run the following commands to install dependencies and build the frontend:

```
npm i
npm run build
```

### Run

After building, you can start the frontend by navigating to the `app/` directory and running:

`npm run start`

Then navigate your browser to `localhost:3000`.
