import { FIELD_TYPES } from "./fields";
import { EVENT_TYPES } from "./events-types";

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const json = (schema: object, description = "OK") => ({ description, content: { "application/json": { schema } } });
const idParam = (name: string, description: string) => ({ name, in: "path", required: true, schema: { type: "string" }, description });
const errors = {
  "401": { $ref: "#/components/responses/Unauthorized" },
  "404": { $ref: "#/components/responses/NotFound" },
  "422": { $ref: "#/components/responses/ValidationFailed" },
};

export function openApiSpec(serverUrl: string) {
  return {
    openapi: "3.1.0",
    info: {
      title: "Formflow API",
      version: "1.0.0",
      description:
        "Create forms, read and submit responses, and subscribe to events. Authenticate with a workspace API key from Settings: `Authorization: Bearer ff_live_...`.",
    },
    servers: [{ url: `${serverUrl}/api/v1` }],
    security: [{ bearerAuth: [] }],
    tags: [{ name: "Workspace" }, { name: "Forms" }, { name: "Responses" }, { name: "Webhooks" }],
    paths: {
      "/me": {
        get: {
          tags: ["Workspace"],
          operationId: "getWorkspace",
          summary: "Get the workspace for this API key",
          description: "Use it to test a connection.",
          responses: { "200": json({ type: "object", properties: { workspace: ref("Workspace") } }), "401": errors["401"] },
        },
      },
      "/forms": {
        get: {
          tags: ["Forms"],
          operationId: "listForms",
          summary: "List forms",
          parameters: [{ name: "status", in: "query", schema: { type: "string", enum: ["draft", "published"] } }],
          responses: {
            "200": json({ type: "object", properties: { data: { type: "array", items: ref("Form") } } }),
            "401": errors["401"],
          },
        },
        post: {
          tags: ["Forms"],
          operationId: "createForm",
          summary: "Create a form",
          description: "New forms start as drafts. Publish with PATCH status=published.",
          requestBody: { required: true, content: { "application/json": { schema: ref("FormInput") } } },
          responses: { "201": json(ref("Form"), "Created"), "401": errors["401"], "422": errors["422"] },
        },
      },
      "/forms/{form_id}": {
        parameters: [idParam("form_id", "Form ID, for example frm_...")],
        get: { tags: ["Forms"], operationId: "getForm", summary: "Get a form", responses: { "200": json(ref("Form")), ...errors } },
        patch: {
          tags: ["Forms"],
          operationId: "updateForm",
          summary: "Update or publish a form",
          description: "Send any of title, description, fields, settings and status. Sending fields replaces the whole list; keep each field's id to keep its answers.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { allOf: [ref("FormInput")], properties: { status: { type: "string", enum: ["draft", "published"] } }, required: [] },
              },
            },
          },
          responses: { "200": json(ref("Form")), ...errors },
        },
        delete: {
          tags: ["Forms"],
          operationId: "deleteForm",
          summary: "Delete a form and its responses",
          responses: { "204": { description: "Deleted" }, "401": errors["401"], "404": errors["404"] },
        },
      },
      "/forms/{form_id}/fields": {
        parameters: [idParam("form_id", "Form ID")],
        get: {
          tags: ["Forms"],
          operationId: "listFormFields",
          summary: "List the fields a form's responses can be mapped from",
          description:
            "Standard contact keys (email, firstname, lastname, name, phone, company) first, then one entry per question in form order. Each name is the path of the value in a response, for example answers.fld_4ljrk4n8.",
          responses: {
            "200": json({
              type: "object",
              properties: {
                data: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string", example: "answers.email" },
                      label: { type: "string", example: "Email" },
                      type: { type: "string", example: "email" },
                      standard: { type: "boolean", description: "A standard contact key, present on every form" },
                      required: { type: "boolean", description: "Whether the question must be answered" },
                    },
                    required: ["name", "label", "type"],
                  },
                },
              },
            }),
            "401": errors["401"],
            "404": errors["404"],
          },
        },
      },
      "/forms/{form_id}/share-link": {
        parameters: [idParam("form_id", "Form ID")],
        post: {
          tags: ["Forms"],
          operationId: "createShareLink",
          summary: "Get a link to send someone, with optional prefilled answers",
          requestBody: {
            required: false,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    prefill: {
                      type: "object",
                      additionalProperties: { type: ["string", "number", "boolean"] },
                      description: "Answers keyed by field id, field label or a standard contact key (email, firstname, lastname, name, phone, company)",
                      example: { Email: "jane@acme.com" },
                    },
                  },
                },
              },
            },
          },
          responses: {
            "200": json({ type: "object", properties: { form_id: { type: "string" }, url: { type: "string", format: "uri" } } }),
            "409": { description: "Form is not published", content: { "application/json": { schema: ref("Error") } } },
            ...errors,
          },
        },
      },
      "/forms/{form_id}/responses": {
        parameters: [idParam("form_id", "Form ID")],
        get: {
          tags: ["Responses"],
          operationId: "listResponses",
          summary: "List responses, newest first",
          parameters: [
            { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 200, default: 50 } },
            { name: "before", in: "query", schema: { type: "string" }, description: "Response ID cursor from next_cursor" },
          ],
          responses: {
            "200": json({
              type: "object",
              properties: {
                data: { type: "array", items: ref("Response") },
                has_more: { type: "boolean" },
                next_cursor: { type: ["string", "null"] },
              },
            }),
            ...errors,
          },
        },
        post: {
          tags: ["Responses"],
          operationId: "submitResponse",
          summary: "Submit a response",
          description: "Answers are validated like the hosted form. Keys can be field ids, field labels (case-insensitive) or standard contact keys (email, firstname, lastname, name, phone, company).",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["answers"],
                  properties: { answers: { type: "object", additionalProperties: true, example: { "Full name": "Jane Doe", Email: "jane@acme.com" } } },
                },
              },
            },
          },
          responses: { "201": json(ref("Response"), "Created"), ...errors },
        },
      },
      "/responses/{response_id}": {
        parameters: [idParam("response_id", "Response ID, for example rsp_...")],
        get: { tags: ["Responses"], operationId: "getResponse", summary: "Get a response", responses: { "200": json(ref("Response")), ...errors } },
        delete: {
          tags: ["Responses"],
          operationId: "deleteResponse",
          summary: "Delete a response",
          responses: { "204": { description: "Deleted" }, "401": errors["401"], "404": errors["404"] },
        },
      },
      "/webhooks": {
        get: {
          tags: ["Webhooks"],
          operationId: "listWebhooks",
          summary: "List webhook subscriptions",
          responses: { "200": json({ type: "object", properties: { data: { type: "array", items: ref("Webhook") } } }), "401": errors["401"] },
        },
        post: {
          tags: ["Webhooks"],
          operationId: "createWebhook",
          summary: "Subscribe a URL to events",
          description: "The response includes the signing secret once.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["url"],
                  properties: {
                    url: { type: "string", format: "uri" },
                    events: { type: "array", items: { type: "string", enum: EVENT_TYPES }, default: ["response.submitted"] },
                    form_id: { type: "string", description: "Only send events for this form" },
                    description: { type: "string" },
                  },
                },
              },
            },
          },
          responses: { "201": json({ allOf: [ref("Webhook")], properties: { secret: { type: "string" } } }, "Created"), ...errors },
        },
      },
      "/webhooks/{webhook_id}": {
        parameters: [idParam("webhook_id", "Webhook ID, for example wh_...")],
        get: { tags: ["Webhooks"], operationId: "getWebhook", summary: "Get a webhook", responses: { "200": json(ref("Webhook")), ...errors } },
        delete: {
          tags: ["Webhooks"],
          operationId: "deleteWebhook",
          summary: "Unsubscribe a webhook",
          responses: { "204": { description: "Deleted" }, "401": errors["401"], "404": errors["404"] },
        },
      },
    },
    webhooks: Object.fromEntries(
      EVENT_TYPES.map((type) => [
        type,
        {
          post: {
            summary: type === "response.submitted" ? "A form received a response" : `Form event: ${type}`,
            description:
              "Signed with HMAC-SHA256. Header `X-Formflow-Signature: t=<unix>,v1=<hex>` where v1 = HMAC(secret, `${t}.${rawBody}`). Failed deliveries are retried up to 3 times.",
            requestBody: { content: { "application/json": { schema: ref(type === "response.submitted" ? "ResponseSubmittedEvent" : "FormEvent") } } },
            responses: { "200": { description: "Return any 2xx to acknowledge" } },
          },
        },
      ]),
    ),
    components: {
      securitySchemes: { bearerAuth: { type: "http", scheme: "bearer", description: "Workspace API key, ff_live_..." } },
      responses: {
        Unauthorized: { description: "Missing or invalid API key", content: { "application/json": { schema: ref("Error") } } },
        NotFound: { description: "Not found", content: { "application/json": { schema: ref("Error") } } },
        ValidationFailed: { description: "Invalid input", content: { "application/json": { schema: ref("Error") } } },
      },
      schemas: {
        Workspace: {
          type: "object",
          properties: { id: { type: "string" }, name: { type: "string" }, created_at: { type: "string", format: "date-time" } },
        },
        Field: {
          type: "object",
          required: ["type", "label"],
          properties: {
            id: { type: "string", description: "Generated when omitted" },
            type: { type: "string", enum: FIELD_TYPES.map((f) => f.type) },
            label: { type: "string" },
            required: { type: "boolean", default: false },
            placeholder: { type: "string" },
            helpText: { type: "string" },
            options: { type: "array", items: { type: "string" }, description: "Required for single_select and multi_select" },
          },
        },
        FormSettings: {
          type: "object",
          properties: {
            submitLabel: { type: "string" },
            thankYouMessage: { type: "string" },
            redirectUrl: { type: "string", format: "uri" },
            closed: { type: "boolean" },
          },
        },
        FormInput: {
          type: "object",
          required: ["title"],
          properties: {
            title: { type: "string" },
            description: { type: "string" },
            fields: { type: "array", items: ref("Field") },
            settings: ref("FormSettings"),
          },
        },
        Form: {
          type: "object",
          properties: {
            id: { type: "string" },
            title: { type: "string" },
            description: { type: "string" },
            status: { type: "string", enum: ["draft", "published"] },
            url: { type: "string", format: "uri", description: "Public link" },
            fields: { type: "array", items: ref("Field") },
            settings: ref("FormSettings"),
            response_count: { type: "integer" },
            created_at: { type: "string", format: "date-time" },
            updated_at: { type: "string", format: "date-time" },
          },
        },
        Response: {
          type: "object",
          properties: {
            id: { type: "string" },
            form_id: { type: "string" },
            source: { type: "string", enum: ["web", "api"] },
            created_at: { type: "string", format: "date-time" },
            answers: { type: "object", additionalProperties: true, description: "Answers keyed by field id" },
            fields: {
              type: "array",
              description: "Every field with its label and answer, in form order",
              items: {
                type: "object",
                properties: { id: { type: "string" }, label: { type: "string" }, type: { type: "string" }, value: {} },
              },
            },
          },
        },
        Webhook: {
          type: "object",
          properties: {
            id: { type: "string" },
            url: { type: "string", format: "uri" },
            events: { type: "array", items: { type: "string", enum: EVENT_TYPES } },
            form_id: { type: ["string", "null"] },
            description: { type: "string" },
            active: { type: "boolean" },
            created_at: { type: "string", format: "date-time" },
          },
        },
        ResponseSubmittedEvent: {
          type: "object",
          properties: {
            id: { type: "string", description: "Event ID, use it to drop duplicates" },
            type: { const: "response.submitted" },
            created_at: { type: "string", format: "date-time" },
            workspace_id: { type: "string" },
            data: { type: "object", properties: { form: ref("Form"), response: ref("Response") } },
          },
        },
        FormEvent: {
          type: "object",
          properties: {
            id: { type: "string" },
            type: { type: "string", enum: EVENT_TYPES.filter((t) => t !== "response.submitted") },
            created_at: { type: "string", format: "date-time" },
            workspace_id: { type: "string" },
            data: { type: "object", properties: { form: ref("Form") } },
          },
        },
        Error: {
          type: "object",
          properties: {
            error: {
              type: "object",
              properties: { code: { type: "string" }, message: { type: "string" }, details: {} },
            },
          },
        },
      },
    },
  };
}
