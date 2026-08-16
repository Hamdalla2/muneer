import { MongoClient, ObjectId } from "mongodb";
import crypto from "crypto";

let client;
export async function db() { if (!client) client = new MongoClient(process.env.MONGODB_URI); await client.connect(); return client.db(); }
export const json = (status, body) => ({ statusCode: status, headers: { "content-type": "application/json", "access-control-allow-origin": "*" }, body: JSON.stringify(body) });
export const body = event => event.body ? JSON.parse(event.body) : {};
export const id = value => new ObjectId(value);
export async function user(event) { const token = event.headers.authorization?.replace("Bearer ", ""); if (!token) return null; return (await db()).collection("sessions").findOne({ token, expiresAt: { $gt: new Date() } }); }
export const token = () => crypto.randomBytes(32).toString("base64url");
export async function admin(event) { const session = await user(event); return session?.role === "admin" ? session : null; }
