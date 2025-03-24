import express from "express";
import { Server } from "socket.io";
import dotenv from "dotenv";
dotenv.config({});
import http from "http";
import {
    addConnection,
    removeConnection,
    getOnlineUsers,
} from "./connection.js";
import { connectDB } from "../configs/connection.js";

const PORT = process.env.PORT || 8080;
const app = express();

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: [process.env.FRONT_END_URL, "http://localhost:8081"],
        credentials: true,
    },
});

//Connect socket
io.on("connection", (client) => {
    const userId = client.handshake.query.userId;
    const userType = client.handshake.query.userType;

    if (!userId || !userType || !["admin", "customer"].includes(userType)) {
        client.disconnect();
        return;
    }

    client.userId = userId;
    client.userType = userType;

    console.log(`User connected: ${client.userId} (${client.userType})`);
    const onlineUsers = addConnection(client);

    io.emit("userOnlines", onlineUsers);
    client.join(client.userType);

    console.log("All users connected:", getOnlineUsers());

    //Disconnect socket
    client.on("disconnect", () => {
        console.log(`User disconnected: ${client.userId}`);

        const remainingUsers = removeConnection(client);
        io.emit("userOnlines", remainingUsers);

        client.leave(client.userType);
    });
});

server.listen(PORT, async () => {
    await connectDB()
    console.log(`Example app listening on port ${PORT}`);
});

export { io, app, server };