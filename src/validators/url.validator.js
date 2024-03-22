import { body } from "express-validator";

const validateUrl = () => {
  return [body("link").isURL().withMessage("invalid url")];
};

export { validateUrl };
