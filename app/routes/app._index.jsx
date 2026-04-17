import { redirect } from "react-router";

export const loader = async ({ request }) => {
  const url = new URL(request.url);
  return redirect(`/app/order-care${url.search}`);
};

export default function AppIndex() {
  return null;
}
