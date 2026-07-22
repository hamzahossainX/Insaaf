import "dotenv/config";
import app from "./app";

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Insaaf ERP (Oxygen wing) backend listening on port ${PORT}`);
});
