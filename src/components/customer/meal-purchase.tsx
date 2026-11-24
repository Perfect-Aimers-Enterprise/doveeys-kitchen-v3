"use client";
import { useState } from "react";
import { Money, useCart, type Meal } from "@/components/customer/store";

/** Interactive part of the meal page. Everything search engines need is rendered on the server around it. */
export function MealPurchase({ meal }: { meal: Meal }) {
  const cart = useCart();
  const [opt, setOpt] = useState("");
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");
  const selected = meal.options.find((o) => o.id === opt);

  return (
    <div>
      {!meal.isAvailable && <div className="status" role="status">Currently unavailable</div>}
      {meal.type === "SPECIAL" && (
        <fieldset className="field" style={{ border: 0, padding: 0 }}>
          <legend style={{ marginBottom: 8 }}>Choose size</legend>
          {meal.options.map((o) => (
            <label key={o.id} style={{ display: "flex", justifyContent: "space-between", padding: 15, border: "1px solid var(--border)" }}>
              <span><input type="radio" name="litres" checked={opt === o.id} onChange={() => setOpt(o.id)} /> {o.litres} litre{o.litres === "1" ? "" : "s"}</span>
              <strong><Money value={o.price} /></strong>
            </label>
          ))}
        </fieldset>
      )}
      {meal.type === "NORMAL" && meal.price && <h2 style={{ fontSize: 32 }}><Money value={meal.price} /></h2>}
      <div className="field">
        <label htmlFor="qty">Quantity</label>
        <div style={{ display: "flex", gap: 15, alignItems: "center" }}>
          <button aria-label="Decrease quantity" onClick={() => setQty(Math.max(1, qty - 1))}>−</button>
          <span id="qty" aria-live="polite">{qty}</span>
          <button aria-label="Increase quantity" onClick={() => setQty(qty + 1)}>+</button>
        </div>
      </div>
      <button disabled={!meal.isAvailable || (meal.type === "SPECIAL" && !selected)} className="button" onClick={() => { cart.add(meal, qty, selected); setNote("Added to cart. Visit the cart to review your order."); }}>
        Add to cart
      </button>
      {note && <p className="muted" role="status">{note}</p>}
    </div>
  );
}
