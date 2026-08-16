import { body, db, id, json, admin, user } from "./shared.mjs";
export async function handler(event) { try { const session = await user(event); if (!session) return json(401, { message: "Unauthorized" }); const database = await db(), orders = database.collection("orders");
  if (event.httpMethod === "GET") { const filter = session.role === "admin" ? {} : { userId: session.userId }; const rows = await orders.aggregate([{ $match: filter }, { $lookup: { from: "users", localField: "userId", foreignField: "_id", as: "customer" } }, { $unwind: { path: "$customer", preserveNullAndEmptyArrays: true } }, { $addFields: { buyerName: "$customer.name", phone: "$customer.phone" } }, { $project: { customer: 0 } }, { $sort: { createdAt: -1 } }]).toArray(); return json(200, { orders: rows }); }
  const data = body(event); if (event.httpMethod === "POST") { const product = await database.collection("products").findOne({ _id: id(data.productId) }); if (!product) return json(404, { message: "Product not found" }); const quantity = Math.max(1, Number(data.quantity)); const order = { userId: session.userId, productId: product._id, product: product.name, quantity, price: product.price, total: product.price * quantity, paid: false, status: "new", createdAt: new Date() }; const r = await orders.insertOne(order); return json(201, { order: { ...order, _id: r.insertedId } }); }
  const order = await orders.findOne({ _id: id(data.id) });
  if (!order) return json(404, { message: "Order not found" });
  const isAdmin = session.role === "admin";
  const customerReceiving = !isAdmin && order.userId.equals(session.userId) && order.status === "on the way" && data.status === "received";
  if (!isAdmin && !customerReceiving) return json(403, { message: "Admin only" });
  const update = isAdmin ? { status: data.status, paid: Boolean(data.paid) } : { status: "received" };
  await orders.updateOne({ _id: order._id }, { $set: update });
  return json(200, { ok: true });
} catch (e) { console.error(e); return json(500, { message: "Server error" }); } }
