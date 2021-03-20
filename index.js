const express = require('express')
const app = express()

app.get('/punks/:id', (req, res) => {
  const id = req.params.id
  res.send({
    image_data:
      '<svg xmlns="http://www.w3.org/2000/svg" width="350" height="350"><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="75px" fill="#fffffa">(▀̿Ĺ̯▀̿ ̿)</text></svg>',
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
