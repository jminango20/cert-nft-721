# EduCert contracts — DONE

## Files created / modified

| File | Action | Description |
|------|--------|-------------|
| `contracts/CertificateNFT.sol` | modified | Soulbound ERC-721 + EIP-5192 certificate contract |
| `test/CertificateNFT.test.ts` | modified | Full Hardhat/chai test suite (20 tests) |
| `scripts/deploy.ts` | modified | Deploy script updated for new constructor signature |
| `hardhat.config.ts` | modified | Added `hardhat-gas-reporter` import and config |
| `.env.example` | created | Template for AMOY_RPC_URL, PRIVATE_KEY, POLYGONSCAN_API_KEY |

## Contract: CertificateNFT.sol

- **Inheritance**: ERC721URIStorage, AccessControl (OpenZeppelin 5)
- **EIP-5192 soulbound**: `_update` override reverts for any `from != address(0)` — blocks transfers and burns; `locked(tokenId)` always returns true
- **Roles**: `ADMIN_ROLE` (= `DEFAULT_ADMIN_ROLE`), `ISSUER_ROLE`
- **Constructor**: takes `name`, `symbol`, `admin` — grants ADMIN_ROLE + ISSUER_ROLE to admin
- **mint**: ISSUER_ROLE only, auto-increments `_nextTokenId` counter, emits `CertificateMinted` + `Locked`
- **revoke**: ISSUER_ROLE only, sets `revoked[tokenId] = true`, emits `CertificateRevoked`
- **isRevoked**: public view helper returning `revoked[tokenId]`
- **tokenURI**: reverts for non-existent or revoked tokens (no metadata leakage)
- **supportsInterface**: ERC-165 covering ERC721, AccessControl, and EIP-5192 (0xb45a3c0e)
- **NatSpec**: all public/external functions documented with @notice and @param

## Tests: 20 passing (618 ms)

```
CertificateNFT
  mint
    ✔ issuer can mint — tokenURI matches and owner is correct
    ✔ mint emits CertificateMinted and Locked events
    ✔ token IDs auto-increment starting at 1
    ✔ non-issuer cannot mint — reverts with AccessControlUnauthorizedAccount
  revoke
    ✔ issuer can revoke — isRevoked returns true
    ✔ non-issuer cannot revoke — reverts with AccessControlUnauthorizedAccount
    ✔ revoking a non-existent token reverts with TokenDoesNotExist
    ✔ revoking an already-revoked token reverts with TokenAlreadyRevoked
  soulbound — transfers must revert
    ✔ transferFrom reverts with SoulboundTransferNotAllowed
    ✔ safeTransferFrom reverts with SoulboundTransferNotAllowed
    ✔ transfer from admin also reverts (soulbound ignores roles)
  tokenURI
    ✔ returns the correct IPFS URI set at mint
    ✔ reverts for a revoked token
    ✔ reverts for a non-existent token
  EIP-5192 locked()
    ✔ returns true for a minted token
    ✔ reverts for a non-existent token
  supportsInterface
    ✔ supports EIP-5192 interface (0xb45a3c0e)
    ✔ supports ERC-721 interface (0x80ac58cd)
    ✔ supports IAccessControl interface (0x7965db0b)
    ✔ does not support a random unknown interface
```

## Observações

- Personal student data never goes on-chain or IPFS — only the IPFS CID of the metadata document is stored.
- Revoked tokens expose no tokenURI (defensive: metadata is hidden on revocation).
- Burns are intentionally blocked to preserve the immutable on-chain record.
- Deploy must not be executed until tests pass — enforced by workflow convention.
- Constructor accepts `name` and `symbol` for flexibility across multiple certificate collections.
- `hardhat-gas-reporter` is bundled; activate via `REPORT_GAS=true npx hardhat test`.
