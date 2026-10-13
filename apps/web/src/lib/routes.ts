const WORKBENCH_ROUTES = [
  /^\/chat$/,
  /^\/chat\/[^/]+$/,
  /^\/datasets$/,
  /^\/datasets\/[^/]+$/,
  /^\/datasets\/[^/]+\/retrieval$/,
  /^\/documents\/[^/]+\/chunks$/,
];

export function isWorkbenchRoute(pathname: string) {
  return WORKBENCH_ROUTES.some((pattern) => pattern.test(pathname));
}
