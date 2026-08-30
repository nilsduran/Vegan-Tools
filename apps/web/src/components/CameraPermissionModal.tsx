import { useState } from "react";
import { Camera, CameraOff, ChevronRight, HelpCircle, RefreshCw, Smartphone, Upload, X } from "lucide-react";
import { tx, useLanguage } from "../i18n";

export interface CameraPermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRetry: () => void;
  onNativeCapture?: (file: File) => void;
  errorName?: string;
}

export function CameraPermissionModal({
  isOpen,
  onClose,
  onRetry,
  onNativeCapture,
  errorName,
}: CameraPermissionModalProps) {
  const language = useLanguage();
  const [activeTab, setActiveTab] = useState<"auto" | "ios" | "android">(() => {
    if (typeof navigator === "undefined") return "auto";
    const ua = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) return "ios";
    if (/android/.test(ua)) return "android";
    return "auto";
  });

  if (!isOpen) return null;

  const isIOS = activeTab === "ios" || (activeTab === "auto" && typeof navigator !== "undefined" && /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase()));
  const isAndroid = activeTab === "android" || (activeTab === "auto" && typeof navigator !== "undefined" && /android/.test(navigator.userAgent.toLowerCase()));

  return (
    <div className="auth-dialog-backdrop" role="dialog" aria-modal="true" aria-labelledby="camera-permission-title">
      <div className="auth-dialog-content camera-permission-dialog">
        <div className="auth-dialog-header">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div className="camera-icon-badge" style={{ background: "#fee2e2", color: "#dc2626", padding: "0.4rem", borderRadius: "50%", display: "flex" }}>
              <CameraOff size={20} aria-hidden="true" />
            </div>
            <h2 id="camera-permission-title" style={{ fontSize: "1.1rem", margin: 0 }}>
              {tx("Camera permission required")}
            </h2>
          </div>
          <button
            type="button"
            className="auth-dialog-close"
            onClick={onClose}
            aria-label={tx("Close")}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="camera-permission-body" style={{ marginTop: "0.8rem" }}>
          <p style={{ fontSize: "0.88rem", color: "#475569", lineHeight: "1.45", margin: "0 0 1rem 0" }}>
            {tx("To scan barcodes and photograph ingredient labels in real time, your browser needs permission to access the camera.")}
          </p>

          {/* Device Tabs */}
          <div className="auth-mode-tabs" style={{ marginBottom: "1rem" }}>
            <button
              type="button"
              className={isIOS ? "active" : ""}
              onClick={() => setActiveTab("ios")}
            >
              iPhone (Safari)
            </button>
            <button
              type="button"
              className={isAndroid ? "active" : ""}
              onClick={() => setActiveTab("android")}
            >
              Android (Chrome)
            </button>
            <button
              type="button"
              className={!isIOS && !isAndroid ? "active" : ""}
              onClick={() => setActiveTab("auto")}
            >
              {tx("Computer / Other")}
            </button>
          </div>

          {/* Instructions Step by Step */}
          <div className="permission-steps-card" style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "0.75rem", padding: "0.85rem 1rem", marginBottom: "1.2rem" }}>
            {isIOS ? (
              <ol style={{ margin: 0, paddingLeft: "1.2rem", fontSize: "0.84rem", color: "#334155", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <li>
                  <strong>{language === "ca" ? "Toca la icona 'aA' o ajustos" : "Tap the 'aA' or settings icon"}</strong> {language === "ca" ? "a l'esquerra de la barra d'adreces de Safari." : "on the left of the Safari address bar."}
                </li>
                <li>
                  {language === "ca" ? "Selecciona " : "Select "}<strong>{language === "ca" ? "Ajustos del lloc web" : "Website Settings"}</strong>.
                </li>
                <li>
                  {language === "ca" ? "Canvia la " : "Set "}<strong>{language === "ca" ? "Càmera" : "Camera"}</strong> {language === "ca" ? "a " : "to "}<strong>{language === "ca" ? "Permetre" : "Allow"}</strong>.
                </li>
                <li style={{ fontSize: "0.78rem", color: "#64748b" }}>
                  {language === "ca" ? "O bé ves a Ajustos de l'iPhone > Safari > Càmera." : "Or go to iPhone Settings > Safari > Camera."}
                </li>
              </ol>
            ) : isAndroid ? (
              <ol style={{ margin: 0, paddingLeft: "1.2rem", fontSize: "0.84rem", color: "#334155", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <li>
                  <strong>{language === "ca" ? "Toca la icona de cadenat o controls" : "Tap the lock or tune icon"}</strong> {language === "ca" ? "al costat de la barra d'adreces a Chrome." : "next to the address bar in Chrome."}
                </li>
                <li>
                  {language === "ca" ? "Entra a " : "Open "}<strong>{language === "ca" ? "Permisos" : "Permissions"}</strong>.
                </li>
                <li>
                  {language === "ca" ? "Activa l'interruptor de la " : "Enable "}<strong>{language === "ca" ? "Càmera" : "Camera"}</strong>.
                </li>
              </ol>
            ) : (
              <ol style={{ margin: 0, paddingLeft: "1.2rem", fontSize: "0.84rem", color: "#334155", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <li>
                  {language === "ca" ? "Fes clic a la icona de cadenat a l'esquerra de la URL." : "Click the lock icon to the left of the URL."}
                </li>
                <li>
                  {language === "ca" ? "Activa el permís de càmera i recarrega la pàgina si és necessari." : "Enable camera permission and reload the page if required."}
                </li>
              </ol>
            )}
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            <button
              type="button"
              className="primary-button"
              style={{ width: "100%", justifyContent: "center", gap: "0.5rem", padding: "0.75rem" }}
              onClick={() => {
                onRetry();
                onClose();
              }}
            >
              <RefreshCw size={16} aria-hidden="true" />
              <span>{language === "ca" ? "Ja he donat permís / Reintentar" : "I enabled it / Retry"}</span>
            </button>

            {onNativeCapture && (
              <label
                className="secondary-button"
                style={{
                  width: "100%",
                  justifyContent: "center",
                  gap: "0.5rem",
                  padding: "0.75rem",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  margin: 0,
                  boxSizing: "border-box",
                }}
              >
                <Camera size={16} aria-hidden="true" />
                <span>{language === "ca" ? "Fes una foto nativa (sense permisos de navegador)" : "Take photo with native camera"}</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      onNativeCapture(file);
                      onClose();
                    }
                    e.target.value = "";
                  }}
                />
              </label>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
