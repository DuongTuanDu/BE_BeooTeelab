// Import mongoose bằng cú pháp ES Module
import mongoose from 'mongoose';
import 'dotenv/config'

/**
 * Hàm kết nối tới MongoDB
 */
export const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Kết nối MongoDB thành công!');
  } catch (error) {
    console.error('❌ Kết nối MongoDB thất bại:', error);
    process.exit(1); // Thoát ứng dụng nếu kết nối thất bại
  }
};
