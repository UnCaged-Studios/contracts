// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import "optimism-bedrock/universal/IOptimismMintableERC20.sol";

/**
 * @title MyToken
 * @notice This is a sample implementation of a token contract which is both ERC20 and OptimismMintableERC20 compatible
 * and also includes the ERC20 Permit extension.
 */
contract MyToken is ERC20, ERC20Permit, ERC165, IOptimismMintableERC20 {
    address public override remoteToken;
    address public override bridge;

    constructor(address _remoteToken, address _bridge) ERC20("MyToken", "MTK") ERC20Permit("MyToken") {
        remoteToken = _remoteToken;
        bridge = _bridge;
    }

    /**
     * @notice Mints `_amount` tokens to address `_to`.
     * @param _to Receiver of the tokens.
     * @param _amount Amount of tokens to mint.
     */
    function mint(address _to, uint256 _amount) external override {
        require(msg.sender == bridge, "Only bridge can mint");
        _mint(_to, _amount);
    }

    /**
     * @notice Burns `_amount` tokens from address `_from`.
     * @param _from Address of the token holder.
     * @param _amount Amount of tokens to burn.
     */
    function burn(address _from, uint256 _amount) external override {
        require(msg.sender == bridge, "Only bridge can burn");
        _burn(_from, _amount);
    }

    /**
     * @notice Implements the {IERC165} interface checker.
     * @param interfaceId The interface identifier, as specified in ERC-165
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC165, IERC165) returns (bool) {
        return interfaceId == type(IOptimismMintableERC20).interfaceId || super.supportsInterface(interfaceId);
    }
}
