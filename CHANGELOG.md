# Changelog

All notable changes to this project will be documented in this file.

v1.0.3

- **feat:** DTO object format — alternative syntax for validation schemas
  - **Before:** only array format `email: ['string', 'required', 'email']`
  - **Now:** also supports `email: { type: 'string', required: true, email: true }`
  - Both formats produce identical results, object format is ~2% faster (no string splitting)
  - Supports all existing rules: `type`, `required`, `optional`, `default`, `min`, `max`, `length`, `pattern`, `enum`, `email`, `url`, `uuid`, `date`

- **fix:** duplicate module name/prefix detection
  - **Before:** two modules with the same `name` or `prefix` silently overwrote each other's routes and services
  - **Now:** `createApp()` and `addModule()` throw a clear error:
    - `Duplicate module name: "auth". Each module must have a unique name.`
    - `Duplicate module prefix: "/auth" (module "auth2"). Each module must have a unique prefix.`

- **fix:** service name collision now throws instead of warning
  - **Before:** `Service "userService" conflict: module "auth2" overrides existing.` (warn, silently overwrites)
  - **Now:** throws `Error` with three resolution options: rename, use `isolated: true`, or access via namespaced key `"moduleName.serviceName"`

v1.0.2
- **fix:** `watch` mode + imperative API (`setRoute`, `addModule`, etc.)
  - **Before:** `createApp({ watch: true })` returned a watcher object — `setRoute` and other methods threw `TypeError`
  - **Now:** `createApp()` always returns `SuperApp`, watch logic moved to `listen()`


v1.0.1
- Updated README.md