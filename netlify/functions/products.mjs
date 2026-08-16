import { body, db, id, json, admin, user } from "./shared.mjs";
export async function handler(event) { try { const database = await db(), products = database.collection("products");
  if (event.httpMethod === "GET") return json(200, { products: await products.find({}).sort({ createdAt: -1 }).toArray() });
  if (!await admin(event)) return json(403, { message: "Admin only" }); const data = body(event);
  if (event.httpMethod === "POST") { const product = { name: data.name, price: Number(data.price), bio: data.bio, image: data.image || "", createdAt: new Date() }; const r = await products.insertOne(product); return json(201, { product: { ...product, _id: r.insertedId } }); }
  if (event.httpMethod === "PUT") { await products.updateOne({ _id: id(data.id) }, { $set: { name: data.name, price: Number(data.price), bio: data.bio, image: data.image || "" } }); return json(200, { ok: true }); }
  if (event.httpMethod === "DELETE") { await products.deleteOne({ _id: id(data.id) }); return json(200, { ok: true }); } return json(405, {});
} catch (e) { console.error(e); return json(500, { message: "Server error" }); } }
