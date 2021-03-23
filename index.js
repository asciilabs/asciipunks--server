require('dotenv').config()
const express = require('express')
const app = express()

const Web3 = require('web3')

const web3 = new Web3(
  new Web3.providers.HttpProvider(process.env.ETH_HTTP_PROVIDER_URL)
)

const contractAddress = '0xda6177cCe5f3343300bEA77111380Dd20D9dA6D8'
const contract = new web3.eth.Contract(
  [
    {
      type: 'function',
      name: 'draw',
      inputs: [{ name: '_tokenId', type: 'uint256' }],
      outputs: [{ name: '', type: 'string' }],
    },
  ],
  contractAddress
)

const renderSvg = async (id) => {
  const token = await contract.methods.draw(id).call()

  return `<svg xmlns="http://www.w3.org/2000/svg" width="350" height="350"><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="75px" fill="#fffffa">${token}</text></svg>`
}

app.get('/punks/:id', async (req, res) => {
  const id = req.params.id
  res.send({
    image_data: await renderSvg(1),
    description: '',
    name: `ASCII Punk #${id}`,
    attributes: [],
    background_color: '000000',
  })
})

const port = process.env.PORT || 3000

app.listen(port, () => {
  console.log(`Listening on port ${port}...`)
})
