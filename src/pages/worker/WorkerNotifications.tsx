import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Bell, BellOff, CheckCheck, ChevronRight } from "lucide-react";
import {
  getMyNotifications, markAllNotificationsRead, markNotificationRead,
  type WorkerNotification
} from "../../services/workerService";

function NotifCard({ notif, onRead }: { notif: WorkerNotification; onRead: (id: string) => void }) {
  const typeIcon =
    notif.type === "assignment" ? "📋" :
    notif.type === "completion" ? "✅" :
    notif.type === "reminder" ? "⏰" : "🔔";

  const timeAgo = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  };

  return (
    <div
      style={{
        background: notif.is_read ? "#fff" : "#eff6ff",
        borderRadius: 12,
        padding: "0.85rem 1rem",
        border: notif.is_read ? "1px solid #e2e8f0" : "1px solid #bfdbfe",
        display: "flex",
        gap: "0.75rem",
        alignItems: "flex-start",
        transition: "all 0.2s",
      }}
    >
      <div style={{
        width: 38,
        height: 38,
        background: notif.is_read ? "#f8fafc" : "#dbeafe",
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "1.1rem",
        flexShrink: 0,
      }}>
        {typeIcon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.5rem" }}>
          <div style={{ fontWeight: notif.is_read ? 600 : 800, fontSize: "0.87rem", color: "#0f172a", lineHeight: 1.3 }}>
            {notif.title}
          </div>
          {!notif.is_read && (
            <div style={{ width: 8, height: 8, background: "#3b82f6", borderRadius: "50%", flexShrink: 0, marginTop: 4 }} />
          )}
        </div>
        <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: "0.25rem", lineHeight: 1.45 }}>
          {notif.message}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "0.5rem" }}>
          <span style={{ fontSize: "0.7rem", color: "#94a3b8" }}>
            {timeAgo(notif.created_at)}
          </span>
          <div style={{ display: "flex", gap: "0.4rem" }}>
            {!notif.is_read && (
              <button
                onClick={() => onRead(notif.id)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#0b3a6d",
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                Mark read
              </button>
            )}
            {notif.report_id && (
              <Link
                to={`/worker/task/${notif.report_id}`}
                style={{
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  color: "#0b3a6d",
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.2rem",
                }}
              >
                View Task <ChevronRight size={11} />
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WorkerNotifications() {
  const [notifications, setNotifications] = useState<WorkerNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNotifs = async () => {
    const { notifications: n } = await getMyNotifications();
    setNotifications(n);
    setLoading(false);
  };

  useEffect(() => { loadNotifs(); }, []);

  const handleMarkRead = async (id: string) => {
    await markNotificationRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead();
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const unread = notifications.filter(n => !n.is_read).length;

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "50dvh" }}>
        <div className="spinner" style={{ margin: "0 auto" }} />
      </div>
    );
  }

  return (
    <div style={{ padding: "1rem", maxWidth: 600, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "1.2rem", fontWeight: 900, color: "#0b3a6d", marginBottom: "0.15rem" }}>
            Notifications
          </h1>
          <p style={{ fontSize: "0.78rem", color: "#64748b" }}>
            {unread > 0 ? `${unread} unread` : "All caught up"}
          </p>
        </div>
        {unread > 0 && (
          <button
            onClick={handleMarkAllRead}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
              background: "#eff6ff",
              border: "1px solid #bfdbfe",
              borderRadius: 8,
              padding: "0.45rem 0.85rem",
              color: "#1e40af",
              fontSize: "0.78rem",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            <CheckCheck size={14} />
            Mark all read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div style={{
          background: "#fff",
          borderRadius: 16,
          padding: "3rem 1rem",
          textAlign: "center",
          border: "1px dashed #cbd5e1",
        }}>
          <BellOff size={44} color="#cbd5e1" style={{ marginBottom: "0.75rem" }} />
          <div style={{ fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>No notifications yet</div>
          <div style={{ color: "#94a3b8", fontSize: "0.82rem" }}>
            You'll receive notifications when complaints are assigned to you.
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
          {notifications.map(n => (
            <NotifCard key={n.id} notif={n} onRead={handleMarkRead} />
          ))}
        </div>
      )}
    </div>
  );
}
