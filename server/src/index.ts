import { createApp } from "./app.js";
import { config } from "./config.js";

const app = createApp();

app.listen(config.PORT, () => {
  console.log(`server listening on http://localhost:${config.PORT}`);
});
