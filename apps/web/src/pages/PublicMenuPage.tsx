import { useQuery } from "@tanstack/react-query";
import { LoaderCircle } from "lucide-react";
import { useParams } from "react-router-dom";
import { getPublicMenu } from "../api";
import { MenuView } from "../components/MenuView";

export function PublicMenuPage() {
  const { slug = "" } = useParams();
  const menu = useQuery({
    queryKey: ["public-menu", slug],
    queryFn: () => getPublicMenu(slug),
    enabled: Boolean(slug),
  });

  if (menu.isPending) return <div className="loading page"><LoaderCircle />Loading menu…</div>;
  if (menu.error) return <div className="error-banner page">{menu.error.message}</div>;
  return <div className="page"><MenuView menu={menu.data} /></div>;
}
