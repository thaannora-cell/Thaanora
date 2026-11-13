import { notFound } from "next/navigation";

// Any address that doesn't exist shows the "page not found" page in the visitor's language.
export default function CatchAll() {
  notFound();
}
