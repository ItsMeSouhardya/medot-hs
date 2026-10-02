import {
  buildTagUrl,
  generateToken,
  provisionInputSchema,
  type ProvisionInput,
} from "./domain";

export type PendingTag = ProvisionInput & {
  token: string;
  status: "PENDING";
  createdBy?: string;
};

export type ProvisionRepository = {
  medicineExists(id: string): Promise<boolean>;
  insertPending(record: PendingTag): Promise<void>;
};

export class ProvisionError extends Error {
  constructor(public readonly code: "INVALID_INPUT" | "UNKNOWN_MEDICINE") {
    super(code === "INVALID_INPUT" ? "Invalid provision input" : "Medicine not in catalog");
  }
}

function isTokenCollision(error: unknown): boolean {
  return typeof error === "object" && error !== null &&
    "code" in error && error.code === "23505";
}

export async function createPendingTag(
  rawInput: unknown,
  repository: ProvisionRepository,
  origin: string,
  createdBy?: string,
): Promise<{ token: string; url: string }> {
  const parsed = provisionInputSchema.safeParse(rawInput);
  if (!parsed.success) throw new ProvisionError("INVALID_INPUT");
  const input = parsed.data;
  if (!(await repository.medicineExists(input.medicineId))) {
    throw new ProvisionError("UNKNOWN_MEDICINE");
  }

  for (let attempt = 0; attempt < 2; attempt++) {
    const token = generateToken();
    const url = buildTagUrl(token, origin);
    try {
      await repository.insertPending({ ...input, token, status: "PENDING", ...(createdBy ? { createdBy } : {}) });
      return { token, url };
    } catch (error) {
      if (!isTokenCollision(error) || attempt === 1) throw error;
    }
  }
  throw new Error("Unable to create token");
}
