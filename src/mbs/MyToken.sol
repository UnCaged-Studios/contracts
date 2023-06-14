// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {ILegacyMintableERC20, IOptimismMintableERC20} from "optimism-bedrock/universal/IOptimismMintableERC20.sol";
import {Semver} from "optimism-bedrock/universal/SemVer.sol";

contract MBSOptimismMintableERC20 is IOptimismMintableERC20, ILegacyMintableERC20, ERC20, Semver, ERC20Permit {
    address public immutable REMOTE_TOKEN;
    address public immutable BRIDGE;

    event Mint(address indexed account, uint256 amount);
    event Burn(address indexed account, uint256 amount);

    modifier onlyBridge() {
        require(msg.sender == BRIDGE, "OptimismMintableERC20: only bridge can mint and burn");
        _;
    }

    constructor(address _bridge, address _remoteToken)
        ERC20("MonkeyBuck", "MBS")
        Semver(1, 0, 0)
        ERC20Permit("MonkeyBuck")
    {
        REMOTE_TOKEN = _remoteToken;
        BRIDGE = _bridge;
    }

    function mint(address _to, uint256 _amount)
        external
        virtual
        override(IOptimismMintableERC20, ILegacyMintableERC20)
        onlyBridge
    {
        _mint(_to, _amount);
        emit Mint(_to, _amount);
    }

    function burn(address _from, uint256 _amount)
        external
        virtual
        override(IOptimismMintableERC20, ILegacyMintableERC20)
        onlyBridge
    {
        _burn(_from, _amount);
        emit Burn(_from, _amount);
    }

    function supportsInterface(bytes4 _interfaceId) external pure override returns (bool) {
        bytes4 iface1 = type(IERC165).interfaceId;
        bytes4 iface2 = type(ILegacyMintableERC20).interfaceId;
        bytes4 iface3 = type(IOptimismMintableERC20).interfaceId;
        return _interfaceId == iface1 || _interfaceId == iface2 || _interfaceId == iface3;
    }

    function l1Token() public view returns (address) {
        return REMOTE_TOKEN;
    }

    function l2Bridge() public view returns (address) {
        return BRIDGE;
    }

    function remoteToken() public view returns (address) {
        return REMOTE_TOKEN;
    }

    function bridge() public view returns (address) {
        return BRIDGE;
    }
}
