export function renderErrorPage(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>FaceSense AI</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body { font: 15px/1.5 system-ui, -apple-system, sans-serif; background: #fafafa; color: #111; display: grid; place-items: center; min-height: 100vh; margin: 0; padding: 1.5rem; }
      .spinner { width: 36px; height: 36px; border: 4px solid #e2e8f0; border-top-color: #2563eb; border-radius: 50%; animation: spin 0.8s linear infinite; }
      @keyframes spin { to { transform: rotate(360deg); } }
    </style>
  </head>
  <body>
    <div style="display: flex; flex-direction: column; align-items: center; gap: 12px;">
      <div class="spinner"></div>
      <p style="color: #64748b; font-size: 14px; font-weight: 500;">Loading FaceSense AI…</p>
    </div>
    <script>
      setTimeout(function() {
        location.reload();
      }, 100);
    </script>
  </body>
</html>`;
}
