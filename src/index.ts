import express, { Response , Request } from "express"
// import cors from "cors"
import { createClient } from "redis";
// import axios from "../node_modules/axios/index"
export const app = express()

const port = 3000

const client = createClient()
client.on('error', (err) => console.log('Redis Client Error', err));


interface INR_BALANCES_Type {
    [key  : string] : {
        balance : number,
        locked : number
    }
}

interface ORDERBOOK_Type {
    [key : string] : {
        [key in YesNoEnum] : {
            [key : string] : {
                "total" : number,
                orders : {
                    [key : string] : number
                }
            }
        }
    }
}

enum YesNoEnum {
    Yes = "yes",
    No = "no"
}

enum BuySellEnum {
    Buy = "buy",
    Sell = "sell"
}


interface STOCK_BALANCES_Type {
    [key : string] : {
        [key : string] : {
            [key : string] : {
                "quantity" : number,
                "locked" : number
            }
        }
    }
}

const INR_BALANCES : INR_BALANCES_Type = {
    "user1": {
       balance: 10000000,
       locked: 0
    },
    "user2": {
       balance: 1000000,
       locked: 0
    },
    "user3" : {
        balance : 1000000,
        locked : 0
    }
}



const ORDERBOOK : ORDERBOOK_Type = {
    "BTC_USDT_10_Oct_2024_9_30": {
		"yes": {
			"650": {
				"total": 10,
				"orders": {
					"user1": 10
				}
			},
			
		},
		"no": {
            "450": {
				"total": 5,
				"orders": {
					"user2" : 5
				}
			},
		}
   }
}


const STOCK_BALANCES : STOCK_BALANCES_Type = {
    user1: {
        "BTC_USDT_10_Oct_2024_9_30": {
            "yes": {
                "quantity": 0,
                "locked": 10
            },
            "no" : {
                "quantity" : 0,
                "locked" : 0
            }
        }
     },
     user2: {
         "BTC_USDT_10_Oct_2024_9_30": {
            "yes" : {
                "quantity" : 0,
                "locked" : 0
            },
            "no": {
                "quantity": 0,
                "locked": 5
            }
        }
     },
     user3 : {
        "BTC_USDT_10_Oct_2024_9_30" : {
            "yes" : {
                "quantity" : 100,
                "locked" : 0
            },
            "no" : {
                "quantity" : 50,
                "locked" : 0
            }
        }
     }
}


app.use(express.json())
// app.use(cors())

app.get("/",  (req: Request , res : Response)=>{
  
    res.json({
        msg : "hello from server"
    })
})

app.post("/user/create/:userId" , (req :Request , res : Response)=>{
    const userId = req.params.userId

    INR_BALANCES[userId] = {
        balance : 0,
        locked : 0
    }

    STOCK_BALANCES[userId] = {

    }
    

    res.json({
        process : true
    })  
})

app.post("/onramp/inr", async(req : Request , res : Response)=>{
    const body = await req.body
    
    
    const currentData = INR_BALANCES[body.userId]

    if(currentData){

        INR_BALANCES[body.userId] = {
            ...currentData,
            balance : body.amount + currentData.balance
        }
    
        res.json(
            `amount added successfully to userId : ${body.userId}`
        )
    } else {
        res.json(
            `user doesnot exists by userId : ${body.userId}`
        )
    }
})

app.post("/symbol/create/:stockSymbol" , (req : Request , res : Response)=>{
    const stockSymbol = req.params.stockSymbol
    if(ORDERBOOK[stockSymbol]){
        res.json({
            msg : `stockSymbol ${stockSymbol} Already Exists`
        })
        return
    }
    ORDERBOOK[stockSymbol]={
        "yes": {
                
            },
        "no": {
             
        }
    }
    res.json({
        msg : `stockSymbol ${stockSymbol} created successfully`
    })
})

app.post("/order/buy" , async(req : Request , res : Response)=>{
    const body = await req.body
    const stockType : "yes" | "no" = body.stockType

    
    if(body.quantity*body.price <= INR_BALANCES[body.userId].balance){
        LockINR(body.userId , body.quantity*body.price)
        reqBuy(body.stockSymbol , body.quantity , body.price , body.userId , stockType)

        res.json({
            ORDERBOOK,
            INR_BALANCES,
            STOCK_BALANCES
        })

    } else {
        res.json("not enough money")
        return
    }
    

})

app.post("/order/sell" , async (req : Request , res : Response)=>{
    const body = await req.body
    const stockType : "yes" | "no" = body.stockType
    try {
    
    if(STOCK_BALANCES[body.userId][body.stockSymbol][stockType].quantity >= body.quantity){

        LockStock(body.userId , body.quantity , stockType , body.stockSymbol);
        AddToOrderBook(body.stockSymbol , body.quantity , body.price , body.userId , stockType)
    } else {
        res.json(`you don't have ${body.quantity} stocks to sell`)
    }
    res.json({
        ORDERBOOK,
        STOCK_BALANCES
    })
    } catch (error) {
       res.json(error) 
    }
    
    
})


