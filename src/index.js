import express from 'express';
import { connectDB } from './configs/connection.js';
import adminRoutes from './routes/admin.js'

const app = express();
const port = process.env.PORT || 8080;

app.use('/admin/api/v1', adminRoutes);

app.listen(port, async () => {
    await connectDB()
    console.log(`Example app listening on port ${port}`);
});
