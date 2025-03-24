import express from 'express';
import { connectDB } from './configs/connection.js';
import adminRoutes from './routes/admin.js'
import customerRouter from "./routes/customer.js";
import cors from "cors";
import { handleWebhookOrder } from "./controllers/order.controller.js";
import { app, server } from "./socket/index.js";

const port = process.env.PORT || 8080;

// app.use(
//     cors({
//         origin: process.env.FRONT_END_URL,
//         credentials: true,
//     })
// );

//mobile
app.use(
    cors({
        origin: [process.env.FRONT_END_URL, "http://localhost:8081"],
        credentials: true,
    })
);

app.post(
    "/webhook-stripe",
    express.raw({ type: "application/json" }),
    handleWebhookOrder
);

app.use(express.json());

app.use("/api/v1", customerRouter);
app.use('/api/v1/admin', adminRoutes);

// app.listen(port, async () => {
//     await connectDB()
//     console.log(`Example app listening on port ${port}`);
// });
