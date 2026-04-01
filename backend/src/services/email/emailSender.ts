import type { RenderedEmail } from "./types";

export type SendTransactionalParams = RenderedEmail & {
  to: string;
};

export interface EmailSender {
  sendTransactional(params: SendTransactionalParams): Promise<void>;
}
