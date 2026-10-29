export const EVENT_TYPES = ["response.submitted", "form.created", "form.published", "form.unpublished", "form.deleted"] as const;
export type EventType = (typeof EVENT_TYPES)[number];
