import express from "express";
import cors from "cors";
import router from "./routes/router.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { errorLogger } from "./middlewares/errorLogger.js";
import { notFoundHandler } from "./middlewares/notFoundHandler.js";

export const app = express();

app.use(cors());
app.use(express.json());
app.use(router);


app.use(notFoundHandler);
app.use(errorLogger);
app.use(errorHandler);
