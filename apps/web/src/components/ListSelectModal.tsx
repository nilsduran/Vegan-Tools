import { useState, useEffect, type FormEvent } from "react";
import { Bookmark, Check, FolderPlus, Globe, Lock, Plus, X } from "lucide-react";
import {
  loadUserLists,
  toggleRestaurantInList,
  createCustomList,
  isRestaurantInList,
  type UserRestaurantList,
} from "../utils/userLists";
import { tx } from "../i18n";

interface ListSelectModalProps {
  isOpen: boolean;
  restaurantId: string;
  restaurantName: string;
  onClose: () => void;
}

export function ListSelectModal({
  isOpen,
  restaurantId,
  restaurantName,
  onClose,
}: ListSelectModalProps) {
  const [lists, setLists] = useState<UserRestaurantList[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newIsPublic, setNewIsPublic] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLists(loadUserLists());
      setIsCreating(false);
      setNewTitle("");
      setNewIsPublic(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggle = (listId: string) => {
    toggleRestaurantInList(listId, restaurantId);
    setLists(loadUserLists());
  };

  const handleCreateList = (e: FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const created = createCustomList(newTitle, "", newIsPublic);
    toggleRestaurantInList(created.id, restaurantId);
    setLists(loadUserLists());
    setIsCreating(false);
    setNewTitle("");
  };

  return (
    <div
      className="auth-dialog-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="list-modal-title"
    >
      <div
        className="auth-dialog-modal list-select-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "400px", width: "92%", padding: "1.1rem 1.15rem" }}
      >
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "0.65rem",
            paddingBottom: "0.55rem",
            borderBottom: "1px solid var(--line)",
          }}
        >
          <div style={{ minWidth: 0, paddingRight: "1.75rem" }}>
            <h3 id="list-modal-title" style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800 }}>
              {tx("Add to list")}
            </h3>
            <span style={{ fontSize: "0.8rem", color: "var(--muted)", fontWeight: 600, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {restaurantName}
            </span>
          </div>
          <button
            type="button"
            className="auth-dialog-close-btn"
            onClick={onClose}
            aria-label={tx("Close")}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <div className="list-select-items" style={{ display: "flex", flexDirection: "column", gap: "0.35rem", maxHeight: "260px", overflowY: "auto", margin: "0.35rem 0" }}>
          {lists.map((list) => {
            const inList = isRestaurantInList(list.id, restaurantId);
            return (
              <button
                key={list.id}
                type="button"
                onClick={() => handleToggle(list.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0.45rem 0.75rem",
                  borderRadius: "0.6rem",
                  border: `1.5px solid ${inList ? "var(--green)" : "var(--line)"}`,
                  background: inList ? "rgba(4, 120, 87, 0.06)" : "var(--bg-card)",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.15s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.55rem", minWidth: 0 }}>
                  <span style={{ fontSize: "1rem", lineHeight: 1 }}>
                    {list.id === "liked" ? "💖" : list.id === "want_to_go" ? "🔖" : "📁"}
                  </span>
                  <strong style={{ fontSize: "0.88rem", color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {tx(list.title)}
                  </strong>
                  <span style={{ fontSize: "0.75rem", color: "var(--muted)", fontWeight: 600 }}>
                    ({list.restaurantIds.length})
                  </span>
                </div>

                <div
                  style={{
                    width: "19px",
                    height: "19px",
                    borderRadius: "5px",
                    border: `1.5px solid ${inList ? "var(--green)" : "var(--line)"}`,
                    background: inList ? "var(--green)" : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#ffffff",
                    flexShrink: 0,
                  }}
                >
                  {inList && <Check size={13} strokeWidth={3} />}
                </div>
              </button>
            );
          })}
        </div>

        {/* Compact form to create new list */}
        {isCreating ? (
          <form onSubmit={handleCreateList} style={{ marginTop: "0.65rem", padding: "0.65rem", background: "var(--bg-subtle, #f8fafc)", borderRadius: "0.65rem", border: "1px solid var(--line)" }}>
            <div style={{ display: "flex", gap: "0.4rem", marginBottom: "0.45rem" }}>
              <input
                type="text"
                placeholder={tx("List title")}
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                required
                autoFocus
                style={{
                  flex: 1,
                  padding: "0.45rem 0.65rem",
                  borderRadius: "0.45rem",
                  border: "1px solid var(--line)",
                  fontSize: "0.85rem",
                  minWidth: 0,
                }}
              />
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.78rem", cursor: "pointer", color: "var(--text-secondary)" }}>
                <input
                  type="checkbox"
                  checked={newIsPublic}
                  onChange={(e) => setNewIsPublic(e.target.checked)}
                />
                <span>{tx("Make public")}</span>
              </label>
              <div style={{ display: "flex", gap: "0.4rem" }}>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setIsCreating(false)}
                  style={{ padding: "0.35rem 0.65rem", fontSize: "0.78rem" }}
                >
                  {tx("Cancel")}
                </button>
                <button
                  type="submit"
                  className="primary-button"
                  disabled={!newTitle.trim()}
                  style={{ padding: "0.35rem 0.75rem", fontSize: "0.78rem" }}
                >
                  {tx("Create")}
                </button>
              </div>
            </div>
          </form>
        ) : (
          <button
            type="button"
            className="secondary-button"
            onClick={() => setIsCreating(true)}
            style={{
              width: "100%",
              marginTop: "0.55rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.4rem",
              padding: "0.5rem",
              fontSize: "0.84rem",
              fontWeight: 700,
            }}
          >
            <Plus size={15} aria-hidden="true" />
            <span>{tx("Create new list")}</span>
          </button>
        )}
      </div>
    </div>
  );
}
