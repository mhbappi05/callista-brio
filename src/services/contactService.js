import { call } from "./orderService";

export const sendContactMessage = ({
  name,
  email,
  subject,
  message,
  website,
}) => call("contact-message", { name, email, subject, message, website });
