import { NextResponse } from "next/server";
import connectDB from "./config/db.js";

// Wrap a route handler so every API call:
//   1. has a live Mongo connection
//   2. turns thrown errors (incl. createHttpError) into a JSON response + status
export const route = (fn) => async (request, ctx) => {
  try {
    await connectDB();
    return await fn(request, ctx);
  } catch (error) {
    const status = error.status || 500;
    if (status >= 500) console.error(error);
    return NextResponse.json(
      { message: error.message || "Internal server error" },
      { status },
    );
  }
};

export const json = (data, status = 200) => NextResponse.json(data, { status });

// Shared list/pagination parsing (mirrors the old Express admin controller).
export const parseListQuery = (request) => {
  const params = new URL(request.url).searchParams;
  return {
    limit: Math.min(Number(params.get("limit") || 25), 100),
    page: Math.max(Number(params.get("page") || 1), 1),
    search: params.get("search")?.trim() || "",
    get: (key) => params.get(key),
  };
};

export const paginate = async (modelQuery, countQuery, { limit, page }) => {
  const [data, total] = await Promise.all([
    modelQuery.skip((page - 1) * limit).limit(limit),
    countQuery,
  ]);
  return { data, total, page, limit, pages: Math.ceil(total / limit) || 1 };
};
