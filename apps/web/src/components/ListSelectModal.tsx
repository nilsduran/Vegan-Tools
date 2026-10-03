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
  const [newDescription, setNewDescription] = useState("");
  const [newIsPublic, setNewIsPublic] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLists(loadUserLists());
      setIsCreating(false);
      setNewTitle("");
      setNewDescription("");
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
    const created = createCustomList(newTitle, newDescription, newIsPublic);
    toggleRestaurantInList(created.id, restaurantId);
    setLists(loadUserLists());
    setIsCreating(false);
    setNewTitle("");
    setNewDescription("");
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
        style={{ maxWidth: "460px", width: "92%" }}
      >
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "1rem",
            paddingBottom: "0.75rem",
            borderBottom: "1px solid var(--line)",
          }}
        >
          <div>
            <h3 id="list-modal-title" style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800 }}>
              {tx("Add to list")}
            </h3>
            <span style={{ fontSize: "0.82rem", color: "var(--muted)", fontWeight: 600 }}>
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

        <div className="list-select-items" style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: "280px", overflowY: "auto", margin: "0.5rem 0" }}>
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
                  padding: "0.75rem 1rem",
                  borderRadius: "0.75rem",
                  border: `1.5px solid ${inList ? "var(--green)" : "var(--line)"}`,
                  background: inList ? "rgba(4, 120, 87, 0.06)" : "var(--bg-card)",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.15s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <span style={{ fontSize: "1.2rem" }}>
                    {list.id === "liked" ? "💖" : list.id === "want_to_go" ? "🔖" : "📁"}
                  </span>
                  <div>
                    <strong style={{ display: "block", fontSize: "0.95rem", color: "var(--text-primary)" }}>
                      {tx(list.title)}
                    </strong>
                    {list.description ? (
                      <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>{list.description}</span>
                    ) : null}
                  </div>
                </div>

                <div
                  style={{
                    width: "22px",
                    height: "22px",
                    borderRadius: "6px",
                    border: `2px solid ${inList ? "var(--green)" : "var(--line)"}`,
                    background: inList ? "var(--green)" : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#ffffff",
                  }}
                >
                  {inList && <Check size={14} strokeWidth={3} />}
                </div>
              </button>
            );
          })}
        </div>

        {/* Form to create new list */}
        {isCreating ? (
          <form onSubmit={handleCreateList} style={{ marginTop: "1rem", padding: "0.85rem", background: "#f8fafc", borderRadius: "0.75rem", border: "1px solid var(--line)" }}>
            <h4 style={{ margin: "0 0 0.6rem", fontSize: "0.95rem", fontWeight: 700 }}>
              {tx("Create new list")}
            </h4>
            <input
              type="text"
              placeholder={tx("List title")}
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              required
              autoFocus
              style={{
                width: "100%",
                padding: "0.55rem 0.75rem",
                borderRadius: "0.5rem",
                border: "1px solid var(--line)",
                marginBottom: "0.5rem",
                fontSize: "0.88rem",
                boxSizing: "border-box",
              }}
            />
            <input
              type="text"
              placeholder={tx("Description (optional)")}
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              style={{
                width: "100%",
                padding: "0.55rem 0.75rem",
                borderRadius: "0.5rem",
                border: "1px solid var(--line)",
                marginBottom: "0.75rem",
                fontSize: "0.88rem",
                boxSizing: "border-box",
              }}
            />
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.82rem", marginBottom: "0.75rem", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={newIsPublic}
                onChange={(e) => setNewIsPublic(e.target.checked)}
              />
              <span>{tx("Make public")}</span>
            </label>
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setIsCreating(false)}
                style={{ padding: "0.4rem 0.75rem", fontSize: "0.82rem" }}
              >
                {tx("Cancel")}
              </button>
              <button
                type="submit"
                className="primary-button"
                disabled={!newTitle.trim()}
                style={{ padding: "0.4rem 0.85rem", fontSize: "0.82rem" }}
              >
                {tx("Create")}
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            className="secondary-button"
            onClick={() => setIsCreating(true)}
            style={{
              width: "100%",
              marginTop: "0.75rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.45rem",
              padding: "0.6rem",
              fontSize: "0.88rem",
              fontWeight: 700,
            }}
          >
            <Plus size={16} aria-hidden="true" />
            <span>{tx("Create new list")}</span>
          </button>
        )}
      </div>
    </div>
  );
}
