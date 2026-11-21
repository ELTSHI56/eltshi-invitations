// Page d'invitation rendue côté serveur pour que WhatsApp, Facebook, Telegram…
// affichent la photo du couple, le titre et la description dans l'aperçu du lien.
const SB_URL = "https://vtizxpfxsozbotvkjsrg.supabase.co";
const SB_CLE = "sb_publishable_kPpkOa8UqHiuaSqsF6GqGQ_36GJcKt8";
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const https = u => (/^https:\/\//.test(u || "") ? u : "");

module.exports = async (req, res) => {
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const base = `https://${host}`;
  const slug = String((req.query && req.query.slug) || "").toLowerCase();
  let ev = null;
  try {
    const r = await fetch(`${SB_URL}/rest/v1/rpc/config_evenement`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: SB_CLE, Authorization: "Bearer " + SB_CLE },
      body: JSON.stringify({ p_slug: slug }),
    });
    if (r.ok) ev = await r.json();
  } catch (e) {}

  // Ancienne adresse : redirection permanente vers la nouvelle (la clé du lien officiel est conservée)
  if (ev && ev.slug && ev.slug !== slug) {
    res.statusCode = 301;
    const k = String((req.query && req.query.k) || "");
    res.setHeader("Location", `/${ev.slug}` + (/^[0-9a-f]{6,40}$/.test(k) ? `?k=${k}` : ""));
    return res.end();
  }

  let html;
  try { html = await (await fetch(`${base}/invitation.html`)).text(); }
  catch (e) { res.statusCode = 302; res.setHeader("Location", `/invitation.html?e=${encodeURIComponent(slug)}`); return res.end(); }

  const c = (ev && ev.config) || {};
  const g = (p) => p.split(".").reduce((a, k) => (a && a[k] != null ? a[k] : undefined), c);
  const noms = [g("couple.prenom1"), g("couple.prenom2")].filter(Boolean).join(" & ");
  const titre = g("partage.titre") || g("meta.titreOnglet") || (noms ? `${noms} — Invitation` : "Invitation digitale");
  const desc = g("partage.description") || g("meta.description") || g("couverture.citation") || "Découvrez notre invitation et confirmez votre présence.";
  const img = https(g("partage.image")) || https(g("couverture.photo")) || https(g("presentation.photo"));
  const url = `${base}/${ev ? ev.slug : slug}`;
  const meta = `<title>${esc(titre)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${esc(url)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="EL TSHI DIGIT — Invitations digitales">
<meta property="og:url" content="${esc(url)}">
<meta property="og:title" content="${esc(titre)}">
<meta property="og:description" content="${esc(desc)}">
${img ? `<meta property="og:image" content="${esc(img)}">
<meta property="og:image:secure_url" content="${esc(img)}">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:alt" content="${esc(noms || titre)}">
<meta name="twitter:image" content="${esc(img)}">` : ""}
${img && g("partage.image") ? '<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">' : ""}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(titre)}">
<meta name="twitter:description" content="${esc(desc)}">`;
  html = html.replace(/<!--OG-->[\s\S]*?<!--\/OG-->/, () => meta);
  res.statusCode = ev ? 200 : 404;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=0, s-maxage=60, stale-while-revalidate=300");
  res.end(html);
};
