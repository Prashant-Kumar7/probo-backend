import express , { Response , Request} from "express"
import { createClient } from "redis"
import crypto from "crypto"

const app = express()

const port = 3000

const client = createClient()

app.use(express.json())

redisClient()

async function redisClient(){
    await client.connect();
} 

app.get("/orderbook" , async(req : Request , res : Response)=>{
    const eventId = uuidv4()
    const event = {
        method : "GET",
        body : "",
        endPoint : "/orderbook",
        eventId : eventId
    }

    await client.rPush("eventsRecovery", JSON.stringify(event));
    await client.lPush("events", JSON.stringify(event));
    const item = await client.brPop(eventId, 0);
    if(item){
        const response = JSON.parse(item.element)
        res.json(response)
    }

})


app.get("/balances/inr" , async(req :Request , res : Response)=>{
    // res.json(INR_BALANCES)
    const eventId = uuidv4()
    const event = {
        method : "GET",
        body : "",
        endPoint : "/balances/inr",
        eventId : eventId
    }
    await client.rPush("eventsRecovery", JSON.stringify(event));
    await client.lPush("events", JSON.stringify(event));
    // const items = await client.lRange(eventId, 0, -1)
    const item = await client.brPop(eventId, 0);
    if(item){
        const response = JSON.parse(item.element)
        res.json(response)
    }
})


app.get("/balance/stock/:userId" ,async(req: Request , res : Response)=>{
    const userId = req.params.userId
    // res.json(STOCK_BALANCES[userId])
    const eventId = uuidv4()
    const event = {
        method : "GET",
        body : userId,
        endPoint : "/balance/stock/:userId",
        eventId : eventId
    }
    await client.rPush("eventsRecovery", JSON.stringify(event));
    await client.lPush("events", JSON.stringify(event));
    // const items = await client.lRange(eventId, 0, -1)
    const item = await client.brPop(eventId, 0);
    if(item){
        const response = JSON.parse(item.element)
        res.json(response)
    }
})



app.get("/balances/stock" , async(req :Request , res : Response)=>{
    // res.json(STOCK_BALANCES)
    const eventId = uuidv4()
    const event = {
        method : "GET",
        body : "",
        endPoint : "/balances/stock",
        eventId : eventId
    }
    await client.rPush("eventsRecovery", JSON.stringify(event));
    await client.lPush("events", JSON.stringify(event));
    // const items = await client.lRange(eventId, 0, -1)
    const item = await client.brPop(eventId, 0);
    if(item){
        const response = JSON.parse(item.element)
        res.json(response)
    }
})

app.get("/balance/inr/:userId" , async(req : Request , res : Response)=>{
    const userId = req.params.userId
    // res.json(INR_BALANCES[userId])
    const eventId = uuidv4()
    const event = {
        method : "GET",
        body : userId,
        endPoint : "/balance/inr/:userId",
        eventId : eventId
    }

    await client.rPush("eventsRecovery", JSON.stringify(event));
    await client.lPush("events", JSON.stringify(event));
    const items = await client.lRange(eventId, 0, -1)
    const item = await client.brPop(eventId, 5);
    if(item){
        const response = JSON.parse(item.element)
        res.json(response)
    }
})

app.post("/user/create/:userId" , async(req :Request , res : Response)=>{
    const userId = req.params.userId

    const eventId = uuidv4()
    const event = {
        method : "POST",
        body : userId,
        endPoint : "/user/create/:userId",
        eventId : eventId
    }

    await client.rPush("eventsRecovery", JSON.stringify(event));
    await client.lPush("events", JSON.stringify(event));
    const items = await client.lRange(eventId, 0, -1)
    const item = await client.brPop(eventId, 0);
    if(item){
        const response = JSON.parse(item.element)
        res.json(response)
    }

})

app.post("/onramp/inr", async(req : Request , res : Response)=>{
    const body = await req.body
    
    const eventId = uuidv4()
    const event = {
        method : "POST",
        body : body,
        endPoint : "/onramp/inr",
        eventId : eventId
    }

    await client.rPush("eventsRecovery", JSON.stringify(event));
    await client.lPush("events", JSON.stringify(event));
    // const items = await client.lRange(eventId, 0, -1)
    const item = await client.brPop(eventId, 0);

    if(item){
        const element = await JSON.parse(item.element)
        res.json(JSON.parse(element))
    }

    // const resultPromise = new Promise((resolve, reject) => {
    //     client.subscribe(eventId , (message)=>{
    //         resolve(message)
    //     })
        
    //     setTimeout(async()=>{
    //         reject(new Error("Request timed out"))
    //     } , 5000)
    // });
    
    // resultPromise.then((result)=>{
    //     res.json(result)
    // }).catch((err)=>{
    //     res.json(err)
    // })

    // setTimeout(async()=>{
    //     console.log("inside timeout")
    //     await client.subscribe(eventId , (message)=>{
    //                 // resolve(message)
    //         res.json(message)
    //     })
    // },8000)

    
    
})


app.post("/symbol/create/:stockSymbol" ,async (req : Request , res : Response)=>{
    const stockSymbol = req.params.stockSymbol
    
    const eventId = uuidv4()
    const event = {
        method : "POST",
        body : stockSymbol,
        endPoint : "/symbol/create/:stockSymbol",
        eventId : eventId
    }
    

    await client.rPush("eventsRecovery", JSON.stringify(event));
    await client.lPush("events", JSON.stringify(event));
    // const items = await client.lRange(eventId, 0, -1)
    const item = await client.brPop(eventId, 0);
    if(item){
        const response = JSON.parse(item.element)
        res.json(response)
    }
})


app.post("/order/sell" , async(req : Request , res: Response)=>{

    const body = await req.body

    const eventId = uuidv4()
    const event = {
        method : "POST",
        body : body,
        endPoint : "/order/sell",
        eventId : eventId
    }
    

    await client.rPush("eventsRecovery", JSON.stringify(event));
    await client.lPush("events", JSON.stringify(event));
    // const items = await client.lRange(eventId, 0, -1)
    console.log(eventId)
    const item = await client.brPop(eventId, 0);
    console.log(item)
    if(item){
        const response = JSON.parse(item.element)
        res.json(response)
    }
})


app.post("/order/buy" , async(req : Request , res: Response)=>{
    const body = await req.body

    const eventId = uuidv4()
    const event = {
        method : "POST",
        body : body,
        endPoint : "/order/buy",
        eventId : eventId
    }

    await client.rPush("eventsRecovery", JSON.stringify(event));
    await client.lPush("events", JSON.stringify(event));
    // const items = await client.lRange(eventId, 0, -1)
    const item = await client.brPop(eventId, 0);
    if(item){
        const response = JSON.parse(item.element)
        res.json(response)
    }
})

app.listen(port , ()=>{
    console.log(`server is running on port ${port}`)
})


function uuidv4() {
    return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) =>
      (
        +c ^
        (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (+c / 4)))
      ).toString(16)
    );
}