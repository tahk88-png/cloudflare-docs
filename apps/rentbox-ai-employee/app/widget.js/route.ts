import { NextRequest } from "next/server";
import { allowedWidgetOrigin } from "@/lib/auth";
import { withCors } from "@/lib/http";

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get("origin");
  const res = new Response(null, { status: 204 });
  return withCors(res, allowedWidgetOrigin(origin) ? origin : null);
}

export async function GET(req: NextRequest) {
  const origin = req.headers.get("origin");
  const widgetOrigin = new URL(req.url).origin;
  const js = `
(function() {
  var script = document.currentScript;
  var bookingId = (script && script.dataset && script.dataset.bookingId) || '';
  try {
    var sp = new URLSearchParams(window.location.search);
    bookingId = bookingId || sp.get('booking_id') || sp.get('bookingId') || '';
  } catch (e) {}

  var rootId = 'rentbox-ai-widget-root';
  if (document.getElementById(rootId)) return;

  var root = document.createElement('div');
  root.id = rootId;
  root.style.position = 'fixed';
  root.style.bottom = '16px';
  root.style.right = '16px';
  root.style.zIndex = '2147483647';
  root.style.fontFamily = 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial';

  var btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = 'Chat';
  btn.style.background = '#ffffff';
  btn.style.color = '#0b1020';
  btn.style.border = '0';
  btn.style.borderRadius = '999px';
  btn.style.padding = '10px 14px';
  btn.style.boxShadow = '0 8px 24px rgba(0,0,0,.3)';
  btn.style.cursor = 'pointer';
  btn.style.fontWeight = '600';

  var panel = document.createElement('div');
  panel.style.display = 'none';
  panel.style.width = '360px';
  panel.style.height = '520px';
  panel.style.marginBottom = '10px';
  panel.style.borderRadius = '16px';
  panel.style.overflow = 'hidden';
  panel.style.border = '1px solid rgba(255,255,255,.12)';
  panel.style.boxShadow = '0 18px 48px rgba(0,0,0,.45)';
  panel.style.background = '#0b1020';

  var iframe = document.createElement('iframe');
  iframe.title = 'Rentbox Support';
  iframe.style.width = '100%';
  iframe.style.height = '100%';
  iframe.style.border = '0';
  iframe.allow = 'clipboard-write';
  iframe.referrerPolicy = 'no-referrer';
  iframe.src = '${widgetOrigin}/embed/widget?booking_id=' + encodeURIComponent(bookingId || '');
  panel.appendChild(iframe);

  btn.addEventListener('click', function() {
    var open = panel.style.display !== 'none';
    panel.style.display = open ? 'none' : 'block';
    btn.textContent = open ? 'Chat' : 'Close';
  });

  root.appendChild(panel);
  root.appendChild(btn);
  document.body.appendChild(root);
})();
`.trim();

  const res = new Response(js, {
    status: 200,
    headers: {
      "content-type": "application/javascript; charset=utf-8",
      "cache-control": "public, max-age=60"
    }
  });
  return withCors(res, allowedWidgetOrigin(origin) ? origin : null);
}

