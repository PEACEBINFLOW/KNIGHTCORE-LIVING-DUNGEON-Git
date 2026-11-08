// tools/lib/patterns.js

// Tolerant regexes to find the stylesheet link and module script in index.html.
// Handles single/double quotes, arbitrary attribute order, and optional './'.
export const CSS_LINK_RE = /<link\s+(?=[^>]*rel=["']stylesheet["'])(?=[^>]*href=["'](?:\.\/)?render\/theme\.css["'])[^>]*>/i;
export const JS_SCRIPT_RE = /<script\s+(?=[^>]*type=["']module["'])(?=[^>]*src=["'](?:\.\/)?main\.js["'])[^>]*>\s*<\/script>/i;
