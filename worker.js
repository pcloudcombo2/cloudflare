export default {
  async fetch(request) {
    const { searchParams } = new URL(request.url);
    const inputUrl = searchParams.get("url");

    if (!inputUrl) {
      return json({ error: "Missing ?url parameter" }, 400);
    }

    const gifId = extractRedgifsId(inputUrl);
    if (!gifId) {
      return json({ error: "Invalid Redgifs URL" }, 400);
    }

    try {
      // 1. Get temporary auth token
      const tokenRes = await fetch(
        "https://api.redgifs.com/v2/auth/temporary",
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
            "Accept": "application/json",
            "Referer": "https://www.redgifs.com/",
            "Origin": "https://www.redgifs.com",
          },
        }
      );

      if (!tokenRes.ok) {
        const text = await tokenRes.text();
        throw new Error(`Auth failed: ${tokenRes.status} ${text}`);
      }

      const tokenData = await tokenRes.json();

      if (!tokenData?.token) {
        throw new Error("Failed to obtain auth token");
      }

      // 2. Fetch gif metadata
      const gifRes = await fetch(
        `https://api.redgifs.com/v2/gifs/${gifId}`,
        {
          headers: {
            Authorization: `Bearer ${tokenData.token}`,
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
          },
        }
      );

      if (!gifRes.ok) {
        const text = await gifRes.text();
        throw new Error(`Auth failed: ${gifRes.status} ${text}`);
      }

      const gifData = await gifRes.json();

      const urls = gifData?.gif?.urls;
      if (!urls) {
        throw new Error("No video URLs found");
      }

      // Prefer HD MP4, fallback to SD
      const mp4 =
        urls.hd ||
        urls.sd ||
      //   urls.gif;

      // return json({
      //   id: gifId,
      //   mp4,
      // });
      
      return json(gifData);
      
    } catch (err) {
      return json({ error: err.message }, 500);
    }
  },
};

function extractRedgifsId(url) {
  try {
    const u = new URL(url);

    // Examples:
    // https://www.redgifs.com/watch/abcdef
    // https://redgifs.com/ifr/abcdef
    const parts = u.pathname.split("/").filter(Boolean);
    return parts[parts.length - 1] || null;
  } catch {
    return null;
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
