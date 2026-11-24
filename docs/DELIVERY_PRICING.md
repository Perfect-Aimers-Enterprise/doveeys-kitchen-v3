# Delivery pricing

Decided only by `quoteDelivery` on the server. Precedence: free-delivery threshold (subtotal >= threshold gives 0), then the chosen zone fee, then the default fee. If any **active** delivery area exists, the customer must choose one (`DELIVERY_ZONE_REQUIRED`). The fee charged and zone name are copied onto the order, so later changes never alter history. Owners manage the default fee, threshold, instructions and areas under Settings > Delivery.
