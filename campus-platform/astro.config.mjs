import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

const site = process.env.PUBLIC_CAMPUS_PLATFORM_SITE_URL || "http://127.0.0.1:4321";

export default defineConfig({
  site,
  integrations: [sitemap()],
  output: "static"
});
