async function handleRequest(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;

  // Handle /console for adding links
  if (path === "/console") {
    if (request.method === "GET") {
      // Return a very simple HTML form.
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <title>Add Short Link</title>
          </head>
          <body>
            <h1>Add a Short Link</h1>
            <form method="POST" action="/console">
              <label for="slug">Slug:</label>
              <input type="text" id="slug" name="slug" required />
              <br /><br />
              <label for="url">Destination URL:</label>
              <input type="url" id="url" name="url" required />
              <br /><br />
              <button type="submit">Add Link</button>
            </form>
          </body>
        </html>
      `;
      return new Response(html, {
        headers: { "Content-Type": "text/html" }
      });
    } else if (request.method === "POST") {
      // Process form submission for adding a new link.
      try {
        const formData = await request.formData();
        const slug = formData.get("slug");
        const destination = formData.get("url");
        if (!slug || !destination) {
          return new Response("Both slug and URL are required.", { status: 400 });
        }
        // Store the mapping in the KV store. Ensure your KV binding is named "SHORT_LINK_KV".
        await env.SHORT_LINK_KV.put(slug, destination);
        return new Response(
          `Link successfully saved. <a href="/console">Add another</a>`,
          { headers: { "Content-Type": "text/html" } }
        );
      } catch (err) {
        return new Response("Error processing request", { status: 500 });
      }
    } else {
      return new Response("Method Not Allowed", { status: 405 });
    }
  } else {
    // Treat any other path as a potential short link slug.
    // Remove the leading slash (e.g., /abc becomes "abc")
    const slug = path.slice(1);
    if (!slug) {
      return new Response("No slug provided.", { status: 400 });
    }

    // Look up the destination URL in KV.
    const destination = await env.SHORT_LINK_KV.get(slug);
    if (!destination) {
      return new Response("Short link not found.", { status: 404 });
    }

    // Return an HTML page that shows "Redirect In Progress..."
    // and then automatically redirects using a meta refresh tag.
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Redirecting...</title>
					<script defer src="https://data.niceygy.net/script.js" data-website-id="b86895ed-129c-49a2-8471-111b5850d769"></script>
          <script>
            const delay = (ms) => new Promise((res) => setTimeout(res, ms));

              const redirect = async () => {
                await delay(500);
                //so the user can read the page!
                window.location.href = "${destination}"
              };
        
        window.document.onload = redirect()
        
        </script>
        </head>
        <body>
          <p>Redirect In Progress...</p>
        </body>
      </html>
    `;
    return new Response(html, {
      headers: { "Content-Type": "text/html" }
    });
  }
}

export default {
  async fetch(request, env, ctx) {
    return handleRequest(request, env);
  }
};
