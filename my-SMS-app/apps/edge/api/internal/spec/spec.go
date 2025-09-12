package spec

import (
    "encoding/json"
    "net/http"
    _ "embed"

    yaml "gopkg.in/yaml.v3"
)

//go:embed openapi.yaml
var openapiYAML []byte

func ServeYAML(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/yaml; charset=utf-8")
    w.WriteHeader(http.StatusOK)
    _, _ = w.Write(openapiYAML)
}

func ServeJSON(w http.ResponseWriter, r *http.Request) {
    var doc any
    if err := yaml.Unmarshal(openapiYAML, &doc); err != nil {
        http.Error(w, "failed to parse spec", http.StatusInternalServerError)
        return
    }
    b, err := json.MarshalIndent(doc, "", "  ")
    if err != nil {
        http.Error(w, "failed to render spec", http.StatusInternalServerError)
        return
    }
    w.Header().Set("Content-Type", "application/json; charset=utf-8")
    w.WriteHeader(http.StatusOK)
    _, _ = w.Write(b)
}

func ServeDocs(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "text/html; charset=utf-8")
    w.WriteHeader(http.StatusOK)
    _, _ = w.Write([]byte(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Edge API Docs</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css" />
  </head>
  <body>
    <div id="swagger"></div>
    <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      window.ui = SwaggerUIBundle({
        url: '/openapi.json',
        dom_id: '#swagger',
        presets: [SwaggerUIBundle.presets.apis],
        layout: 'BaseLayout'
      });
    </script>
  </body>
</html>`))
}
