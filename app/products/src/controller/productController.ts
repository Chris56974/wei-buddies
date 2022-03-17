import { Request, Response, NextFunction } from "express"
import { NotFoundError, BadRequestError, NotAuthorizedError } from "@weibuddies/common"
import { producer } from "../events/kafka"
import { product_db } from "../models/Product"

const ITEMS_PER_PAGE = 10

export const getProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const productId = req.query.productId
    const product = await product_db.getProduct(productId as string)
    return res.status(200).send(product)
  } catch (error) {
    next(error)
  }
}

export const getProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = req.query.page
    if (!page) throw new Error("Couldn't find the page number")
    const lowerBound = +page * ITEMS_PER_PAGE - ITEMS_PER_PAGE
    const upperBound = +page * ITEMS_PER_PAGE
    const products = await product_db.getProductsFromLowerToUpper(lowerBound.toString(), upperBound.toString());
    if (!products) throw new NotFoundError();
    return res.status(200).send(products);
  } catch (error) {
    next(error)
  }
}

export const createProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, price } = req.body
    const { userId } = req.session?.jwt
    const product = await product_db.createProduct(title, price, userId)

    producer.send({
      topic: "products",
      messages: [
        { key: "productId", value: product.id },
        { key: "userId", value: product.userId },
        { key: "title", value: product.title },
        { key: "price", value: product.price },
        { key: "version", value: product.version },
      ]
    })

    return res.status(201).send(product)
  } catch (error) {
    next(error)
  }
}

export const updateProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const productId = req.params.id
    const currentUser = req.currentUser
    if (!currentUser) throw new Error("User is not signed in")

    const product = await product_db.getProduct(productId);

    if (!product) throw new NotFoundError();
    if (product.orderId) throw new BadRequestError('[Orders] Cannot edit a reserved product');
    if (product.userId !== currentUser.id) throw new NotAuthorizedError()

    product_db.updateProduct(req.body.title, req.body.price)

    producer.send({
      topic: "products",
      messages: [
        { key: "productId", value: product.id },
        { key: "userId", value: product.userId },
        { key: "title", value: product.title },
        { key: "price", value: product.price },
        { key: "version", value: product.version },
      ]
    })

    return res.status(200).send(product);
  } catch (error) {
    next(error)
  }
}