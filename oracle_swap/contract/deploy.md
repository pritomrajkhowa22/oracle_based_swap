### Deployment Output:
Follow the instructions in readme.md to deploy the contract. The following is the output:
```
forge script scripts/OracleDeployment.s.sol --rpc-url $RPC_URL --broadcast
[⠊] Compiling...
No files changed, compilation skipped
Script ran successfully.

== Logs ==
  Base Token deployed at address:  0xD6754ec4c5d77a19dFaE367D9d5190E3a8fCF41D
  Quote Token deployed at address:  0xf0eD38a4E1571A0B4cF2bC985BA4E07C236f2FD8
  OracleSwap contract deployed at address:  0x6928D27daC7Aa1C5398713733b5B718B9B1A9DBe

## Setting up 1 EVM.

==========================

Chain 11155111

Estimated gas price: 116.315956488 gwei

Estimated total gas used for script: 4408190

Estimated amount required: 0.51274283623083672 ETH

==========================

##### sepolia
✅  [Success]Hash: 0x44132ccc71acc8fa29b0816de7e58a2805277c330dc27f3e3331541904ae3701
Block: 6092421
Paid: 0.0029448443110021 ETH (51445 gas * 57.24257578 gwei)


##### sepolia
✅  [Success]Hash: 0xf2655a1f93fd3cac00106530eaafafce43bc5ef9b8f11b290b7f953276f6537d
Contract Address: 0xf0eD38a4E1571A0B4cF2bC985BA4E07C236f2FD8
Block: 6092421
Paid: 0.04424627861748458 ETH (772961 gas * 57.24257578 gwei)


##### sepolia
✅  [Success]Hash: 0x704d8688dc39494484febdc7e28eb04a041873f10eefb9b360fc4bc22f9773d6
Contract Address: 0x6928D27daC7Aa1C5398713733b5B718B9B1A9DBe
Block: 6092421
Paid: 0.10064527055821472 ETH (1758224 gas * 57.24257578 gwei)


##### sepolia
✅  [Success]Hash: 0x889155e17e9dd6940b8396b3b2a7809634c25bdbcdad9902ec983a6dfdf8859d
Contract Address: 0xD6754ec4c5d77a19dFaE367D9d5190E3a8fCF41D
Block: 6092421
Paid: 0.0442476524393033 ETH (772985 gas * 57.24257578 gwei)


##### sepolia
✅  [Success]Hash: 0xc4f3bed1f225c6f689702c193fe0dcce5bb7d779768349507c017932a19c6126
Block: 6092421
Paid: 0.0029448443110021 ETH (51445 gas * 57.24257578 gwei)

✅ Sequence #1 on sepolia | Total Paid: 0.1950288902370068 ETH (3407060 gas * avg 57.24257578 gwei)
                                                                                                                                                                

==========================

ONCHAIN EXECUTION COMPLETE & SUCCESSFUL.

Transactions saved to: /Users/xyd/code/AMM/pyth-examples/price_feeds/evm/oracle_swap/contract/broadcast/OracleDeployment.s.sol/11155111/run-latest.json

Sensitive values saved to: /Users/xyd/code/AMM/pyth-examples/price_feeds/evm/oracle_swap/contract/cache/OracleDeployment.s.sol/11155111/run-latest.json
```

  Base Token deployed at address:  0xD6754ec4c5d77a19dFaE367D9d5190E3a8fCF41D
  Quote Token deployed at address:  0xf0eD38a4E1571A0B4cF2bC985BA4E07C236f2FD8
  OracleSwap contract deployed at address:  0x6928D27daC7Aa1C5398713733b5B718B9B1A9DBe