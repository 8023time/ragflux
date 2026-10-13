import { globalConfig } from "@ragflux/config";

const isProduction = process.env.NODE_ENV === "production";
const apiOrigin = isProduction
  ? globalConfig.production.hosts.api
  : globalConfig.development.urls.api;

export const appConfig = {
  environment: isProduction ? "production" : "development",
  isProduction,
  appName: globalConfig.name,
  apiBase: `${apiOrigin}/api/v1`,
};

export type AppConfig = typeof appConfig;
