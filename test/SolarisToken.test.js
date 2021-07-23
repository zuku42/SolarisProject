const SolarisToken = artifacts.require('./SolarisToken.sol')


require('chai')
	.use(require('chai-as-promised'))
	.should()


contract('SolarisToken', (accounts) => {
	let token

	before(async () => {
		token = await SolarisToken.deployed()
	})

	describe('deployment', async () => {
		it('deploys successfully', async () => {
			const address = token.address
			assert.notEqual(address, 0x0)
			assert.notEqual(address, '')
			assert.notEqual(address, null)
			assert.notEqual(address, undefined)
		})

		it('deployment initializes state variables correctly', async () => {
			const powerCap = await token.powerCap()
			const totalPower = await token.totalPower()
			assert.equal(powerCap, 100_000)
			assert.equal(totalPower, 0)
		})
	})

	describe('minting', async() => {
		it('mints successfully with correct arguments passed', async () => {
			await token.mint(20, {value: 200}).should.not.be.rejected
			await token.mint(1111, {value: 11110}).should.not.be.rejected
		})


		it('minting fails with incorrect message value', async () => {
			await token.mint(20, {value: 201}).should.be.rejected
			await token.mint(20, {value: 199}).should.be.rejected
			await token.mint(20).should.be.rejected
		})

		it('minting fails when power limit exceeded', async() => {
			await token.mint(99_990, {value: 999_900}).should.be.rejected
			await token.mint(100_001, {value: 1_000_010}).should.be.rejected
		})

		it('minting fails with invalid power value', async() => {
			await token.mint(0, {value: 0}).should.be.rejected
			await token.mint(-10, {value: -100}).should.be.rejected
		})

		it ('minting increases total supply, total power and ids', async() => {
			const supplyBefore = await token.totalSupply()
			const powerBefore = await token.totalPower()

			let minted = await token.mint(100, {value: 1000})
			let tokenId = minted.logs[0].args.tokenId.toNumber()
			assert(tokenId == supplyBefore.toNumber() + 1)

			minted = await token.mint(123, {value: 1230})
			tokenId = minted.logs[0].args.tokenId.toNumber()
			assert(tokenId == supplyBefore.toNumber() + 2)

			const supplyAfter = await token.totalSupply()
			const powerAfter = await token.totalPower()

			assert(supplyAfter - supplyBefore == 2)
			assert(powerAfter - powerBefore == 223)
		})
	})

	describe('splitting', async () => {
		it('allows owner to split a token when valid arguments passed', async () => {
			let minted = await token.mint(1500, {value: 15_000})
			let mintedId = minted.logs[0].args.tokenId
			await token.split(mintedId, [1000, 499, 1]).should.not.be.rejected

			minted = await token.mint(2, {value: 20, from: accounts[1]})
			mintedId = minted.logs[0].args.tokenId
			await token.split(mintedId, [1, 1], {from: accounts[1]}).should.not.be.rejected
		})

		it('prevets other accounts to split a token they do not own', async () => {
			let minted = await token.mint(120, {value: 1200})
			let mintedId = minted.logs[0].args.tokenId
			await token.split(mintedId, [100, 20], {from: accounts[1]}).should.be.rejected

			minted = await token.mint(500, {value: 5000, from: accounts[1]})
			mintedId = minted.logs[0].args.tokenId
			await token.split(mintedId, [100, 400]).should.be.rejected
		})

		it('does not split the token if invalid values passed', async () => {
			const minted = await token.mint(201, {value: 2010})
			const mintedId = minted.logs[0].args.tokenId
			await token.split(mintedId, [100, 100, 20]).should.be.rejected
			await token.split(mintedId, [100, 50, 1]).should.be.rejected
			await token.split(mintedId, [201]).should.be.rejected
		})

		it('does not split the token if values passed violate minting rules', async () =>{
			const minted = await token.mint(2222, {value: 22220})
			const mintedId = minted.logs[0].args.tokenId
			await token.split(mintedId, [2222, 0, 0, 0]).should.be.rejected
			await token.split(mintedId, [2000, 200, 20, 4, -2]).should.be.rejected
		})

		it('splitting does not increase total power', async() => {
			const minted = await token.mint(1234, {value: 12340})
			const mintedId = minted.logs[0].args.tokenId
			const powerBefore = await token.totalPower()

			await token.split(mintedId, [1000, 200, 30, 4])

			const powerAfter = await token.totalPower()

			assert(powerBefore.toNumber() == powerAfter.toNumber())
		})

		it('splitting creates new tokens and increases total supply', async() => {
			const minted = await token.mint(4321, {value: 43210})
			const mintedId = minted.logs[0].args.tokenId
			const supplyBefore = await token.totalSupply()

			const splitValues = [4000, 300, 20, 1]
			await token.split(mintedId, splitValues)

			const supplyAfter = await token.totalSupply()

			assert(supplyAfter.toNumber() == supplyBefore.toNumber() + splitValues.length - 1)
		})

		it('splitting destroys old token and creates new ones with the same power equivalent', async() => {
			const minted = await token.mint(420, {value: 4200})
			const mintedId = minted.logs[0].args.tokenId.toNumber()

			await token.split(mintedId, [200, 220])
			await token.ownerOf(mintedId).should.be.rejected

			const powerOfFirst = await token.tokenPowers(mintedId + 1)
			const powerOfSecond =  await token.tokenPowers(mintedId + 2)

			assert.equal(powerOfFirst.toNumber() + powerOfSecond.toNumber(), 420)
		})

		it('split tokens are owned by the same account as the original token', async() => {
			const minted = await token.mint(333, {value: 3330, from: accounts[1]})
			const mintedId = minted.logs[0].args.tokenId.toNumber()
			const owner = await token.ownerOf(mintedId)

			await token.split(mintedId, [300, 30, 3], {from: accounts[1]})

			for(i = 1; i<4; i++){
				newOwner = await token.ownerOf(mintedId + i)
				assert.equal(owner, newOwner)
			}
		})
	})
})