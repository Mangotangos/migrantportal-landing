// Cloudflare Pages Functions middleware: return 410 Gone for spam URLs left over from the
// domain's previous life, so Google drops them faster than a plain 404 and stops treating
// "/?anything" as a duplicate homepage (Search Console, Nov 2026: 2,889 404s + 927 crawled-not-indexed).
//
// Deliberately a narrow pattern list, NOT a query-param allowlist: real links carry many params
// (?id=, ?invite=, ?next=, ?lang=, utm_*, fbclid, reset tokens) and an allowlist would break one.

const SPAM_PATH = /\.phtml$/i;
// "?goods/208044972", "?jp/139012940.html", "?detail/2200341177565": first query key contains a slash.
const SPAM_QUERY_PATH = /^\?[^=&]*\//;
// "?j=diivq67kkezp446vdkmxwlfm": 1-2 letter key with a long random lowercase/digit value.
const SPAM_QUERY_RANDOM = /^\?[a-z]{1,2}=[a-z0-9]{15,}$/;

const GONE_HEADERS = {
  'Content-Type': 'text/plain; charset=utf-8',
  'Cache-Control': 'public, max-age=86400',
  'X-Robots-Tag': 'noindex',
};

function isSpam(url) {
  return (
    SPAM_PATH.test(url.pathname) ||
    SPAM_QUERY_PATH.test(url.search) ||
    SPAM_QUERY_RANDOM.test(url.search)
  );
}

export async function onRequest(context) {
  const url = new URL(context.request.url);
  if (isSpam(url)) {
    return new Response('Gone', { status: 410, headers: GONE_HEADERS });
  }
  return context.next();
}
