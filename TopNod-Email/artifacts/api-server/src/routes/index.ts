import { Router, type IRouter } from "express";
import healthRouter from "./health";
import inboxRouter from "./inbox";
import openinboxRouter from "./openinbox";
import tempmailRouter from "./tempmail";

const router: IRouter = Router();

router.use(healthRouter);
router.use(inboxRouter);
router.use(openinboxRouter);
router.use(tempmailRouter);

export default router;
