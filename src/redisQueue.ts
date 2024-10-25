import { createClient } from "redis";
// import { users } from "./wss"; 

const client = createClient()

async function StartQueue(){
    try {
        await client.connect();
        console.log("connected to Redis.");

        // Main loop
        while (true) {
            try {
                const submission = await client.brPop("stocks", 0);
                console.log(submission)

                // users.redisQueue(submission)
                
                // @ts-ignore
                // await processSubmission(submission.element);
            } catch (error) {
                console.error("Error processing submission:", error);
                // Implement your error handling logic here. For example, you might want to push
                // the submission back onto the queue or log the error to a file.
            }
        }
    } catch (error) {
        console.error("Failed to connect to Redis", error);
    }
}

StartQueue()