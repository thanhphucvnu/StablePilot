import { runAgentOnce } from "./agent";

async function main(): Promise<void> {
  for (let i = 0; i < 5; i += 1) {
    const result = await runAgentOnce();
    console.log(JSON.stringify(result, null, 2));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
