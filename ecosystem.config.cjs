require("dotenv").config();

module.exports = {
  apps: [
    {
      name: "clikit-backend",
      script: "./index.js",
      env_file: ".env",
    },
  ],
};
