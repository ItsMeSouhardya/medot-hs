import { afterEach, expect, it } from "vitest";
import { getSql } from "../db";

const originalDatabaseUrl = process.env.DATABASE_URL;

afterEach(() => {
  if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = originalDatabaseUrl;
});

it("rejects a missing database URL before opening a connection", () => {
  delete process.env.DATABASE_URL;
  expect(() => getSql()).toThrow("DATABASE_URL is required");
});
