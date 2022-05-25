require("dotenv").config();
const fs = require("fs");
const path = require("path");
const axios = require("axios");

const { TOKEN, QUERY, ORG } = process.env;

const ACCEPT = "application/vnd.github.v3.text-match+json";
const API = encodeURI(
  `https://api.github.com/search/code?q=${QUERY}+org:${ORG}&per_page=100`
);
const headers = {
  Authorization: `token ${TOKEN}`,
  Accept: ACCEPT,
};
const OUTPUT_DIR = "output";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

(async () => {
  const results = {
    options: {
      query: QUERY,
      api: API,
    },
  };
  let page = 0;
  while (true) {
    page++;
    try {
      const uri = `${API}&page=${page}`;
      console.log(uri);
      const res = await axios.get(uri, {
        headers,
      });
      if (res.status === 200) {
        const { data } = res;
        if (data.items.length > 0) {
          for (let item of data.items) {
            const repoName = item.repository["full_name"];
            const match = {
              path: item["path"],
              fragment: item["text_matches"][0]["fragment"],
            };
            results[repoName] = results[repoName] || [];
            results[repoName].push(match);
          }
          await sleep(1000);
        } else {
          console.log(`Completed at page ${page}`);
          break;
        }
      }
    } catch (e) {
      if (axios.isAxiosError(e) && e.response) {
        console.error(e.response);
      }
      console.error(e.message);
      break;
    }
  }

  if (!(await fs.existsSync(OUTPUT_DIR))) {
    await fs.mkdirSync(OUTPUT_DIR);
  }
  await fs.writeFileSync(
    path.join(OUTPUT_DIR, `${QUERY}.json`),
    JSON.stringify(results)
  );
})();
