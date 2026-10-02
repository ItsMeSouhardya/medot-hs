import { redirect } from "next/navigation";
type Props = { searchParams: Promise<{ tag?: string }> };
export default async function OperatorTagsPage({ searchParams }: Props) {
  const { tag } = await searchParams;
  const query = tag ? "?" + new URLSearchParams({ tag }).toString() : "";
  redirect("/pharmacy/tags" + query);
}
