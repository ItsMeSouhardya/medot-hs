import { isValidToken } from "./domain";

export type LifecycleRepository = {
  setActiveIfPending(token: string): Promise<boolean>;
  setRevokedIfUsable(token: string): Promise<boolean>;
};

export async function activateTag(
  token: string,
  repository: LifecycleRepository,
): Promise<boolean> {
  return isValidToken(token) && repository.setActiveIfPending(token);
}

export async function revokeTag(
  token: string,
  repository: LifecycleRepository,
): Promise<boolean> {
  return isValidToken(token) && repository.setRevokedIfUsable(token);
}
