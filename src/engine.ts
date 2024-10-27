import { createClient } from "redis"

const client = createClient()


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

async function runEngine(restart : boolean) {
    try {
        
        await client.connect()

        recovery()

        while(true){
            try {
                const events = await client.brPop("events", 0);
                console.log(events)
                if(events){

                    const element = events.element

                    const data = JSON.parse(element)
                    console.log(data)

                    

                    if(data.endPoint === "/order/sell"){
                        // orderSell(data)
                        const body = await data.body
                        const stockType : "yes" | "no" = body.stockType
                        try {
                        console.log("inside sell")
                        if(STOCK_BALANCES[body.userId][body.stockSymbol][stockType].quantity >= body.quantity){
                            console.log("inside condition")
                        
                            LockStock(body.userId , body.quantity , stockType , body.stockSymbol);
                            AddToOrderBook(body.stockSymbol , body.quantity , body.price , body.userId , stockType , data.eventId)
                            console.log("after functions call")
                        
                            const res = {
                                status : true
                            }
                            console.log("before push")
                            console.log(data.eventId , res)
                            await client.lPush(data.eventId, JSON.stringify(res));
                            console.log("after push")
                            return
                        
                        } else {
                            // `you don't have ${body.quantity} stocks to sell`
                            const res = {
                                status : false,
                                error : `you don't have ${body.quantity} stocks to sell`
                            }
                            await client.rPush(data.eventId, JSON.stringify(res));
                            // return
                        
                        }

                        } catch (error) {
                            const res = {
                                status : false,
                                error : error
                            }
                            await client.lPush(data.eventId, JSON.stringify(res));
                            // return
                        }
                        continue
                    } else if (data.endPoint === "/order/buy"){
                        // orderBuy(data)
                        const body = await data.body
                        const stockType : "yes" | "no" = body.stockType                     

                        if(body.quantity*body.price <= INR_BALANCES[body.userId].balance){
                            LockINR(body.userId , body.quantity*body.price)
                            await reqBuy(body.stockSymbol , body.quantity , body.price , body.userId , stockType)
                        
                            const res = {
                                status : true
                            }
                        
                            await client.lPush(data.eventId, JSON.stringify(res));
                        
                        } else {
                            const res = {
                                status : false,
                                error : `not enough balance`
                            }
                            await client.lPush(data.eventId, JSON.stringify(res));
                            
                        }
                        continue
                    } else if(data.endPoint === "/symbol/create/:stockSymbol"){
                        // createSymbol(data)
                        const body = await data.body
                        const stockSymbol = body.stockSymbol
                        if(ORDERBOOK[stockSymbol]){
                            const res = {
                                status : false,
                                error : `stockSymbol ${stockSymbol} Already Exists`
                            }
                    
                            await client.lPush(data.eventId, JSON.stringify(res));
                    
                            // return 
                        }
                        ORDERBOOK[stockSymbol]={
                            "yes": {
                                    
                                },
                            "no": {
                                 
                            }
                        }
                        const res = {
                            status : true
                        }
                        await client.lPush(data.eventId, JSON.stringify(res));
                        continue
                    } else if(data.endPoint === "/onramp/inr"){
                        console.log("inside onramp")
                        // onrampInr(data)
                        const body = await data.body
                        const currentData = INR_BALANCES[body.userId]
                        // console.log("inside func")
                        if(currentData){
                            console.log("inside condition")
                            INR_BALANCES[body.userId] = {
                                ...currentData,
                                balance : body.amount + currentData.balance
                            }

                            const res = {
                                status : true,
                            }
                        
                            const message = JSON.stringify(res)
                            console.log("before push")
                        
                            await client.lPush(data.eventId , JSON.stringify(message))

                            console.log("after push")
                            return

                        } else {

                            const res = {
                                status : false,
                                error : `user doesnot exists by userId : ${body.userId}`
                            }
                            await client.lPush(data.eventId, JSON.stringify(res));
                        }
                        continue
                    } else if(data.endPoint === "/user/create/:userId"){
                        // createUser(data)
                        const body = await data.body
                        const userId = body
                    
                        INR_BALANCES[userId] = {
                            balance : 0,
                            locked : 0
                        }
                    
                        const res = {
                            status : true
                        }
                        console.log("before push")
                        await client.lPush(data.eventId, JSON.stringify(res));
                        console.log("after push")
                        continue

                    } else if(data.endPoint === "/orderbook"){
                        // getOrderbook(data)
                        const res = ORDERBOOK
                        await client.lPush(data.eventId, JSON.stringify(res));
                        continue

                    } else if(data.endPoint === "/balances/inr"){
                        getBalances(data)
                        continue

                    } else if(data.endPoint === "/balance/inr/:userId"){
                        // getUserBalances(data)
                        const userId = data.body

                        const res = INR_BALANCES[userId]
                        console.log("before pushing")
                        await client.lPush(data.eventId , JSON.stringify(res))
                        console.log("after pushing")
                        continue
                    } else if(data.endPoint === "/balances/stock"){
                        getStocks(data)
                        continue

                    } else if (data.endPoint === "/balance/stock/:userId"){
                        getUserStocks(data)
                    }
                }
            } catch (error) {
                console.error("Error processing queue:", error);
            }
        }
    } catch (error) {
        console.error("Failed to connect to Redis", error);
        // runEngine(true)
    }
}

async function getUserStocks(data : any){
    const userId = data.body
    await client.lPush(data.eventId , JSON.stringify(STOCK_BALANCES[userId]))

    return
}

