import express from "express"
import dexStratController from "./dexStratController"

const app = express()
app.use(express.json())

// Mount DexStrat routes
app.use("/dexstrat", dexStratController)

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`DexStrat API listening on port ${PORT}`)
})