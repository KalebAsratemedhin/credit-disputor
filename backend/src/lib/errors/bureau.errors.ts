import { AppError } from "../utils/errors";

export class BureauConnectionStateError extends AppError {
  constructor(
    message = "This step is not valid for the current connection state."
  ) {
    super(message, 409, "BUREAU_CONNECTION_STATE");
  }
}

export class ActiveBureauConnectionError extends AppError {
  constructor() {
    super(
      "You already have a bureau connection in progress. Finish or abandon it before starting another.",
      409,
      "ACTIVE_BUREAU_CONNECTION"
    );
  }
}

export class BureauConnectionCorruptError extends AppError {
  constructor(message: string) {
    super(message, 500, "BUREAU_CONNECTION_CORRUPT");
  }
}