async function onrampInr(data : any) {
    const body = await data.body
    const currentData = INR_BALANCES[body.userId]
    console.log("inside func")
    if(currentData){
        console.log("inside condition")
        INR_BALANCES[body.userId] = {
            ...currentData,
            balance : body.amount + currentData.balance
        }
        
        const res = {
            status : true,
        }

        const message = JSON.stringify(res)
        console.log("before push")

        await client.publish(data.eventId , JSON.stringify(message))
        
        console.log("after push")
        return
        
    } else {
        
        const res = {
            status : false,
            error : `user doesnot exists by userId : ${body.userId}`
        }
        await client.lPush(data.eventId, JSON.stringify(res));
        return 
    }
}

async function recovery(){
    const events = await client.lRange("eventsRecovery", 0, -1)

    if(events.length > 0)

    events.forEach(async(event)=>{


        const data = await JSON.parse(event)
        console.log(data)

        if(data.endPoint === "/order/sell"){
            orderSell(data)
            return
        } 
        if (data.endPoint === "/order/buy"){
            orderBuy(data)
            return
        }
        if(data.endPoint === "/symbol/create/:stockSymbol"){
            createSymbol(data)
            return
        }
        if(data.endpoint === "/onramp/inr"){
            onrampInr(data)
            return
        }
        if(data.endPoint === "/user/create/:userId"){
            createUser(data)
            return
        }
        if(data.endPoint === "/orderbook"){
            getOrderbook(data)
            return
        }
    })
}

async function getStocks(data : any){
    await client.lPush(data.eventId , JSON.stringify(STOCK_BALANCES))
}

async function getUserBalances(data : any) {
    const userId = data.body

    const res = INR_BALANCES[userId]
    console.log("before pushing")
    await client.lPush(data.eventId , JSON.stringify(res))
    console.log("after pushing")

} 

async function getOrderbook(data : any) {
    const res = ORDERBOOK
    await client.lPush(data.eventId, JSON.stringify(res));
}

async function createUser(data : any) {
    const body = await data.body
    const userId = body

    INR_BALANCES[userId] = {
        balance : 0,
        locked : 0
    }

    const res = {
        status : true
    }

    await client.lPush(data.eventId, JSON.stringify(res));
    
}



async function createSymbol(data : any) {
    const body = await data.body
    const stockSymbol = body.stockSymbol
    if(ORDERBOOK[stockSymbol]){
        const res = {
            status : false,
            error : `stockSymbol ${stockSymbol} Already Exists`
        }

        await client.lPush(data.eventId, JSON.stringify(res));

        return 
    }
    ORDERBOOK[stockSymbol]={
        "yes": {
                
            },
        "no": {
             
        }
    }
    const res = {
        status : true
    }
    await client.lPush(data.eventId, JSON.stringify(res));

}

async function getBalances(data : any) {

    await client.lPush(data.eventId , JSON.stringify(INR_BALANCES))
}

async function orderSell(data : any) {
    const body = await data.body
    const stockType : "yes" | "no" = body.stockType
    try {
    console.log("inside sell")
    if(STOCK_BALANCES[body.userId][body.stockSymbol][stockType].quantity >= body.quantity){
        console.log("inside condition")

        LockStock(body.userId , body.quantity , stockType , body.stockSymbol);
        AddToOrderBook(body.stockSymbol , body.quantity , body.price , body.userId , stockType , data.eventId)
        console.log("after functions call")

        const res = {
            status : true
        }
        console.log("before push")
        console.log(data.eventId , res)
        await client.lPush(data.eventId, JSON.stringify(res));
        console.log("after push")
        return

    } else {
        // `you don't have ${body.quantity} stocks to sell`
        const res = {
            status : false,
            error : `you don't have ${body.quantity} stocks to sell`
        }
        await client.rPush(data.eventId, JSON.stringify(res));
        return

    }
    
    } catch (error) {
        const res = {
            status : false,
            error : error
        }
        await client.lPush(data.eventId, JSON.stringify(res));
        return
    }
}


async function orderBuy(data : any) {
    const body = await data.body
    const stockType : "yes" | "no" = body.stockType

    
    if(body.quantity*body.price <= INR_BALANCES[body.userId].balance){
        LockINR(body.userId , body.quantity*body.price)
        await reqBuy(body.stockSymbol , body.quantity , body.price , body.userId , stockType)

        const res = {
            status : true
        }

        await client.lPush(data.eventId, JSON.stringify(res));

    } else {
        const res = {
            status : false,
            error : `not enough balance`
        }
        await client.lPush(data.eventId, JSON.stringify(res));
        return
    }
}


async function AddToOrderBook ( 
    stockSymbol : String | number |  any, 
    quantity : number , 
    price : number , 
    userId : string, 
    stockType : "yes" | "no",
    eventId? : string
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

        // await client.lPush("stocks", JSON.stringify({stock : ORDERBOOK[stockSymbol] , Symbol : stockSymbol}));
        await client.publish("stocks" , JSON.stringify({stock : ORDERBOOK[stockSymbol] , Symbol : stockSymbol}))

        console.log("orderbook changed and pushed to redis")
    } else {
        ORDERBOOK[stockSymbol][stockType][price] = { 
             total : quantity,
             orders : {
                [userId] : quantity
             }
        }

        // await client.lPush( "stocks", JSON.stringify({stock : ORDERBOOK[stockSymbol] , Symbol : stockSymbol}));
        await client.publish("stocks" , JSON.stringify({stock : ORDERBOOK[stockSymbol] , Symbol : stockSymbol}))

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

runEngine(false)