// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title CertificateNFT
 * @notice Soulbound educational certificate NFT implementing ERC-721 and EIP-5192.
 * @dev Transfers are permanently blocked after mint (soulbound).
 *      Personal student data is NEVER stored on-chain or on IPFS.
 *      tokenURI always points to an immutable IPFS CID.
 *      Implements EIP-5192: every token is permanently locked at mint.
 */
contract CertificateNFT is ERC721URIStorage, AccessControl {

    // ------------------------------------------------------------------ roles

    /// @notice Role identifier for administrators (equals DEFAULT_ADMIN_ROLE).
    bytes32 public constant ADMIN_ROLE = DEFAULT_ADMIN_ROLE;

    /// @notice Role identifier for certificate issuers.
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");

    // ----------------------------------------------------------------- events

    /// @dev EIP-5192 required event — emitted once per token at mint.
    event Locked(uint256 indexed tokenId);

    /// @notice Emitted when a certificate is successfully minted.
    event CertificateMinted(
        address indexed to,
        uint256 indexed tokenId,
        string  uri
    );

    /// @notice Emitted when a certificate is revoked.
    event CertificateRevoked(uint256 indexed tokenId);

    // ------------------------------------------------------------------ state

    /// @notice Auto-incrementing counter used to generate unique token IDs.
    uint256 private _nextTokenId;

    /// @notice Whether a given token has been revoked by an issuer.
    mapping(uint256 => bool) public revoked;

    // --------------------------------------------------------------- EIP-5192

    /// @dev EIP-5192 interface ID: bytes4(keccak256("locked(uint256)")).
    bytes4 private constant _INTERFACE_ID_EIP5192 = 0xb45a3c0e;

    // ----------------------------------------------------------------- errors

    /// @notice Raised when a transfer is attempted on a soulbound token.
    error SoulboundTransferNotAllowed();

    /// @notice Raised when an operation targets a non-existent token.
    error TokenDoesNotExist(uint256 tokenId);

    /// @notice Raised when revoking a token that is already revoked.
    error TokenAlreadyRevoked(uint256 tokenId);

    // -------------------------------------------------------------- constructor

    /**
     * @notice Deploy a new CertificateNFT collection.
     * @param name   ERC-721 collection name.
     * @param symbol ERC-721 collection symbol.
     * @param admin  Address that receives ADMIN_ROLE and ISSUER_ROLE.
     */
    constructor(
        string memory name,
        string memory symbol,
        address admin
    ) ERC721(name, symbol) {
        _grantRole(ADMIN_ROLE,  admin);
        _grantRole(ISSUER_ROLE, admin);
    }

    // ------------------------------------------------------------------ mint

    /**
     * @notice Mint a soulbound certificate to `to`.
     * @dev Auto-increments an internal counter to produce the token ID.
     *      Emits {CertificateMinted} and {Locked} as required by EIP-5192.
     * @param to  Recipient address (student wallet).
     * @param uri IPFS CID URI (ipfs://<CID>) — must point to immutable metadata.
     * @return tokenId The ID of the newly minted token.
     */
    function mint(
        address to,
        string calldata uri
    ) external onlyRole(ISSUER_ROLE) returns (uint256 tokenId) {
        tokenId = ++_nextTokenId;

        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);

        emit CertificateMinted(to, tokenId, uri);
        emit Locked(tokenId);
    }

    // ----------------------------------------------------------------- revoke

    /**
     * @notice Revoke a certificate permanently.
     * @dev Sets revoked[tokenId] = true. Revocation is irreversible.
     * @param tokenId The certificate to revoke.
     */
    function revoke(uint256 tokenId) external onlyRole(ISSUER_ROLE) {
        if (_ownerOf(tokenId) == address(0)) revert TokenDoesNotExist(tokenId);
        if (revoked[tokenId])               revert TokenAlreadyRevoked(tokenId);

        revoked[tokenId] = true;
        emit CertificateRevoked(tokenId);
    }

    // ----------------------------------------------------------- isRevoked

    /**
     * @notice Returns whether a certificate has been revoked.
     * @param tokenId The token to query.
     * @return True if the token has been revoked, false otherwise.
     */
    function isRevoked(uint256 tokenId) public view returns (bool) {
        return revoked[tokenId];
    }

    // --------------------------------------------------------------- tokenURI

    /**
     * @notice Returns the metadata URI for a token.
     * @dev Reverts if the token does not exist or has been revoked.
     *      Revoked certificates intentionally expose no metadata.
     * @param tokenId The token to query.
     */
    function tokenURI(uint256 tokenId)
        public
        view
        override
        returns (string memory)
    {
        if (_ownerOf(tokenId) == address(0)) revert TokenDoesNotExist(tokenId);
        if (revoked[tokenId])               revert TokenAlreadyRevoked(tokenId);
        return super.tokenURI(tokenId);
    }

    // -------------------------------------------------------- soulbound logic

    /**
     * @dev Override _update to block all transfers except mints (from == address(0)).
     *      Burns are also blocked to preserve the on-chain certificate record.
     * @param to      Destination address.
     * @param tokenId Token being moved.
     * @param auth    Authorised operator (unused here).
     */
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override returns (address) {
        address from = _ownerOf(tokenId);

        // Block every movement except the initial mint (from == address(0))
        if (from != address(0)) {
            revert SoulboundTransferNotAllowed();
        }

        return super._update(to, tokenId, auth);
    }

    // --------------------------------------------------------------- EIP-5192

    /**
     * @notice Returns true for every minted token — all tokens are permanently locked.
     * @param tokenId The token to query.
     */
    function locked(uint256 tokenId) external view returns (bool) {
        if (_ownerOf(tokenId) == address(0)) revert TokenDoesNotExist(tokenId);
        return true;
    }

    // ---------------------------------------------------------- supportsInterface

    /**
     * @notice Query supported interfaces (ERC-165).
     * @dev Adds EIP-5192 on top of ERC721URIStorage and AccessControl.
     * @param interfaceId The interface identifier to query.
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721URIStorage, AccessControl)
        returns (bool)
    {
        return
            interfaceId == _INTERFACE_ID_EIP5192 ||
            super.supportsInterface(interfaceId);
    }
}