app.get("/orderbook" , (req : Request , res : Response)=>{
    res.json(ORDERBOOK)
})


app.get("/balances/inr" , (req :Request , res : Response)=>{
    res.json(INR_BALANCES)
})


app.get("/balance/stock/:userId" ,async(req: Request , res : Response)=>{
    const userId = req.params.userId
    res.json(STOCK_BALANCES[userId])
})



app.get("/balances/stock" , (req :Request , res : Response)=>{
    res.json(STOCK_BALANCES)
})

app.get("/balance/inr/:userId" , (req : Request , res : Response)=>{
    const userId = req.params.userId
    res.json(INR_BALANCES[userId])
})

async function startServer() {
    try {
        await client.connect();
        console.log("Connected to Redis");

        app.listen(3000, () => {
            console.log("Server is running on port 3000");
        });
    } catch (error) {
        console.error("Failed to connect to Redis", error);
    }
}

startServer()



async function AddToOrderBook ( 
    stockSymbol : String | number |  any, 
    quantity : number , 
    price : number , 
    userId : string, 
    stockType : "yes" | "no" 
){
    if(ORDERBOOK[stockSymbol][stockType][price]){
        ORDERBOOK[stockSymbol] = {
            ...ORDERBOOK[stockSymbol],
                [stockType] : {
                    ...ORDERBOOK[stockSymbol][stockType],
                    [price] : {
                        total : quantity + ORDERBOOK[stockSymbol][stockType][price].total,
                        orders : {
                            ...ORDERBOOK[stockSymbol][stockType][price].orders,
                            [userId] : quantity + (ORDERBOOK[stockSymbol][stockType][price].orders[userId] | 0)
                        }
                    }
                }
        }

        await client.lPush("stocks", JSON.stringify({stock : ORDERBOOK[stockSymbol] , Symbol : stockSymbol}));

        console.log("orderbook changed and pushed to redis")
    } else {
        ORDERBOOK[stockSymbol][stockType][price] = { 
             total : quantity,
             orders : {
                [userId] : quantity
             }
        }

        await client.lPush("stocks", JSON.stringify({stock : ORDERBOOK[stockSymbol] , Symbol : stockSymbol}));

        console.log("orderbook changed and pushed to redis")
    }
}

function LockStock (userId :string , lockingStockNo : number , stockType :string , stockSymbol :string){
    STOCK_BALANCES[userId] = {
        ...STOCK_BALANCES[userId],
        [stockSymbol] : {
            ...STOCK_BALANCES[userId][stockSymbol],
            [stockType] : {
                quantity :  (STOCK_BALANCES[userId][stockSymbol][stockType].quantity | 0) - lockingStockNo,
                locked : lockingStockNo + (STOCK_BALANCES[userId][stockSymbol][stockType].locked | 0)
            }
        }
    }
}


function LockINR (userId : string , lockingAmout : number){
    INR_BALANCES[userId].balance -= lockingAmout,
    INR_BALANCES[userId].locked += lockingAmout
}

