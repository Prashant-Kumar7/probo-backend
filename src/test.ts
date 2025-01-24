import express , { Response , Request} from "express"


const app = express()


app.get("",(req : Request, res : Response)=>{
    res.json("hi from test server running on port 8080")
})

app.listen(8080, ()=>{
    console.log("server is runing on portr 8080")
})