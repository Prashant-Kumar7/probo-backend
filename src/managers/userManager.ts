import { WebSocket } from "ws";


const clients = new Map()

interface USERS_OBJECT {
    [key : string] : WebSocket[]
}

// const userObj : USERS_OBJECT = {
//     "itemId" : [
//         "socket1,
//         "socket2"
//     ]
// }


interface Submission {
    key: string;
    element: string;
} 

export class UserManagers {

    private USERS_OBJECT : USERS_OBJECT 

    constructor (){
        this.USERS_OBJECT = {}
    }

    addUser(socket : WebSocket){
        this.addHandler(socket)
    }

    redisQueue(submission : Submission | null){
        if(submission){
            // console.log(submission)
            const element = submission.element
            console.log(element)
            const orderBook = JSON.parse(element.toString())
            console.log(orderBook)
            const obj = Object.keys(orderBook)
            console.log(obj)
            const stockSymbol = orderBook.Symbol
            const stock = orderBook.stock
            console.log("this is the key : " , stockSymbol)
            console.log("this is the stock : " , stock)

            
            if(this.USERS_OBJECT[stockSymbol]){
            const socketArray = this.USERS_OBJECT[stockSymbol]


            console.log(socketArray)
            socketArray.map((socket : WebSocket)=>{
                console.log("inside loop")
                socket.send(JSON.stringify({[stockSymbol] : stock}))
            })

            }

        }
    }

    private addHandler(socket : WebSocket){
        socket.on("message", (data)=>{
            const message = JSON.parse(data.toString())
            const itemId = message.itemId
            if(message.method === "subscribe"){
                
                if(this.USERS_OBJECT[itemId]){
                    this.USERS_OBJECT = {
                        ...this.USERS_OBJECT,
                        [itemId] : [
                            ...this.USERS_OBJECT[itemId],
                            socket
                        ]
                    }
                } else {
                    this.USERS_OBJECT = {
                        ...this.USERS_OBJECT,
                        [itemId] : [
                            socket
                        ]
                    }
                }

                socket.send(JSON.stringify(`you are subscribed to ${itemId}`))

                // const metadata = { itemId }

                // clients.set(socket , metadata)
                

            }
            if(message.method === "unsubscribe"){
                if(this.USERS_OBJECT[itemId]){
                    this.USERS_OBJECT[itemId] = this.USERS_OBJECT[itemId].filter((ws)=>{
                        return ws != socket
                    })
                    if(this.USERS_OBJECT[itemId].length === 0){
                        delete this.USERS_OBJECT[itemId]
                    }
                } else {
                    console.log("item doesnot exists")
                }

                // clients.delete(socket)


            }

        })
    }
}


