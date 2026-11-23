"use client";

/**
 * Last-resort boundary for errors in the root layout itself. Renders its own
 * document; keeps styling self-contained so it works even if CSS failed.
 */
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  const digest =
    error && typeof error === "object" && "digest" in error && typeof error.digest === "string" ? error.digest : null;
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#f5f8fa",
          color: "#0b1f33",
        }}
      >
        <title>Something went wrong · OceanX</title>
        <main style={{ maxWidth: 480, padding: 24, textAlign: "center" }}>
          <h1 style={{ fontSize: 28, marginBottom: 8 }}>Something went wrong</h1>
          <p style={{ color: "#4a5b6c", lineHeight: 1.6 }}>
            The portal couldn&apos;t load. Please try again in a moment.
          </p>
          {digest ? (
            <p style={{ color: "#4a5b6c", fontSize: 12 }}>
              Reference: <code>{digest}</code>
            </p>
          ) : null}
          <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 24 }}>
            <button
              type="button"
              onClick={() => retry()}
              style={{
                background: "#0e6a8a",
                color: "#fff",
                border: 0,
                borderRadius: 6,
                padding: "12px 18px",
                fontSize: 15,
                cursor: "pointer",
              }}
            >
              Try again
            </button>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- full reload is intentional when the root layout failed */}
            <a href="/" style={{ color: "#0e6a8a", padding: "12px 18px", fontSize: 15 }}>
              Go to home page
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
