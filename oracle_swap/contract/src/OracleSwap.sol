// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@pythnetwork/pyth-sdk-solidity/IPyth.sol";
import "@pythnetwork/pyth-sdk-solidity/PythStructs.sol";
import "@pythnetwork/pyth-sdk-solidity/PythUtils.sol";
import "openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";

library Math {
    function abs(uint x, uint y) internal pure returns (uint) {
        return x >= y ? x - y : y - x;
    }
}

// Example oracle AMM powered by Pyth price feeds.
//
// The contract holds a pool of two ERC-20 tokens, the BASE and the QUOTE, and allows users to swap tokens
// for the pair BASE/QUOTE. For example, the base could be WETH and the quote could be USDC, in which case you can
// buy WETH for USDC and vice versa. The pool offers to swap between the tokens at the current Pyth exchange rate for
// BASE/QUOTE, which is computed from the BASE/USD price feed and the QUOTE/USD price feed.
//
// This contract only implements the swap functionality. It does not implement any pool balancing logic (e.g., skewing the
// price to reflect an unbalanced pool) or depositing / withdrawing funds. When deployed, the contract needs to be sent
// some quantity of both the base and quote token in order to function properly (using the ERC20 transfer function to
// the contract's address).
contract OracleSwap {
    event Transfer(
        address from,
        address to,
        uint256 amountUsd,
        uint256 amountWei
    );

    IPyth pyth;

    // Number of tokens
    uint private constant N = 2;
    // Normalize each token to 18 decimals
    // Example - DAI (18 decimals), USDT (6 decimals)
    uint[N] private multipliers = [1, 1e12];
    // Amplification coefficient multiplied by N^(N - 1)
    // Higher value makes the curve more flat
    // Lower value makes the curve more like constant product AMM
    uint private constant A = 1000 * (N ** (N - 1));
    // 0.03%
    uint private constant SWAP_FEE = 300;
    // Liquidity fee is derived from 2 constraints
    // 1. Fee is 0 for adding / removing liquidity that results in a balanced pool
    // 2. Swapping in a balanced pool is like adding and then removing liquidity
    //    from a balanced pool
    // swap fee = add liquidity fee + remove liquidity fee
    uint private constant LIQUIDITY_FEE = (SWAP_FEE * N) / (4 * (N - 1));
    uint private constant FEE_DENOMINATOR = 1e6;

    // 1 share = 1e18, 18 decimals
    uint private constant DECIMALS = 18;
    uint public totalSupply;
    mapping(address => uint) public balanceOf;

    bytes32 baseTokenPriceId;
    bytes32 quoteTokenPriceId;

    // uint baseTokenMultiplier;
    // uint quoteTokenMultiplier;

    ERC20 public baseToken;
    ERC20 public quoteToken;

    uint baseMultiplier;
    uint quoteMultiplier;

    constructor(
        address _pyth,
        bytes32 _baseTokenPriceId,
        bytes32 _quoteTokenPriceId,
        address _baseToken,
        address _quoteToken,
        uint _baseTokenMultiplier,
        uint _quoteTokenMultiplier
    ) {
        pyth = IPyth(_pyth);
        baseTokenPriceId = _baseTokenPriceId;
        quoteTokenPriceId = _quoteTokenPriceId;
        baseToken = ERC20(_baseToken);
        quoteToken = ERC20(_quoteToken);
        baseMultiplier = _baseTokenMultiplier;
        quoteMultiplier = _quoteTokenMultiplier;
    }

    function _mint(address _to, uint _amount) private {
        balanceOf[_to] += _amount;
        totalSupply += _amount;
    }

    function _burn(address _from, uint _amount) private {
        balanceOf[_from] -= _amount;
        totalSupply -= _amount;
    }

    // Return precision-adjusted balances, adjusted to 18 decimals
    function _xp() private view returns (uint[N] memory xp) {
        xp[0] = baseToken.balanceOf(address(this)) * baseMultiplier;
        xp[1] = quoteToken.balanceOf(address(this)) * quoteMultiplier;
    }

    /**
     * @notice Calculate D, sum of balances in a perfectly balanced pool
     * If balances of x_0, x_1, ... x_(n-1) then sum(x_i) = D
     * @param xp Precision-adjusted balances
     * @return D
     */
    function _getD(uint[N] memory xp) private pure returns (uint) {
        /*
        Newton's method to compute D
        -----------------------------
        f(D) = ADn^n + D^(n + 1) / (n^n prod(x_i)) - An^n sum(x_i) - D 
        f'(D) = An^n + (n + 1) D^n / (n^n prod(x_i)) - 1

                     (as + np)D_n
        D_(n+1) = -----------------------
                  (a - 1)D_n + (n + 1)p

        a = An^n
        s = sum(x_i)
        p = (D_n)^(n + 1) / (n^n prod(x_i))
        */
        uint a = A * N; // An^n

        uint s; // x_0 + x_1 + ... + x_(n-1)
        for (uint i; i < N; ++i) {
            s += xp[i];
        }

        // Newton's method
        // Initial guess, d <= s
        uint d = s;
        uint d_prev;
        for (uint i; i < 255; ++i) {
            // p = D^(n + 1) / (n^n * x_0 * ... * x_(n-1))
            uint p = d;
            for (uint j; j < N; ++j) {
                if (xp[j] == 0) {
                    revert("Cannot have 0 balance");
                }
                p = (p * d) / (N * xp[j]);
            }
            d_prev = d;
            d = ((a * s + N * p) * d) / ((a - 1) * d + (N + 1) * p);

            if (Math.abs(d, d_prev) <= 1) {
                return d;
            }
        }
        revert("D didn't converge");
    }

    // Buy or sell a quantity of the base token. `size` represents the quantity of the base token with the same number
    // of decimals as expected by its ERC-20 implementation. If `isBuy` is true, the contract will send the caller
    // `size` base tokens; if false, `size` base tokens will be transferred from the caller to the contract. Some
    // number of quote tokens will be transferred in the opposite direction; the exact number will be determined by
    // the current pyth price. The transaction will fail if either the pool or the sender does not have enough of the
    // requisite tokens for these transfers.
    //
    // `pythUpdateData` is the binary pyth price update data (retrieved from Pyth's price
    // service); this data should contain a price update for both the base and quote price feeds.
    // See the frontend code for an example of how to retrieve this data and pass it to this function.
    function swap(
        bool isBuy,
        uint256 size,
        bytes[] calldata pythUpdateData
    ) external payable {
        uint256 updateFee = pyth.getUpdateFee(pythUpdateData);
        pyth.updatePriceFeeds{value: updateFee}(pythUpdateData);

        PythStructs.Price memory currentBasePrice = pyth.getPrice(
            baseTokenPriceId
        );
        PythStructs.Price memory currentQuotePrice = pyth.getPrice(
            quoteTokenPriceId
        );

        // Note: this code does all arithmetic with 18 decimal points. This approach should be fine for most
        // price feeds, which typically have ~8 decimals. You can check the exponent on the price feed to ensure
        // this doesn't lose precision.
        uint256 basePrice = PythUtils.convertToUint(
            currentBasePrice.price,
            currentBasePrice.expo,
            18
        );
        uint256 quotePrice = PythUtils.convertToUint(
            currentQuotePrice.price,
            currentQuotePrice.expo,
            18
        );

        // This computation loses precision. The infinite-precision result is between [quoteSize, quoteSize + 1]
        // We need to round this result in favor of the contract.
        uint256 quoteSize = (size * basePrice) / quotePrice;

        // TODO: use confidence interval

        if (isBuy) {
            // (Round up)
            quoteSize += 1;

            quoteToken.transferFrom(msg.sender, address(this), quoteSize);
            baseToken.transfer(msg.sender, size);
        } else {
            baseToken.transferFrom(msg.sender, address(this), size);
            quoteToken.transfer(msg.sender, quoteSize);
        }
    }

    // Get the number of base tokens in the pool
    function baseBalance() public view returns (uint256) {
        return baseToken.balanceOf(address(this));
    }

    // Get the number of quote tokens in the pool
    function quoteBalance() public view returns (uint256) {
        return quoteToken.balanceOf(address(this));
    }

    // Send all tokens in the oracle AMM pool to the caller of this method.
    // (This function is for demo purposes only. You wouldn't include this on a real contract.)
    function withdrawAll() external {
        baseToken.transfer(msg.sender, baseToken.balanceOf(address(this)));
        quoteToken.transfer(msg.sender, quoteToken.balanceOf(address(this)));
    }

    // Reinitialize the parameters of this contract.
    // (This function is for demo purposes only. You wouldn't include this on a real contract.)
    function reinitialize(
        bytes32 _baseTokenPriceId,
        bytes32 _quoteTokenPriceId,
        address _baseToken,
        address _quoteToken
    ) external {
        baseTokenPriceId = _baseTokenPriceId;
        quoteTokenPriceId = _quoteTokenPriceId;
        baseToken = ERC20(_baseToken);
        quoteToken = ERC20(_quoteToken);
    }

    function initShare() external returns (uint shares) {
        require(totalSupply == 0, "already initialized");
        uint[N] memory old_xs = _xp();
        if (old_xs[0] > 0 && old_xs[1] > 0) {
            _mint(address(this), _getD(old_xs));
        }
    }

    function getxp() external view returns (uint[N] memory) {
        return _xp();
    }

    function getD() external view returns (uint) {
        return _getD(_xp());
    }

    function addLiquidity(
        uint baseBalanceAmount,
        uint quoteBalanceAmount,
        uint minShares
    ) external returns (uint shares) {
        // calculate current liquidity d0
        uint _totalSupply = totalSupply;
        uint d0;
        uint[N] memory old_xs = _xp();
        if (_totalSupply > 0) {
            d0 = _getD(old_xs);
        } else {
            if (old_xs[0] > 0 && old_xs[1] > 0) {
                d0 = _getD(old_xs);
                _mint(address(this), d0);
            }
        }

        // Transfer tokens in
        uint[N] memory new_xs;
        // for (uint i; i < N; ++i) {
        //     uint amount = amounts[i];
        //     if (amount > 0) {
        //         IERC20(tokens[i]).transferFrom(
        //             msg.sender,
        //             address(this),
        //             amount
        //         );
        //         new_xs[i] = old_xs[i] + amount * multipliers[i];
        //     } else {
        //         new_xs[i] = old_xs[i];
        //     }
        // }
        if (baseBalanceAmount > 0) {
            baseToken.transferFrom(
                msg.sender,
                address(this),
                baseBalanceAmount
            );
            new_xs[0] = old_xs[0] + baseBalanceAmount;
        } else {
            new_xs[0] = old_xs[0];
        }
        if (quoteBalanceAmount > 0) {
            quoteToken.transferFrom(
                msg.sender,
                address(this),
                quoteBalanceAmount
            );
            new_xs[1] = old_xs[1] + quoteBalanceAmount;
        } else {
            new_xs[1] = old_xs[1];
        }

        // Calculate new liquidity d1
        uint d1 = _getD(new_xs);
        require(d1 > d0, "liquidity didn't increase");

        // Reccalcuate D accounting for fee on imbalance
        uint d2;
        if (_totalSupply > 0) {
            for (uint i; i < N; ++i) {
                // TODO: why old_xs[i] * d1 / d0? why not d1 / N?
                uint idealBalance = (old_xs[i] * d1) / d0;
                uint diff = Math.abs(new_xs[i], idealBalance);
                new_xs[i] -= (LIQUIDITY_FEE * diff) / FEE_DENOMINATOR;
            }

            d2 = _getD(new_xs);
        } else {
            d2 = d1;
        }

        // Update balances
        // for (uint i; i < N; ++i) {
        //     balances[i] += amounts[i];
        // }

        // Shares to mint = (d2 - d0) / d0 * total supply
        // d1 >= d2 >= d0
        if (_totalSupply > 0) {
            shares = ((d2 - d0) * _totalSupply) / d0;
        } else {
            shares = d2;
        }
        require(shares >= minShares, "shares < min");
        _mint(msg.sender, shares);
    }

    function removeLiquidity(
        uint shares,
        uint minBaseAmoutOut,
        uint minQuoteAmountOut
    ) external returns (uint[N] memory amountsOut) {
        require(shares <= balanceOf[msg.sender], "insufficient balance");
        uint _totalSupply = totalSupply;
        uint baseToeknBalance = baseBalance();
        uint quoteTokenBalance = quoteBalance();

        uint baseAmountOut = (baseToeknBalance * shares) / _totalSupply;
        require(baseAmountOut >= minBaseAmoutOut, "out < min");
        baseToken.transfer(msg.sender, baseAmountOut);
        uint quoteAmountOut = (quoteTokenBalance * shares) / _totalSupply;
        require(quoteAmountOut >= minQuoteAmountOut, "out < min");
        quoteToken.transfer(msg.sender, quoteAmountOut);

        _burn(msg.sender, shares);
        amountsOut = [baseAmountOut, baseAmountOut];
    }

    receive() external payable {}
}
