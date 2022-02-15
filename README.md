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

Images (IPFS)

- [tier 1](https://ipfs.io/ipfs/bafybeiblrytjs6hb5n2qm6sngz3kzwdaptdumxmrdf6nh6mcdbusdycr6u)
- [tier 2](https://ipfs.io/ipfs/bafybeifsd6netdblcfpuvqyd7d753ijqi6rranvcwgpg3incj3l4xvseoy)
- [tier 3](https://ipfs.io/ipfs/bafybeidb2ec2qzfibeccx7uto2edc74rrlcxhsoxxdlnmwzvhvjsmd4dvy)
- [tier 4](https://ipfs.io/ipfs/bafybeiclhtpjyuijkqkwfgcbprwyn4z4xjej7n6e4ieoyjifbdyh2kng3y)
- [tier 5](https://ipfs.io/ipfs/bafybeiaqjfmuijlcc7zo3agiz5hjh4c5rcrqnw2ubdrwsqzb3oh7vhef6e)
