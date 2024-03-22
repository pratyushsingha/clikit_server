import mongoose from "mongoose";
import { DB_NAME } from "../../constraints.js";

const connectDB = async () => {
  try {
    const connectionInstance = await mongoose.connect(
      `${process.env.MONGODB_URI}/${DB_NAME}`
    );
    console.log(
      `mongodb connected!! DB Host:${connectionInstance.connection.host}`
    );
  } catch (err) {
    console.log("MONGODB connection FAILED ", err);
    process.exit(1);
  }
};

export default connectDB;
