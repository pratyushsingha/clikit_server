// supports node js 21
// process.loadEnvFile();

// for node js 20
import dotenv from "dotenv";
import { app } from "./app.js";
import connectDB from "./src/db/index.js";

dotenv.config({
  path: "./env",
});

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`server is running on port ${PORT}`);
    });
  } catch (err) {
    console.log(`error connecting to the database: ${err}`);
  }
};

connectDB()
  .then(() => {
    startServer();
  })
  .catch((err) => {
    console.log(`error connecting to database ${err}`);
    process.exit(1);
  });
