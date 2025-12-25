import { v2 as cloudinary } from "cloudinary";
import { asyncHandler } from "../utils/AsyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { Product } from "../models/product.model.js";
import mongoose from "mongoose";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { CohereEmbeddings } from "@langchain/cohere";
import { finalChain } from "../utils/Agent.js";

const cohereEmbeddings = new CohereEmbeddings({
    apiKey: process.env.COHERE_API_KEY,
    model: "embed-english-v3.0",
});

const addProduct = asyncHandler(async (req, res) => {
    try {
        const { name, description, price, category, subCategory, sizes, discount, bestseller } = req.body;

        if (!req.files || Object.keys(req.files).length === 0) {
            return res.status(400).json({ success: false, message: "No images uploaded" });
        }

        const images = ["image1", "image2", "image3", "image4"].map((key) => req.files[key]?.[0]).filter(Boolean);

        if (images.length === 0) {
            return res.status(400).json({ success: false, message: "At least one image is required" });
        }

        const imagesData = await Promise.all(
            images.map(async (img) => {
                if (!img.buffer) {
                    throw new ApiError(400, "Invalid file buffer");
                }

                const result = await uploadOnCloudinary(img.buffer, img.mimetype);

                if (!result?.secure_url) {
                    throw new ApiError(500, "Image upload failed");
                }

                return {
                    url: result.secure_url,
                    public_id: result.public_id,
                };
            })
        );

        const productDetails = `name:${product.name}, description: ${product.description}, category: ${product.category}, subCategory: ${product.subCategory}, discount: ${product.discount},price:${product.price} discountPrice: ${product.discountPrice}`;

        const embedding = await cohereEmbeddings.embedQuery(productDetails);

        const discountPrice = Math.round((price * 100 - price * discount) / 100);

        const productData = {
            name,
            description,
            price: Number(price),
            category,
            subCategory,
            discount: discount ? Number(discount) : 0,
            discountPrice: Number(discountPrice),
            sizes: JSON.parse(sizes),
            bestseller: bestseller === "true",
            image: imagesData,
            embedding: embedding,
            date: Date.now(),
        };

        const product = await Product.create(productData);

        if (!product) {
            throw new ApiError(500, "Product creation failed");
        }

        return res.status(201).json(new ApiResponse(201, product, "Product added successfully"));
    } catch (error) {
        console.error("Error adding product:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
});

const handleAllProducts = asyncHandler(async (req, res) => {
    const products = await Product.find();

    if (!products.length) {
        throw new ApiError(404, "No products found");
    }

    return res.status(200).json(new ApiResponse(200, products, "All products retrieved successfully"));
});

const removeProduct = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError(400, "Invalid product ID");
    }

    const product = await Product.findById(id);

    if (!product) {
        throw new ApiError(404, "Product not found");
    }

    await Promise.all(
        product.image.map(async (img) => {
            await cloudinary.uploader.destroy(img.public_id);
        })
    );

    await Product.findByIdAndDelete(id);

    if (!product) {
        throw new ApiError(404, "Product not found");
    }

    return res.status(200).json(new ApiResponse(200, {}, "Product removed successfully"));
});

const singleProduct = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError(400, "Invalid product ID");
    }

    const product = await Product.findById(id);

    if (!product) {
        throw new ApiError(404, "Product not found");
    }

    return res.status(200).json(new ApiResponse(200, product, "Product retrieved successfully"));
});

// const productQuery = asyncHandler(async (req, res) => {
//     try {
//         const { question, conv_history = [] } = req.body;
//         if (!question) return res.status(400).json({ error: "No question provided." });

//         try {
//             const response = await finalChain.invoke({
//                 question,
//                 conv_history: formatConvHistory(conv_history),
//             });
            

//             res.json(response);
//         } catch (error) {
//             console.log(error, "agent error");
//         }
//     } catch (error) {
//         console.log(error, "ProductQuery error");
//         res.status(500).json({ error: "Internal server error in Product_Query controller" });
//     }
// });

const formatConvHistory = (messages) => {
    return messages
        .map((msg, i) => {
            return i % 2 === 0 ? `human: ${msg}` : `ai: ${msg}`;
        })
        .join("\n");
};

// const updateProduct = asyncHandler(async (req, res) => {
//     const products = await Product.find();

//     for (const product of products) {
//         const productDetails = `name: ${product.name}, description: ${product.description}, category: ${product.category}, subCategory: ${product.subCategory}, discount: ${product.discount}%, price: ${product.price}, discountPrice: ${product.discountPrice}, objectId: ${product._id}` ;

//         const embedding = await cohereEmbeddings.embedQuery(productDetails);

//         product.text = productDetails;
//         product.embedding = embedding;

//         await product.save();
//         console.log("product updated ");
//     }

//     console.log("all updated      ok!!!!!!");
// });

// updateProduct();

export { addProduct, handleAllProducts, removeProduct, singleProduct };
