export default function Home() {
  return (
    <main className="shell">
      <section className="panel">
        <p className="eyebrow">Next.js API</p>
        <h1>nhentai media ID lookup</h1>
        <form className="lookup" action="/api/media-id" method="get">
          <label htmlFor="url">Gallery URL or gallery ID</label>
          <div className="row">
            <input
              id="url"
              name="url"
              placeholder="https://nhentai.net/g/648086/"
              required
            />
            <button type="submit">Get ID</button>
          </div>
        </form>
        <div className="examples">
          <code>/api/media-id?url=https://nhentai.net/g/648086/</code>
          <code>/api/media-id?id=648086</code>
        </div>
      </section>
    </main>
  );
}
