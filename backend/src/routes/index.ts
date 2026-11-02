import { Router } from "express";
import { authRouter } from "./auth";
import { quizRouter } from "./quiz";
import { travelRouter } from "./travel";
import { experiencesRouter } from "./experiences";
import { adminRouter } from "./admin";
import { mediaRouter } from "./media";
import { socialRouter } from "./social";

export const apiRouter = Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/quiz", quizRouter);
apiRouter.use("/travel", travelRouter);
apiRouter.use("/experiences", experiencesRouter);
apiRouter.use("/admin", adminRouter);
apiRouter.use("/media", mediaRouter);
apiRouter.use("/social", socialRouter);
