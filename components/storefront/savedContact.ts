// Name and phone the customer already typed at checkout on this device, to pre-fill other forms.
export function savedContact(): { name: string; phone: string } {
  try {
    const c = JSON.parse(window.localStorage.getItem("th_checkout") ?? "{}") as { customerName?: unknown; customerPhone?: unknown };
    return {
      name: typeof c.customerName === "string" ? c.customerName : "",
      phone: typeof c.customerPhone === "string" ? c.customerPhone : "",
    };
  } catch {
    return { name: "", phone: "" };
  }
}
