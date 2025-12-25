import Router from "express";
import { addProduct, handleAllProducts, removeProduct, singleProduct } from "../controllers/product.controller.js";
import upload from "../middlewares/multer.js";
import { isAdmin } from "../middlewares/admin.middleware.js";

const router = Router();

router.route("/add").post(
    isAdmin,
    upload.fields([
        { name: "image1", maxCount: 1 },
        { name: "image2", maxCount: 1 },
        { name: "image3", maxCount: 1 },
        { name: "image4", maxCount: 1 },
    ]),
    addProduct
);

router.route("/all").get(handleAllProducts);
router.route("/:id").get(isAdmin, singleProduct);
router.route("/:id").delete(isAdmin, removeProduct);


export default router;
