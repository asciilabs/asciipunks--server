require('dotenv').config()
const express = require('express')
const app = express()
const path = require('path')
const fs = require('fs')
const sharp = require('sharp')

const Web3 = require('web3')

const htmlSafe = require('./lib/htmlSafe')

const web3 = new Web3(
  new Web3.providers.HttpProvider(process.env.ETH_HTTP_PROVIDER_URL)
)

const contractAddress = process.env.CONTRACT_ADDRESS
const contract = new web3.eth.Contract(
  require('./lib/AsciiPunks.json'),
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
  const svg = await renderSvg(id)

  try {
    const png = await sharp(Buffer.from(svg))
      .png()
      .resize({
        background: 'black',
        fit: sharp.fit.contain,
        position: 'center',
        width: 920,
        height: 460,
      })
      .extend({
        top: 100,
        bottom: 0,
        left: 100,
        right: 100,
        background: 'black',
      })
      .toBuffer()
    res.type('png').send(png)
  } catch (e) {
    console.error('ERROR')
    console.error(e)
  }
})

const walletShowcasePreview = async (address) => {
  const ownedTokens = Math.min(7, await contract.methods.balanceOf(address).call())

  const initialArray = []
  for (let i = 0; i < ownedTokens; i++) initialArray.push(0)

  const tokenIds = await Promise.all(
    initialArray.map(
      async (_, i) =>
        await contract.methods.tokenOfOwnerByIndex(address, i).call()
    )
  )

  const tokens = await Promise.all(
    tokenIds.map(async (id) => htmlSafe(await contract.methods.draw(id).call()))
  )

  return `<svg xmlns='http://www.w3.org/2000/svg' width='1120' height='460'>
  <defs>
    <style type='text/css'>
      @font-face { font-family: Unimono; src: url('https://asciipunks.com/unifont.ttf'); }
    </style>
  </defs>
  <rect width='1120' height='460' style='fill:black;stroke-width:0' />
  ${tokens.map(
    (token, i, arr) =>
      `<text dx="${
        arr.length === 7 ? 0 : 160 * ((7 - (arr.length % 7))) / 2
      }" fill='white' style='white-space: pre; word-wrap:normal; font-family: Unimono, monospace; font-size: 2em;'>${token
        .split('\n')
        .map(
          (line) =>
            `<tspan x='${
              i * 160
            }' dy='1.15em' xml:space='preserve'>${line}</tspan>`
        )
        .join('')}</text>`
  )}
</svg>`
}

app.get('/mypunks/:address/preview', async (req, res) => {
  const address = req.params.address
  const tokensSvg = await walletShowcasePreview(address)

  try {
    const png = await sharp(Buffer.from(tokensSvg))
      .png()
      .resize({
        background: 'black',
        fit: sharp.fit.contain,
        position: 'center',
        width: 1120,
        height: 460,
      })
      .extend({
        top: 100,
        bottom: 0,
        left: 0,
        right: 0,
        background: 'black',
      })
      .toBuffer()
    res.type('png').send(png)
  } catch (e) {
    console.error('ERROR')
    console.error(e)
  }
})

const port = process.env.PORT || 3000

app.listen(port, () => {
  console.log(`Listening on port ${port}...`)
})
