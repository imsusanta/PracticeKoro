// Public API of the shared errors module.
export {
  AppError,
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  NetworkError,
  AttemptExpiredError,
  AttemptAlreadySubmittedError,
  DataIntegrityError,
} from "./appErrors";
export type { ErrorCode } from "./appErrors";
export { mapSupabaseError, toUserMessage } from "./mapSupabaseError";
