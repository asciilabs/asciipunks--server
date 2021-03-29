require('dotenv').config()
const express = require('express')
const app = express()
const path = require('path')
const fs = require('fs')

const Web3 = require('web3')

const htmlSafe = require('./lib/htmlSafe')

const web3 = new Web3(
  new Web3.providers.HttpProvider(process.env.ETH_HTTP_PROVIDER_URL)
)

const contractAddress = process.env.CONTRACT_ADDRESS
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
  const token = htmlSafe(await contract.methods.draw(id).call())

  return `<svg xmlns='http://www.w3.org/2000/svg' width='460' height='460'>
  <defs>
    <style type='text/css'>
      @font-face { font-family: Unimono; src: url('https://asciipunks.com/unifont.ttf'); }
    </style>
  </defs>
  <rect width='460' height='460' style='fill:black;stroke-width:0' />
  <text fill='white' style='white-space: pre; word-wrap:normal; font-family: Unimono, monospace; font-size: 2em;'>${token
    .split('\n')
    .map(
      (line) =>
        `<tspan x='124.435' dy='1.15em' xml:space='preserve'>${line}</tspan>`
    )
    .join('')}</text>
</svg>`
}

app.get('/punks/:id', async (req, res) => {
  const id = req.params.id
  res.send({
    image_data: await renderSvg(id),
    description: '',
    name: `ASCII Punk #${id}`,
    attributes: [],
    background_color: '000000',
  })
})

app.get('/punks/:id/preview', async (req, res) => {
  const id = req.params.id
  res.type('svg').send(await renderSvg(id))
})

const port = process.env.PORT || 3000

app.listen(port, () => {
  console.log(`Listening on port ${port}...`)
})
