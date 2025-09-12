# Config, Policy, and Templates Schemas

Defines JSON Schemas and examples for per-tenant and per-vessel customization, feature flags, template packs, and policy rules.

## JSON Schemas (draft)
```json
{
  "$id": "TenantConfig",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "tenantId": { "type": "string", "format": "uuid" },
    "branding": {
      "type": "object",
      "properties": {
        "logoUrl": { "type": "string", "format": "uri" },
        "colors": {
          "type": "object",
          "properties": {
            "primary": { "type": "string" },
            "secondary": { "type": "string" },
            "accent": { "type": "string" }
          },
          "additionalProperties": false
        },
        "reportHeader": { "type": "string" },
        "reportFooter": { "type": "string" }
      },
      "additionalProperties": false
    },
    "modules": {
      "type": "object",
      "properties": {
        "logbooks": { "type": "boolean" },
        "pms": { "type": "boolean" },
        "inventory": { "type": "boolean" },
        "requisitions": { "type": "boolean" },
        "checklists": { "type": "boolean" },
        "incidents": { "type": "boolean" },
        "audits": { "type": "boolean" }
      },
      "additionalProperties": false
    },
    "residency": { "type": "string" },
    "retentionYears": { "type": "integer", "minimum": 1, "maximum": 15 },
    "signaturePolicy": {
      "type": "object",
      "properties": {
        "mode": { "enum": ["PIN", "BIOMETRIC", "X509"] },
        "requireDualControl": { "type": "boolean" }
      },
      "required": ["mode"],
      "additionalProperties": false
    },
    "syncPolicy": {
      "type": "object",
      "properties": {
        "routineLagHours": { "type": "integer", "minimum": 0 },
        "incidentTargetMinutes": { "type": "integer", "minimum": 0 }
      },
      "additionalProperties": false
    },
    "telemetry": {
      "type": "object",
      "properties": {
        "analyticsOptIn": { "type": "boolean" },
        "errorReporting": { "type": "boolean" }
      },
      "additionalProperties": false
    },
    "languages": {
      "type": "object",
      "properties": {
        "ui": { "type": "array", "items": { "type": "string" } },
        "exports": { "type": "array", "items": { "type": "string" } }
      },
      "additionalProperties": false
    },
    "updatePolicy": {
      "type": "object",
      "properties": {
        "portOnly": { "type": "boolean" },
        "requiresDpaApproval": { "type": "boolean" }
      },
      "additionalProperties": false
    },
    "featureFlags": {
      "type": "array",
      "items": { "$ref": "#/definitions/FeatureFlag" }
    }
  },
  "required": ["tenantId"],
  "additionalProperties": false,
  "definitions": {
    "FeatureFlag": {
      "type": "object",
      "properties": {
        "key": { "type": "string" },
        "enabled": { "type": "boolean" },
        "scope": { "enum": ["tenant", "vessel", "user", "device"] },
        "rules": { "type": "array", "items": { "$ref": "#/definitions/FlagRule" } }
      },
      "required": ["key", "enabled"]
    },
    "FlagRule": {
      "type": "object",
      "properties": {
        "when": { "type": "object" },
        "value": { "type": "boolean" }
      },
      "required": ["value"]
    }
  }
}
```

```json
{
  "$id": "VesselConfig",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "tenantId": { "type": "string", "format": "uuid" },
    "vesselId": { "type": "string", "format": "uuid" },
    "templates": {
      "type": "object",
      "properties": {
        "pack": { "type": "string" },
        "version": { "type": "string" }
      },
      "additionalProperties": false
    },
    "logbooks": {
      "type": "object",
      "properties": {
        "bridge": { "type": "boolean" },
        "engine": { "type": "boolean" },
        "gmdss": { "type": "boolean" },
        "orbI": { "type": "boolean" },
        "garbage": { "type": "boolean" }
      },
      "additionalProperties": false
    },
    "procedureChecklist": {
      "type": "object",
      "properties": {
        "enabled": { "type": "boolean" },
        "variants": { "type": "array", "items": { "type": "string" } }
      }
    },
    "evidencePolicy": {
      "type": "object",
      "properties": {
        "allowPhotos": { "type": "boolean" },
        "redaction": { "type": "boolean" }
      }
    },
    "devicePolicies": {
      "type": "object",
      "properties": {
        "storageGB": { "type": "number", "minimum": 1 },
        "updateWindows": { "type": "array", "items": { "type": "string" } }
      }
    }
  },
  "required": ["tenantId", "vesselId"],
  "additionalProperties": false
}
```

```json
{
  "$id": "TemplateRegistry",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "packs": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name": { "type": "string" },
          "version": { "type": "string" },
          "templates": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "id": { "type": "string" },
                "kind": { "enum": ["PDF", "FORM", "LAYOUT"] },
                "ref": { "type": "string" },
                "flags": { "type": "array", "items": { "type": "string" } }
              },
              "required": ["id", "kind", "ref"]
            }
          }
        },
        "required": ["name", "version", "templates"]
      }
    }
  },
  "additionalProperties": false
}
```

```json
{
  "$id": "PolicyRule",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "target": { "type": "string" },
    "operation": { "enum": ["require", "visible", "validate"] },
    "condition": { "type": "object" },
    "message": { "type": "string" }
  },
  "required": ["target", "operation"],
  "additionalProperties": false
}
```

## Precedence & Merge
- Precedence order: defaults → tenant config → vessel config → device/user overrides.
- Merge strategy: deep merge with last-writer-wins per field; arrays replace unless specified (e.g., `templates` can be merged by `id`).

## Examples
```json
// TenantConfig example
{
  "tenantId": "11111111-1111-1111-1111-111111111111",
  "branding": {
    "logoUrl": "https://example.com/logo.png",
    "colors": { "primary": "#004080", "secondary": "#00A0E0", "accent": "#FFC107" },
    "reportHeader": "ACME Shipping – Official Records",
    "reportFooter": "Confidential – For inspection use"
  },
  "modules": { "logbooks": true, "pms": true, "inventory": true, "requisitions": true, "checklists": true },
  "residency": "eu-central-1",
  "retentionYears": 10,
  "signaturePolicy": { "mode": "PIN", "requireDualControl": false },
  "syncPolicy": { "routineLagHours": 24, "incidentTargetMinutes": 60 },
  "telemetry": { "analyticsOptIn": false, "errorReporting": true },
  "languages": { "ui": ["en"], "exports": ["en"] }
}
```

```json
// VesselConfig example
{
  "tenantId": "11111111-1111-1111-1111-111111111111",
  "vesselId": "22222222-2222-2222-2222-222222222222",
  "templates": { "pack": "ABS-IMO-Forms", "version": "1.0.0" },
  "logbooks": { "bridge": true, "engine": true, "gmdss": true, "orbI": true, "garbage": true },
  "procedureChecklist": { "enabled": true, "variants": ["departure", "arrival", "drill"] },
  "evidencePolicy": { "allowPhotos": true, "redaction": true },
  "devicePolicies": { "storageGB": 50, "updateWindows": ["PORT_ONLY"] }
}
```

