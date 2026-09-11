// Public API of the auth feature. Import only from here —
// never from another feature's internals.
export { AuthProvider, useAuth, deriveCapabilities } from "./AuthContext";
export { RequireAuth, RequireCapability, AuthErrorScreen } from "./RequireAuth";
export { Capabilities, ACCESS_RPC } from "./types";
export type { AuthState, Role, AccountStatus, Capability } from "./types";
