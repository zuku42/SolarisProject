pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract SolarisToken is Ownable, ERC721Enumerable{

	using Counters for Counters.Counter;

    Counters.Counter private _tokenIds;
	uint public powerCap;
	uint public totalPower;
	mapping(uint => uint) public tokenPowers;


	constructor() ERC721('Solaris Poland 001', 'SOLPL001'){
		totalPower = 0;
		powerCap = 100_000;
	}


	function mint(uint power) public payable {
		require(power > 0, 'Cannot mint a token with negative or zero power equivalent');
		require(totalPower + power <= powerCap, 'Exceeded power cap.');

		_tokenIds.increment();
        uint nextId = _tokenIds.current();
		uint price = _getPrice(power);

		require(msg.value == price);
		totalPower += power;
		tokenPowers[nextId] = power;

		_safeMint(_msgSender(), nextId);
		payable(owner()).transfer(msg.value);
	}


	function split(uint id, uint[] memory powerValues) external {
		require(_msgSender() == ownerOf(id), 'Cannot split a token you do not own');
		require(_getSum(powerValues) == tokenPowers[id], 'Sum of powers has to be equal to the total power of the token');
		require(powerValues.length >= 2, 'Token has to be split into at least two new tokens');

		_burn(id);

		uint nextId;

		for (uint i=0; i<powerValues.length; i++){
			require(powerValues[i] > 0, 'Cannot mint a token with negative or zero power equivalent');
			_tokenIds.increment();
			nextId = _tokenIds.current();
			tokenPowers[nextId] = powerValues[i];
			_safeMint(_msgSender(), nextId);
		}
	}


	function _getSum(uint[] memory arr) private pure returns(uint){
		uint i;
		uint sum = 0;
	    for(i = 0; i < arr.length; i++){
	   		sum = sum + arr[i];
	    }
	    return sum;
	}


	function _getPrice(uint power) private pure returns(uint){
		uint unitPrice = 10;
		uint price = unitPrice * power;
		return price;
	}
}