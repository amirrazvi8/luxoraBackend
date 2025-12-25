import { Router } from "express";
import { productQuery } from "../controllers/search.controller.js";

const router = Router();

router.route("/product-query").post(productQuery);

export default router;
