// Placeholder navigation only. Does not load evidence or calculate clinical results.
function revealEvidenceSource(hash) {
  if (!/^#source-S\d+$/.test(hash)) return;
  const card = document.getElementById(hash.slice(1));
  if (!card) return;
  card.closest('details').open = true;
  card.focus({ preventScroll: true });
  card.scrollIntoView({ block: 'start' });
}
document.querySelectorAll('.source-marker[href^="#source-"]').forEach(link => {
  link.addEventListener('click', () => revealEvidenceSource(link.hash));
});
window.addEventListener('hashchange', () => revealEvidenceSource(location.hash));
revealEvidenceSource(location.hash);
