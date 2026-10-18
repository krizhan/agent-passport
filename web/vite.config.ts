import { defineConfig, loadEnv, type Plugin } from "vite";
import { handleRequests } from "./server/requests-handler.ts";

export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ""), ...process.env };
  const config = { apiKey: env.MANUFACT_API_KEY, serverId: env.MANUFACT_SERVER_ID };
  const historyApi: Plugin = {
    name: "manufact-request-history",
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if (request.url?.split("?")[0] !== "/api/requests") return next();
        void handleRequests(request, response, config);
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((request, response, next) => {
        if (request.url?.split("?")[0] !== "/api/requests") return next();
        void handleRequests(request, response, config);
      });
    },
  };
  return { plugins: [historyApi] };
});
