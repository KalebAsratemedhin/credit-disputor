import * as healthRepository from "../repositories/health.repository";

export async function checkDatabase(): Promise<void> {
  await healthRepository.pingDatabase();
}
