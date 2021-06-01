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

const namesContractAddress = process.env.NAMES_CONTRACT_ADDRESS
const namesContract = new web3.eth.Contract(
  require('./lib/AsciiPunksNames.json'),
  namesContractAddress
)

const renderSvg = async (id, modern = false) => {
  const token = htmlSafe(await contract.methods.draw(id).call())

  return `<svg xmlns='http://www.w3.org/2000/svg' width='460' height='460'>
  <defs>
    <style type='text/css'>
      @font-face { font-family: Unifont; src: url('https://asciipunks.com/unifont.ttf'); }
    </style>
  </defs>
  <rect width='460' height='460' style='fill:black;stroke-width:0' />
  <text fill='white' style='white-space: pre; word-wrap:normal; font-family: ${
    modern ? '"REXPaint 10x10"' : 'Unifont'
  }, monospace; font-size: 2.65em;' y="30">${token
    .split('\n')
    .map(
      (line) =>
        `<tspan x='${
          modern ? '40' : '134.435'
        }' dy='1em' xml:space='preserve'>${line}</tspan>`
    )
    .join('')}</text>
</svg>`
}

app.get('/punks/:id/rendered.png', async (req, res) => {
  const { id } = req.params
  const { modern } = req.query

  const tokenSvg = await renderSvg(id, modern)

  try {
    const png = await sharp(Buffer.from(tokenSvg), { density: 300 })
      .png()
      .toBuffer()
    res.type('png').send(png)
  } catch (e) {
    console.error('ERROR')
    console.error(e)
  }
})

const punks = []

;(async () => {
  const TOKEN_LIMIT = await contract.methods.totalSupply().call()

  console.log('Loading punks...')
  for (let i = 1; i <= TOKEN_LIMIT; i++) {
    const punk = await contract.methods.draw(i).call()
    punks.push(punk)
  }

  console.log(`${punks.length} punks loaded!`)
  console.log(punks[0])

  console.log('rarity:')

  const hatOccurrences = {}
  const eyesOccurrences = {}
  const noseOccurrences = {}
  const mouthOccurrences = {}

  for (let i = 0; i < punks.length; i++) {
    const punk = punks[i].split('\n')
    const currentHat = punk.slice(0, 3).join('\n')
    hatOccurrences[currentHat] = (hatOccurrences[currentHat] || 0) + 1

    const currentEyes = punk[4]
    eyesOccurrences[currentEyes] = (eyesOccurrences[currentEyes] || 0) + 1

    const currentNose = punk[5]
    noseOccurrences[currentNose] = (noseOccurrences[currentNose] || 0) + 1

    const currentMouth = punk.slice(6, 8).join('\n')
    mouthOccurrences[currentMouth] = (mouthOccurrences[currentMouth] || 0) + 1
  }

  console.log(hatOccurrences)
  console.log(eyesOccurrences)
  console.log(noseOccurrences)
  console.log(mouthOccurrences)
})

app.get('/punks/:id', async (req, res) => {
  const id = req.params.id
  const name = await namesContract.methods.getName(parseInt(id)).call()
  const TOKEN_LIMIT = await contract.methods.totalSupply().call()

  res.send({
    image: `https://api.asciipunks.com/punks/${id}/rendered.png`,
    description: '',
    name: name?.length ? `ASCII Punk #${id}: ${name}` : `ASCII Punk #${id}`,
    attributes: [
      {
        value: 'hat'
      }
    ],
    background_color: '000000',
  })
})

app.get('/punks/:id/preview', async (req, res) => {
  const id = req.params.id
  const { modern } = req.query
  const svg = await renderSvg(id, modern)

  try {
    const png = await sharp(Buffer.from(svg), { density: 300 })
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
        bottom: 100,
        left: 200,
        right: 200,
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
  const ownedTokens = Math.min(
    7,
    await contract.methods.balanceOf(address).call()
  )

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
        arr.length === 7 ? 0 : (160 * (7 - (arr.length % 7))) / 2
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
    const png = await sharp(Buffer.from(tokensSvg), { density: 300 })
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
