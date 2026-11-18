// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract MessageStore {
    address public immutable owner;
    string public message = "Hello Web3";

    event MessageUpdated(address indexed author, string newMessage);

    constructor() {
        owner = msg.sender;
    }

    function setMessage(string calldata newMessage) external {
        require(msg.sender == owner, "Only owner");
        require(bytes(newMessage).length > 0, "Message is empty");
        require(bytes(newMessage).length <= 280, "Message is too long");

        message = newMessage;

        emit MessageUpdated(msg.sender, newMessage);
    }
}