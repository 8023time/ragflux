import type { Metadata } from "next";
import { appConfig } from "@/config/global";

export const GITHUB_URL = "https://github.com/8023time/ragflux";

export const siteMetadata: Metadata = {
  title: appConfig.appName,
  description: "让每一份文档，都成为答案的一部分。",
};
