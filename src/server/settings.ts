import { createHash } from "node:crypto";
import { readJson, writeJson } from "./data.ts";

const file = (user: string) =>
  `settings/${createHash("sha256").update(user.toLowerCase()).digest("hex")}.json`;

let saving = Promise.resolve();

export const read = async (user: string): Promise<Record<string, any>> =>
  (await readJson(file(user))) ?? {};

export const update = (user: string, patch: Record<string, any>) => {
  const write = async () => {
    const saved = await read(user);
    return writeJson(file(user), {
      ...saved,
      ...patch,
      ...(patch.seen && { seen: { ...saved.seen, ...patch.seen } }),
    });
  };
  return (saving = saving.then(write, write));
};
