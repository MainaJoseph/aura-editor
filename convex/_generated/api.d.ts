/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as constants from "../constants.js";
import type * as conversations from "../conversations.js";
import type * as extensions from "../extensions.js";
import type * as files from "../files.js";
import type * as invites from "../invites.js";
import type * as members from "../members.js";
import type * as presence from "../presence.js";
import type * as projects from "../projects.js";
import type * as seedExtensions from "../seedExtensions.js";
import type * as system from "../system.js";
import type * as yjs from "../yjs.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  constants: typeof constants;
  conversations: typeof conversations;
  extensions: typeof extensions;
  files: typeof files;
  invites: typeof invites;
  members: typeof members;
  presence: typeof presence;
  projects: typeof projects;
  seedExtensions: typeof seedExtensions;
  system: typeof system;
  yjs: typeof yjs;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
