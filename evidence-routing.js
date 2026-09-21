/* Stable product keys supplement existing model-number mappings. */
window.EvidenceRouting = {
 path(index, product) { return product.product_key && Object.hasOwn(index.products || {}, product.product_key) ? index.products[product.product_key] : Object.hasOwn(index, product.model_number) ? index[product.model_number] : null; },
 matches(record, product) { return product.product_key ? record.product?.product_key === product.product_key && record.product?.model_number === product.model_number : record.product?.model_number === product.model_number; },
 detail(product) { return "iol-detail.html?" + (product.product_key ? "product=" + encodeURIComponent(product.product_key) : "model=" + encodeURIComponent(product.model_number)); }
};
