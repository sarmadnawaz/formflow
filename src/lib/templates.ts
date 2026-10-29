import type { FormInput } from "./forms";

export const TEMPLATES: { id: string; name: string; description: string; form: FormInput }[] = [
  {
    id: "blank",
    name: "Blank form",
    description: "Start from scratch.",
    form: { title: "Untitled form", fields: [] },
  },
  {
    id: "contact",
    name: "Contact us",
    description: "Name, email and a message.",
    form: {
      title: "Contact us",
      description: "Send us a message and we will get back to you within one business day.",
      fields: [
        { type: "short_text", label: "Full name", required: true },
        { type: "email", label: "Email", required: true },
        { type: "long_text", label: "Message", required: true },
      ],
    },
  },
  {
    id: "demo",
    name: "Demo request",
    description: "Qualify inbound leads.",
    form: {
      title: "Book a demo",
      description: "Tell us a little about your team and we will set up a call.",
      fields: [
        { type: "short_text", label: "Full name", required: true },
        { type: "email", label: "Work email", required: true },
        { type: "short_text", label: "Company", required: true },
        { type: "single_select", label: "Company size", required: true, options: ["1-10", "11-50", "51-200", "201-1000", "1000+"] },
        { type: "phone", label: "Phone", required: false },
        { type: "date", label: "Preferred date", required: false },
        { type: "long_text", label: "What would you like to see?", required: false },
      ],
      settings: { submitLabel: "Request demo", thankYouMessage: "Thanks! We will email you shortly to confirm a time." },
    },
  },
  {
    id: "feedback",
    name: "Customer feedback",
    description: "Rating, likes and requests.",
    form: {
      title: "How are we doing?",
      fields: [
        { type: "rating", label: "How likely are you to recommend us?", required: true },
        { type: "multi_select", label: "What do you use most?", required: false, options: ["Forms", "Responses", "Integrations", "API"] },
        { type: "long_text", label: "What should we improve?", required: false },
        { type: "email", label: "Email (if you would like a reply)", required: false },
      ],
    },
  },
  {
    id: "event",
    name: "Event registration",
    description: "Sign-ups with consent.",
    form: {
      title: "Event registration",
      fields: [
        { type: "short_text", label: "Full name", required: true },
        { type: "email", label: "Email", required: true },
        { type: "single_select", label: "Ticket type", required: true, options: ["In person", "Online"] },
        { type: "short_text", label: "Dietary requirements", required: false },
        { type: "checkbox", label: "I agree to receive event updates by email", required: true },
      ],
    },
  },
];
