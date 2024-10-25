import express from "express"
import { WebSocketServer, WebSocket } from "ws";
import { UserManagers } from "./managers/userManager";
import { createClient } from "redis";

const app = express()

const client = createClient()

const httpServer = app.listen(8080)

const wss = new WebSocketServer({ server: httpServer });

export const users = new UserManagers()

StartQueue()

wss.on("connection" , async function connection(ws : WebSocket){
    users.addUser(ws)
})


async function StartQueue(){
    try {
        await client.connect();
        console.log("ws connected to Redis.");

        // Main loop
        while (true) {
            try {
                const submission = await client.brPop("stocks", 0);

                users.redisQueue(submission)
            } catch (error) {
                console.error("Error processing submission:", error);
            }
        }
    } catch (error) {
        console.error("Failed to connect to Redis", error);
    }
}