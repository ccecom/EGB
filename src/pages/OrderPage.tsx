import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link } from "react-router-dom";
import { useOrders, type Order } from "../context/OrderContext";

const FALLBACK_IMAGE =
  "https://placehold.co/400x400/f3efe3/36543a?text=EGB+Backyard";

const money = (value: unknown) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(Number.isFinite(Number(value)) ? Number(value) : 0);

const formatDate = (value?: string) => {
  if (!value) return "Date unavailable";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : date.toLocaleString("en-PH", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
};

const normalized = (value?: string) =>
  (value || "pending").trim().toLowerCase();

function statusStep(status?: string) {
  const value = normalized(status);

  if (["delivered", "completed", "received"].includes(value)) return 4;

  if (
    ["shipped", "out for delivery", "on the way", "in transit"].includes(
      value,
    )
  ) {
    return 3;
  }

  if (
    ["processing", "accepted", "preparing", "packing", "confirmed"].includes(
      value,
    )
  ) {
    return 2;
  }

  return 1;
}

const statusLabel = (status?: string) =>
  status?.trim() || "Pending";

const isCancelled = (status?: string) =>
  ["cancelled", "canceled"].includes(normalized(status));

const isComplete = (status?: string) =>
  ["delivered", "completed", "received"].includes(normalized(status));

/**
 * Normalizes image values returned by the backend.
 * Supports URL strings, arrays of URLs, and common image-object shapes.
 */
function normalizeImageValue(value: unknown): string[] {
  if (typeof value === "string") {
    const image = value.trim();
    return image ? [image] : [];
  }

  if (Array.isArray(value)) {
    return value.flatMap(normalizeImageValue);
  }

  if (value && typeof value === "object") {
    const imageObject = value as Record<string, unknown>;

    for (const key of [
      "url",
      "src",
      "image",
      "imageUrl",
      "image_url",
      "path",
    ]) {
      const result = normalizeImageValue(imageObject[key]);

      if (result.length) return result;
    }
  }

  return [];
}

/**
 * Extracts image URLs from cart/order product data.
 * The first usable URL is used for the order item thumbnail.
 */
function getOrderItemImage(item: any): string {
  const candidates = [
    item?.image,
    item?.imageUrl,
    item?.image_url,
    item?.img,
    item?.images,
    item?.product_image,
    item?.productImage,
    item?.thumbnail,
    item?.product?.image,
    item?.product?.imageUrl,
    item?.product?.image_url,
    item?.product?.images,
  ];

  for (const candidate of candidates) {
    const images = normalizeImageValue(candidate);

    if (images.length) return images[0];
  }

  return "";
}

const styles = `
.orders-page{--forest:#254c35;--forest-dark:#183624;--leaf:#54744d;--cream:#f7f3e8;--paper:#fffdf7;--ochre:#d98b3a;--line:#e6dfce;min-height:100vh;background:var(--cream);color:#26352a;padding:112px 18px 64px;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
.orders-page *{box-sizing:border-box}
.orders-wrap{max-width:980px;margin:0 auto}
.farm-banner{background:linear-gradient(125deg,#1d422d,#315d3e);color:#fffaf0;border-radius:28px;padding:28px 30px;margin-bottom:26px;position:relative;overflow:hidden;box-shadow:0 12px 28px #274a321c}
.farm-banner:after{content:"";position:absolute;width:190px;height:190px;border:1px solid #ffffff28;border-radius:50%;right:-40px;top:-70px;box-shadow:0 0 0 20px #ffffff0b,0 0 0 40px #ffffff08;pointer-events:none}
.farm-kicker{font-size:11px;letter-spacing:.19em;font-weight:900;text-transform:uppercase;color:#e8bd7e;margin-bottom:10px}
.farm-title{font-family:Georgia,"Times New Roman",serif;font-size:clamp(32px,6vw,48px);line-height:1.05;font-weight:800;margin:0}
.farm-subtitle{color:#e4e9df;margin:12px 0 0;font-size:15px;max-width:560px;line-height:1.6}
.farm-header-row{display:flex;align-items:center;justify-content:space-between;gap:16px;position:relative;z-index:1}
.farm-rooster{font-size:54px;line-height:1;filter:drop-shadow(0 4px 5px #0002)}
.farm-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:22px 0}
.farm-counts{display:flex;flex-wrap:wrap;gap:8px}
.farm-pill{display:inline-flex;align-items:center;gap:7px;border:1px solid #d9dfd2;background:#fbfaf4;border-radius:999px;padding:9px 13px;font-size:12px;font-weight:800;color:#415d43}
.farm-button{display:inline-flex;align-items:center;justify-content:center;border:0;border-radius:13px;background:var(--forest);color:white;padding:12px 17px;font-size:13px;font-weight:800;cursor:pointer;transition:transform .15s,background .15s;box-shadow:0 4px 10px #1d422d20}
.farm-button:hover{background:var(--forest-dark);transform:translateY(-1px)}
.farm-button:disabled{opacity:.6;cursor:wait;transform:none}
.farm-alert{border-radius:14px;padding:13px 15px;margin:14px 0;font-size:13px;font-weight:650;line-height:1.6}
.farm-alert-error{background:#fff0ec;border:1px solid #f0c8bd;color:#8b3327}
.farm-alert-success{background:#edf6e9;border:1px solid #cfdfc5;color:#315d36}
.farm-empty{padding:42px 22px;background:var(--paper);border:1px dashed #d9ceb7;border-radius:24px;text-align:center}
.farm-empty-icon{font-size:48px;margin-bottom:12px}
.farm-empty h2{font:800 25px Georgia,serif;margin:0 0 8px;color:var(--forest)}
.farm-empty p{color:#738071;line-height:1.6;margin:0 auto 22px;max-width:420px}
.farm-order{background:var(--paper);border:1px solid var(--line);border-radius:24px;margin:18px 0;overflow:hidden;box-shadow:0 7px 22px #44391d0a}
.farm-order-top{padding:22px 24px;background:linear-gradient(110deg,#fffdf7,#f4f0e3);border-bottom:1px solid var(--line)}
.farm-order-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap}
.farm-label{font-size:10px;text-transform:uppercase;letter-spacing:.13em;font-weight:900;color:#899080}
.farm-order-number{font-size:17px;font-weight:900;color:var(--forest);overflow-wrap:anywhere;margin:5px 0}
.farm-date{font-size:12px;color:#7d8478}
.farm-total{text-align:right}
.farm-total strong{display:block;color:var(--forest);font-size:26px;line-height:1.2;margin-top:4px}
.farm-status{display:inline-flex;align-items:center;gap:6px;padding:7px 10px;border-radius:999px;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.07em;background:#e9f1e5;color:#315d36;border:1px solid #d1dfc8;margin-top:10px}
.farm-status.cancelled{background:#fff0ec;color:#9a3a2c;border-color:#f1c8bf}
.farm-tracking{padding:20px 24px 22px;border-bottom:1px solid #eee8da}
.farm-track-title{font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#738071;font-weight:900;margin-bottom:15px}
.farm-steps{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px}
.farm-step{text-align:center;color:#a1a596;font-size:10px;font-weight:800}
.farm-step-dot{width:26px;height:26px;border-radius:50%;display:grid;place-items:center;margin:0 auto 7px;background:#ece9df;border:2px solid #e0dacb;color:#8b8f80}
.farm-step.done{color:var(--forest)}
.farm-step.done .farm-step-dot{background:var(--forest);border-color:var(--forest);color:white}
.farm-progress{height:5px;background:#e9e4d8;border-radius:99px;overflow:hidden;margin:0 10% 17px}
.farm-progress-fill{height:100%;background:linear-gradient(90deg,#54744d,#d98b3a);border-radius:99px;transition:width .35s}
.farm-note{margin-top:16px;padding:13px 15px;background:#f6f0df;border:1px solid #ead8b5;border-radius:13px;font-size:13px;line-height:1.5;color:#645237}
.farm-details{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);gap:20px;padding:22px 24px}
.farm-section-title{font-size:11px;text-transform:uppercase;letter-spacing:.12em;color:#6c7969;font-weight:900;margin:0 0 13px}
.farm-item{display:flex;align-items:center;gap:12px;padding:11px 0;border-bottom:1px solid #eee9dd}
.farm-item:last-child{border-bottom:0}
.farm-item-image{width:58px;height:58px;flex-shrink:0;border-radius:13px;overflow:hidden;background:#eee9dc;border:1px solid #e5ddca;display:grid;place-items:center;color:#8b8c7c;font-size:22px}
.farm-item-image img{display:block;width:100%;height:100%;object-fit:cover}
.farm-item-name{font-size:13px;font-weight:850;color:#344536;line-height:1.4;overflow-wrap:anywhere}
.farm-item-meta{font-size:11px;color:#7d8478;margin-top:3px}
.farm-item-price{font-size:12px;font-weight:900;color:var(--forest);margin-top:5px}
.farm-shipping{background:#f5f2e8;border:1px solid #e8e0ce;border-radius:17px;padding:17px}
.farm-shipping p{margin:4px 0;font-size:12px;line-height:1.5;color:#5e6a5d;overflow-wrap:anywhere}
.farm-shipping .farm-recipient{font-size:14px;font-weight:900;color:#2f4934}
.farm-shipping .farm-landmark{margin-top:12px;padding:10px;background:#fffaf0;border-radius:10px;color:#765b32}
.farm-order-actions{padding:0 24px 22px;display:flex;justify-content:flex-end}
.farm-cancel{border:1px solid #e7bdb2;background:#fff4f0;color:#9b3b2c;border-radius:11px;padding:10px 14px;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.06em;cursor:pointer}
.farm-cancel:hover{background:#ffe8e0}
.farm-cancel:disabled{opacity:.6;cursor:wait}
.farm-completed-title{font:800 24px Georgia,serif;color:var(--forest);margin:35px 0 12px}
.farm-completed{border:1px solid var(--line);background:var(--paper);border-radius:20px;overflow:hidden}
.farm-completed-row{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:17px 20px;border-bottom:1px solid #eee8da}
.farm-completed-row:last-child{border-bottom:0}
.farm-completed-row strong{color:var(--forest);font-size:13px}
.farm-completed-row small{display:block;color:#828779;margin-top:5px}
.farm-completed-total{font-weight:900;color:var(--forest);white-space:nowrap}
.farm-modal-backdrop{position:fixed;inset:0;z-index:1000;background:#15261dc9;backdrop-filter:blur(4px);display:grid;place-items:center;padding:18px}
.farm-modal{max-width:420px;width:100%;background:#fffdf7;border:1px solid var(--line);border-radius:24px;padding:27px;box-shadow:0 25px 70px #0003}
.farm-modal h2{font:800 26px Georgia,serif;color:var(--forest);margin:0 0 10px}
.farm-modal p{font-size:14px;color:#687365;line-height:1.6}
.farm-modal-actions{display:flex;gap:10px;margin-top:22px}
.farm-secondary,.farm-confirm{flex:1;border-radius:12px;padding:12px;font-weight:800;cursor:pointer}
.farm-secondary{border:1px solid #dcd7c9;background:#f5f1e7;color:#495448}
.farm-confirm{border:0;background:#a84332;color:white}
.farm-confirm:disabled{opacity:.6;cursor:wait}
.farm-footer-note{font-size:11px;color:#8a8d7f;text-align:center;margin-top:24px}
@media(max-width:640px){
  .orders-page{padding:95px 12px 42px}
  .farm-banner{padding:23px 20px;border-radius:22px}
  .farm-rooster{font-size:40px}
  .farm-toolbar{align-items:stretch;flex-direction:column}
  .farm-button{width:100%}
  .farm-order-top,.farm-tracking{padding:18px}
  .farm-details{grid-template-columns:1fr;padding:18px;gap:16px}
  .farm-total{text-align:left}
  .farm-total strong{font-size:23px}
  .farm-order-actions{padding:0 18px 18px}
  .farm-steps{gap:2px}
  .farm-step{font-size:9px}
  .farm-completed-row{padding:15px 13px}
  .farm-completed-total{font-size:13px}
  .farm-modal-actions{flex-direction:column}
}
`;

type ShippingDetails = {
  fullName: string;
  mobileNumber: string;
  street: string;
  barangay: string;
  city: string;
  region: string;
  zipCode: string;
  country: string;
  landmark: string;
};

function shippingDetails(order: any): ShippingDetails {
  const shipping =
    order.shippingAddress ||
    order.shipping_address ||
    order.shipping ||
    {};

  return {
    fullName:
      order.shipping_full_name ||
      shipping.fullName ||
      shipping.full_name ||
      shipping.name ||
      "Recipient not provided",
    mobileNumber:
      order.shipping_mobile_number ||
      shipping.mobileNumber ||
      shipping.mobile_number ||
      shipping.phone ||
      "",
    street:
      order.shipping_street ||
      shipping.street ||
      shipping.address ||
      shipping.address_line ||
      "Address not provided",
    barangay: order.shipping_barangay || shipping.barangay || "",
    city: order.shipping_city || shipping.city || "",
    region:
      order.shipping_region ||
      shipping.region ||
      shipping.province ||
      "",
    zipCode:
      order.shipping_zip_code ||
      shipping.zipCode ||
      shipping.zip_code ||
      shipping.postal_code ||
      "",
    country: order.shipping_country || shipping.country || "Philippines",
    landmark: order.shipping_landmark || shipping.landmark || "",
  };
}

const OrdersPage: React.FC = () => {
  const {
    orders = [],
    cancelOrder,
    fetchUserOrders,
    isLoading,
    error,
    clearError,
  } = useOrders();

  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [confirmOrder, setConfirmOrder] = useState<Order | null>(null);

  const toastTimerRef = useRef<number | null>(null);

  const showToast = useCallback(
    (message: string, type: "success" | "error") => {
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }

      setToast({ message, type });

      toastTimerRef.current = window.setTimeout(() => {
        setToast(null);
        toastTimerRef.current = null;
      }, 3500);
    },
    [],
  );

  useEffect(
    () => () => {
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
    },
    [],
  );

  const refresh = useCallback(async () => {
    if (isSyncing) return;

    setIsSyncing(true);
    clearError();

    try {
      await fetchUserOrders();
      showToast("Order status refresh completed.", "success");
    } catch (err) {
      showToast(
        err instanceof Error
          ? err.message
          : "Could not refresh orders. Please try again shortly.",
        "error",
      );
    } finally {
      setIsSyncing(false);
    }
  }, [fetchUserOrders, clearError, showToast, isSyncing]);

  const activeOrders = useMemo(
    () => orders.filter((order) => !isComplete(order.status)),
    [orders],
  );

  const completedOrders = useMemo(
    () => orders.filter((order) => isComplete(order.status)),
    [orders],
  );

  const confirmCancellation = async () => {
    if (!confirmOrder || cancellingId) return;

    const id = String(confirmOrder._id || confirmOrder.id || "");

    if (!id || id.startsWith("order-")) {
      showToast(
        "This order has no valid ID and cannot be cancelled here.",
        "error",
      );
      setConfirmOrder(null);
      return;
    }

    setCancellingId(id);

    try {
      await cancelOrder(id, id);
      showToast("Order cancellation request completed.", "success");
      await fetchUserOrders();
    } catch (err) {
      showToast(
        err instanceof Error
          ? err.message
          : "Could not cancel this order.",
        "error",
      );
    } finally {
      setCancellingId(null);
      setConfirmOrder(null);
    }
  };

  const renderOrder = (order: Order, index: number) => {
    const rawId = order._id || order.id;
    const id = String(rawId || `order-${index}`);
    const number =
      order.order_number || `EGB-${id.slice(-6).toUpperCase()}`;
    const status = statusLabel(order.status);
    const step = statusStep(order.status);
    const cancelled = isCancelled(order.status);
    const address = shippingDetails(order);
    const items = Array.isArray(order.items) ? order.items : [];

    const orderDate =
      order.created_at || order.date || (order as any).createdAt;

    const estimated =
      order.estimated_delivery || (order as any).estimatedDelivery;

    const note = (order as any).notes || (order as any).admin_note;

    const canCancel = [
      "pending",
      "processing",
      "accepted",
      "unpaid",
      "on hold",
    ].includes(normalized(order.status));

    return (
      <article className="farm-order" key={id}>
        <div className="farm-order-top">
          <div className="farm-order-heading">
            <div>
              <div className="farm-label">Order reference</div>
              <div className="farm-order-number">#{number}</div>
              <div className="farm-date">Placed {formatDate(orderDate)}</div>
            </div>

            <div className="farm-total">
              <div className="farm-label">Order total</div>
              <strong>{money(order.total_amount ?? order.total)}</strong>
            </div>
          </div>

          <span className={`farm-status ${cancelled ? "cancelled" : ""}`}>
            {cancelled ? "✕" : "●"} {status}
          </span>
        </div>

        {!cancelled && (
          <div className="farm-tracking">
            <div className="farm-track-title">
              🐓 Farm-to-door order journey
            </div>

            <div className="farm-progress">
              <div
                className="farm-progress-fill"
                style={{ width: `${(step / 4) * 100}%` }}
              />
            </div>

            <div className="farm-steps">
              {["Received", "Preparing", "On the way", "Delivered"].map(
                (label, index) => (
                  <div
                    key={label}
                    className={`farm-step ${step >= index + 1 ? "done" : ""}`}
                  >
                    <div className="farm-step-dot">
                      {step >= index + 1 ? "✓" : index + 1}
                    </div>
                    {label}
                  </div>
                ),
              )}
            </div>

            {(estimated || note) && step < 4 && (
              <div className="farm-note">
                {estimated && (
                  <div>
                    <strong>Estimated arrival:</strong> {String(estimated)}
                  </div>
                )}
                {note && (
                  <div>
                    <strong>Farm update:</strong> {String(note)}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {cancelled && (
          <div className="farm-tracking">
            <div
              className="farm-alert farm-alert-error"
              style={{ margin: 0 }}
            >
              This order is cancelled. If you believe this is a mistake,
              please contact the farm team.
            </div>
          </div>
        )}

        <div className="farm-details">
          <section>
            <h3 className="farm-section-title">
              🧺 Items in this order · {items.length}
            </h3>

            {items.length ? (
              items.map((item: any, itemIndex: number) => {
                const itemImage = getOrderItemImage(item);
                const key =
                  item.id || item.product_id || item._id || itemIndex;

                const quantity = Number(item.quantity) || 0;
                const price = Number(item.price) || 0;

                return (
                  <div className="farm-item" key={key}>
                    <div className="farm-item-image">
                      <img
                        src={itemImage || FALLBACK_IMAGE}
                        alt={item.name || "Ordered farm product"}
                        loading="lazy"
                        decoding="async"
                        onError={(event) => {
                          const image = event.currentTarget;

                          if (image.dataset.fallbackApplied === "true") {
                            image.style.visibility = "hidden";
                            return;
                          }

                          image.dataset.fallbackApplied = "true";
                          image.src = FALLBACK_IMAGE;
                        }}
                      />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="farm-item-name">
                        {item.name || item.product_name || "Farm product"}
                      </div>

                      {item.variant && (
                        <div className="farm-item-meta">{item.variant}</div>
                      )}

                      <div className="farm-item-meta">
                        Qty: {quantity} · {money(price)} each
                      </div>

                      <div className="farm-item-price">
                        {money(price * quantity)}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p style={{ fontSize: 12, color: "#7d8478" }}>
                Item details are not available for this order.
              </p>
            )}

            <div
              style={{
                marginTop: 14,
                fontSize: 11,
                color: "#798172",
                lineHeight: 1.7,
              }}
            >
              <div>
                <strong>Payment:</strong>{" "}
                {String(order.payment_method || "Cash on Delivery").replace(
                  /_/g,
                  " ",
                )}
              </div>
              <div>
                <strong>Payment status:</strong>{" "}
                {(order as any).payment_status || "Pending"}
              </div>
            </div>
          </section>

          <section className="farm-shipping">
            <h3 className="farm-section-title">📍 Delivery details</h3>
            <p className="farm-recipient">{address.fullName}</p>

            {address.mobileNumber && <p>{address.mobileNumber}</p>}
            <p>{address.street}</p>
            {address.barangay && <p>Brgy. {address.barangay}</p>}

            <p>
              {[address.city, address.region, address.zipCode]
                .filter(Boolean)
                .join(", ")}
            </p>

            <p>{address.country}</p>

            {address.landmark && (
              <p className="farm-landmark">
                <strong>Landmark:</strong> {address.landmark}
              </p>
            )}
          </section>
        </div>

        {canCancel && !cancelled && (
          <div className="farm-order-actions">
            <button
              type="button"
              className="farm-cancel"
              onClick={() => setConfirmOrder(order)}
              disabled={cancellingId === id}
            >
              {cancellingId === id ? "Processing…" : "Cancel order"}
            </button>
          </div>
        )}

        {cancellingId === id && (
          <div
            style={{
              padding: "0 24px 20px",
              color: "#54744d",
              fontSize: 12,
              fontWeight: 800,
            }}
          >
            Sending cancellation request…
          </div>
        )}
      </article>
    );
  };

  return (
    <main className="orders-page">
      <style>{styles}</style>

      <div className="orders-wrap">
        <header className="farm-banner">
          <div className="farm-header-row">
            <div>
              <div className="farm-kicker">
                EGB Backyard · Our little farm
              </div>
              <h1 className="farm-title">Your Farm Orders</h1>
              <p className="farm-subtitle">
                From our backyard to your home. Follow each order’s journey
                and see the latest farm updates here.
              </p>
            </div>
            <div className="farm-rooster" aria-hidden="true">
              🐓
            </div>
          </div>
        </header>

        <div className="farm-toolbar">
          <div className="farm-counts">
            <span className="farm-pill">🌱 {activeOrders.length} active</span>
            <span className="farm-pill">
              ✓ {completedOrders.length} completed
            </span>
          </div>

          <button
            type="button"
            className="farm-button"
            onClick={() => void refresh()}
            disabled={isSyncing || isLoading}
          >
            {isSyncing || isLoading
              ? "↻ Checking orders…"
              : "↻ Refresh order status"}
          </button>
        </div>

        {toast && (
          <div
            role="status"
            aria-live="polite"
            className={`farm-alert ${
              toast.type === "success"
                ? "farm-alert-success"
                : "farm-alert-error"
            }`}
          >
            {toast.message}
          </div>
        )}

        {error && (
          <div role="alert" className="farm-alert farm-alert-error">
            <strong>We couldn’t load the latest order information.</strong>
            <br />
            {error} Your existing order details remain visible. Check that
            the backend API is running and responding, then retry.
            <div style={{ marginTop: 10 }}>
              <button
                type="button"
                className="farm-button"
                onClick={() => void refresh()}
                disabled={isSyncing || isLoading}
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {orders.length === 0 ? (
          <div className="farm-empty">
            <div className="farm-empty-icon">🐓</div>
            <h2>
              {isLoading || isSyncing
                ? "Checking the farm ledger…"
                : "No orders to show yet"}
            </h2>
            <p>
              {isLoading || isSyncing
                ? "We’re asking the farm system for your latest order details."
                : error
                  ? "Your order history could not be confirmed because the server did not respond successfully."
                  : "When you place an order, it will appear here so you can follow its journey."}
            </p>

            {!isLoading && !isSyncing && (
              <Link
                to="/shop"
                className="farm-button"
                style={{ textDecoration: "none" }}
              >
                Browse farm products
              </Link>
            )}
          </div>
        ) : (
          <>
            {activeOrders.length > 0 ? (
              activeOrders.map(renderOrder)
            ) : (
              <div className="farm-empty">
                <div className="farm-empty-icon">🌾</div>
                <h2>All caught up!</h2>
                <p>You have no active orders at the moment.</p>
              </div>
            )}

            {completedOrders.length > 0 && (
              <>
                <h2 className="farm-completed-title">
                  Harvested & delivered · {completedOrders.length}
                </h2>

                <div className="farm-completed">
                  {completedOrders.map((order, index) => {
                    const id = String(
                      order._id || order.id || `completed-${index}`,
                    );

                    const number =
                      order.order_number ||
                      `EGB-${id.slice(-6).toUpperCase()}`;

                    const count = Array.isArray(order.items)
                      ? order.items.length
                      : 0;

                    return (
                      <div className="farm-completed-row" key={id}>
                        <div>
                          <strong>✓ #{number}</strong>
                          <small>
                            {formatDate(
                              order.created_at ||
                                order.date ||
                                (order as any).createdAt,
                            )}{" "}
                            · {count} item{count === 1 ? "" : "s"}
                          </small>
                        </div>
                        <div className="farm-completed-total">
                          {money(order.total_amount ?? order.total)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}

        <p className="farm-footer-note">
          EGB Backyard · Thank you for supporting our little farm 🧡
        </p>
      </div>

      {confirmOrder && (
        <div
          className="farm-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !cancellingId) {
              setConfirmOrder(null);
            }
          }}
        >
          <section
            className="farm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-order-title"
          >
            <div style={{ fontSize: 36, marginBottom: 8 }}>🐓</div>
            <h2 id="cancel-order-title">Cancel this order?</h2>
            <p>
              Are you sure you want to cancel{" "}
              <strong>
                #
                {confirmOrder.order_number ||
                  String(confirmOrder._id || confirmOrder.id || "")
                    .slice(-6)
                    .toUpperCase()}
              </strong>
              ? This will send a cancellation request to the farm system.
            </p>

            <div className="farm-modal-actions">
              <button
                type="button"
                className="farm-secondary"
                onClick={() => setConfirmOrder(null)}
                disabled={Boolean(cancellingId)}
              >
                Keep order
              </button>

              <button
                type="button"
                className="farm-confirm"
                onClick={() => void confirmCancellation()}
                disabled={Boolean(cancellingId)}
              >
                {cancellingId ? "Sending request…" : "Confirm cancellation"}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
};

export default OrdersPage;