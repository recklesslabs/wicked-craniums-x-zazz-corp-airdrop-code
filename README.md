# Wicked Craniums x Zazzcorp

Code for the Wicked Craniums x Zazzcorp Polygon airdrop execution.

Tiers:

```
| Tier    | Total Craniums held | Total wallets |
|---------|---------------------|---------------|
| Tier #5 | 1                   | 3121          |
| Tier #4 | 2-4                 | 1205          |
| Tier #3 | 5-19                | 286           |
| Tier #2 | 20-99               | 52            |
| Tier #1 | >= 100              | 6             |
```

The function executed on the contract for the airdrop:

```
function multiAirdrop(address[] memory ads) public onlyOwner {
    for (uint256 i = 0; i < ads.length; i++) {
       _safeMint(ads[i], 1);
   }
}
```