async function reqBuy(
    stockSymbol : String | number |  any, 
    quantity : number , 
    price : number , 
    userID : string, 
    stockType : "yes" | "no"
){  

    if(!ORDERBOOK[stockSymbol][stockType][price]){
        const amountToPlaceSellOrder = 1000*quantity - price*quantity
        const sellingId = `probo_${userID}`
        if(stockType === "yes"){
            AddToOrderBook(stockSymbol , quantity , amountToPlaceSellOrder/quantity ,sellingId, "no")
        } else if(stockType === "no") {
            AddToOrderBook(stockSymbol , quantity , amountToPlaceSellOrder/quantity ,sellingId, "yes")
        }

        return
    }
    
    if(ORDERBOOK[stockSymbol][stockType][price].total >= quantity || ORDERBOOK[stockSymbol][stockType][price].total < quantity){
        const userIdArray = Object.keys(ORDERBOOK[stockSymbol][stockType][price].orders)
        var noOfStocksBought : number = 0;
        var balancedNumber : number = 0;
        userIdArray.map((userId)=>{
            

            balancedNumber = ORDERBOOK[stockSymbol][stockType][price].orders[userId] - (quantity - noOfStocksBought)
            if(balancedNumber <= 0){
                if(userId.includes("probo")){
                    mintMatchingStocks(userId , stockType , stockSymbol , price , userID , noOfStocksBought , balancedNumber)
                } else {

                    INR_BALANCES[userId].balance += ORDERBOOK[stockSymbol][stockType][price].orders[userId] * price
                    INR_BALANCES[userID].locked -=  ORDERBOOK[stockSymbol][stockType][price].orders[userId] * price
                    STOCK_BALANCES[userID][stockSymbol][stockType].quantity += ORDERBOOK[stockSymbol][stockType][price].orders[userId]
                    STOCK_BALANCES[userId][stockSymbol][stockType].locked -= ORDERBOOK[stockSymbol][stockType][price].orders[userId]
                    noOfStocksBought = noOfStocksBought + ORDERBOOK[stockSymbol][stockType][price].orders[userId]
                    delete ORDERBOOK[stockSymbol][stockType][price].orders[userId]
                }
            }

            if(balancedNumber > 0){
                if(userId.includes("probo")){
                    mintMatchingStocks(userId , stockType , stockSymbol , price , userID , noOfStocksBought , balancedNumber)
                } else {
                    INR_BALANCES[userId].balance += (ORDERBOOK[stockSymbol][stockType][price].orders[userId] - balancedNumber) * price
                    INR_BALANCES[userID].locked -=  (ORDERBOOK[stockSymbol][stockType][price].orders[userId] - balancedNumber) * price
                    STOCK_BALANCES[userID][stockSymbol][stockType].quantity += (quantity - noOfStocksBought)
                    STOCK_BALANCES[userId][stockSymbol][stockType].locked -= balancedNumber
                    noOfStocksBought = noOfStocksBought + (ORDERBOOK[stockSymbol][stockType][price].orders[userId] -balancedNumber)
                    ORDERBOOK[stockSymbol][stockType][price].orders[userId] = balancedNumber
                }
            }
        })
        if(balancedNumber < 0){
            const userIdArray = Object.keys(ORDERBOOK[stockSymbol][stockType][price].orders)
            if(userIdArray.length === 0){
                delete ORDERBOOK[stockSymbol][stockType][price]
            }
            const remainingStockQuantity = -balancedNumber;
            const amountToPlaceSellOrder = 1000*(remainingStockQuantity) - price*(remainingStockQuantity)
            const sellingId = `probo_${userID}`
            if(stockType === "yes"){
                AddToOrderBook(stockSymbol , remainingStockQuantity , amountToPlaceSellOrder/remainingStockQuantity ,sellingId, "no")
            } else if(stockType === "no") {
                AddToOrderBook(stockSymbol , remainingStockQuantity , amountToPlaceSellOrder/remainingStockQuantity ,sellingId, "yes")
            }
            await client.lPush("stocks", JSON.stringify({stock : ORDERBOOK[stockSymbol] , Symbol : stockSymbol}));
            console.log("orderbook changed and pushed to redis")
            return

        }
        ORDERBOOK[stockSymbol][stockType][price].total -=  quantity
        if(ORDERBOOK[stockSymbol][stockType][price].total === 0){
            delete ORDERBOOK[stockSymbol][stockType][price]
        }

            await client.lPush("stocks", JSON.stringify({stock : ORDERBOOK[stockSymbol] , Symbol : stockSymbol}));
        console.log("orderbook changed and pushed to redis")

        return
    }

    
}



function mintMatchingStocks(
    userId :string , 
    stockType : "yes" | "no" , 
    stockSymbol : string , 
    price : number , 
    userID :string , 
    noOfStocksBought : number ,
    balancedNumber : number 
){
    const reverseOrderId = userId.slice(6 , userId.length + 1)
    if(stockType === "yes"){
        INR_BALANCES[reverseOrderId].locked -= 1000*ORDERBOOK[stockSymbol][stockType][price].orders[userId] - ORDERBOOK[stockSymbol][stockType][price].orders[userId] * price
        INR_BALANCES[userID].locked -=  ORDERBOOK[stockSymbol][stockType][price].orders[userId] * price
        STOCK_BALANCES[userID][stockSymbol][stockType].quantity += ORDERBOOK[stockSymbol][stockType][price].orders[userId]
        STOCK_BALANCES[reverseOrderId][stockSymbol]["no"].quantity += ORDERBOOK[stockSymbol][stockType][price].orders[userId]
        noOfStocksBought = noOfStocksBought + ORDERBOOK[stockSymbol][stockType][price].orders[userId]
        if(balancedNumber <= 0){
            delete ORDERBOOK[stockSymbol][stockType][price].orders[userId]
        } else if(balancedNumber > 0) {
            ORDERBOOK[stockSymbol][stockType][price].orders[userId] = balancedNumber
        }
    } else if(stockType === "no"){
        INR_BALANCES[reverseOrderId].locked -= 1000*ORDERBOOK[stockSymbol][stockType][price].orders[userId] - ORDERBOOK[stockSymbol][stockType][price].orders[userId] * price
        INR_BALANCES[userID].locked -=  ORDERBOOK[stockSymbol][stockType][price].orders[userId] * price
        STOCK_BALANCES[userID][stockSymbol][stockType].quantity += ORDERBOOK[stockSymbol][stockType][price].orders[userId]
        STOCK_BALANCES[reverseOrderId][stockSymbol]["yes"].quantity += ORDERBOOK[stockSymbol][stockType][price].orders[userId]
        noOfStocksBought = noOfStocksBought + ORDERBOOK[stockSymbol][stockType][price].orders[userId]
        if(balancedNumber <= 0){
            delete ORDERBOOK[stockSymbol][stockType][price].orders[userId]
        } else if(balancedNumber > 0) {
            ORDERBOOK[stockSymbol][stockType][price].orders[userId] = balancedNumber
        }
    }
}