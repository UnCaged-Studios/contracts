// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract HelloBaseScoreGoal {
    mapping(address => bool) private _hasScoredGoal;

    event ScoredGoal(address indexed scorer);

    function scoreGoal() public {
        require(!_hasScoredGoal[msg.sender], "You have already scored a goal!");

        _hasScoredGoal[msg.sender] = true;

        emit ScoredGoal(msg.sender);
    }

    function hasScoredGoal(address scorer) public view returns (bool) {
        return _hasScoredGoal[scorer];
    }
}
