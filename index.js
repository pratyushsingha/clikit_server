process.loadEnvFile();
import { app } from "./app.js";
import connectDB from "./src/db/index.js";


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
