#!/usr/bin/env bash
# Full end-to-end smoke test against a RUNNING dev server (node ace serve),
# driven entirely over plain HTTP with curl — no browser needed. Walks the
# real OIDC authorization-code + PKCE flow (signup -> consent -> callback),
# then exercises every authorization boundary this example demonstrates:
#
#   - unauthenticated request to a protected route -> redirected to login
#   - authenticated but missing the "member" role -> 403
#   - authenticated with "member" -> 200, can create + download own file
#   - a second user, without the "manage" grant -> 403 on someone else's file
#   - the Telescope dashboard -> denied anonymous AND non-admin (401 either
#     way — see the note by step 10), 200 for ADMIN
#
# Usage: BASE_URL=http://localhost:3333 ./smoke-test.sh
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3333}"
WORKDIR="$(mktemp -d)"
trap 'rm -rf "$WORKDIR"' EXIT

pass() { echo "  PASS: $1"; }
fail() { echo "  FAIL: $1 (expected $2, got $3)"; exit 1; }
expect_code() {
  local desc="$1" expected="$2" actual="$3"
  if [ "$actual" = "$expected" ]; then pass "$desc ($actual)"; else fail "$desc" "$expected" "$actual"; fi
}

csrf_from() { grep -o "name=['\"]_csrf['\"] value=['\"][^'\"]*['\"]" "$1" | sed -E "s/.*value=['\"]//;s/['\"]$//"; }
uid_from() { grep -oP '(?<=interaction/)[A-Za-z0-9_-]+' "$1" | head -1; }

# Drives the full authorization-code + PKCE flow for one account, ending
# with an established app session in the given cookie jar.
# Args: jar, email, password, fullName ("" = existing user, skip signup)
login_flow() {
  local jar="$1" email="$2" password="$3" fullname="${4:-}"
  rm -f "$jar"

  curl -s -L -c "$jar" -b "$jar" "$BASE_URL/auth/login" -o "$WORKDIR/p1.html"
  local uid; uid="$(uid_from "$WORKDIR/p1.html")"

  if [ -n "$fullname" ]; then
    curl -s -b "$jar" -c "$jar" "$BASE_URL/auth/interaction/$uid/signup" -o "$WORKDIR/p2.html"
    local csrf; csrf="$(csrf_from "$WORKDIR/p2.html")"
    curl -s -b "$jar" -c "$jar" \
      --data-urlencode "_csrf=$csrf" \
      --data-urlencode "fullName=$fullname" \
      --data-urlencode "email=$email" \
      --data-urlencode "password=$password" \
      "$BASE_URL/auth/interaction/$uid/signup" -o /dev/null
  else
    curl -s -b "$jar" -c "$jar" "$BASE_URL/auth/interaction/$uid" -o "$WORKDIR/p2.html"
    local csrf1; csrf1="$(csrf_from "$WORKDIR/p2.html")"
    curl -s -b "$jar" -c "$jar" --data-urlencode "_csrf=$csrf1" --data-urlencode "email=$email" \
      "$BASE_URL/auth/interaction/$uid/identifier" -o /dev/null
    curl -s -b "$jar" -c "$jar" "$BASE_URL/auth/interaction/$uid" -o "$WORKDIR/p2b.html"
    local csrf2; csrf2="$(csrf_from "$WORKDIR/p2b.html")"
    curl -s -b "$jar" -c "$jar" --data-urlencode "_csrf=$csrf2" --data-urlencode "password=$password" \
      "$BASE_URL/auth/interaction/$uid/login" -o /dev/null
  fi

  # Back into /oidc/auth -> consent screen (a fresh grant every run).
  curl -s -L -c "$jar" -b "$jar" "$BASE_URL/oidc/auth/$uid" -o "$WORKDIR/p3.html"
  local uid2; uid2="$(uid_from "$WORKDIR/p3.html")"
  local csrf3; csrf3="$(csrf_from "$WORKDIR/p3.html")"
  curl -s -b "$jar" -c "$jar" --data-urlencode "_csrf=$csrf3" \
    "$BASE_URL/auth/interaction/$uid2/consent" -o /dev/null

  # -> /oidc/auth/:uid2 (303 to the callback URL) -> /auth/callback (302 to /)
  local cb_url
  cb_url="$(curl -s -o /dev/null -D - -b "$jar" -c "$jar" "$BASE_URL/oidc/auth/$uid2" | grep -i '^location:' | tr -d '\r' | awk '{print $2}')"
  curl -s -b "$jar" -c "$jar" -L "$cb_url" -o /dev/null
}

csrf_from_page() {
  local jar="$1" path="$2"
  curl -s -b "$jar" -c "$jar" "$BASE_URL$path" -o "$WORKDIR/page.html"
  csrf_from "$WORKDIR/page.html"
}

echo "== 1. unauthenticated -> /documents redirects to login =="
code="$(curl -s -o /dev/null -w '%{http_code}' "$BASE_URL/documents")"
expect_code "GET /documents (anon)" "302" "$code"

echo "== 2. unauthenticated -> Telescope dashboard =="
code="$(curl -s -o /dev/null -w '%{http_code}' "$BASE_URL/telescope")"
expect_code "GET /telescope (anon)" "401" "$code"

echo "== 3. sign up ada@example.com and log in =="
login_flow "$WORKDIR/ada.jar" "ada@example.com" "supersecret123" "Ada Lovelace"
code="$(curl -s -o /dev/null -w '%{http_code}' -b "$WORKDIR/ada.jar" "$BASE_URL/")"
expect_code "GET / (ada, logged in)" "200" "$code"

echo "== 4. authenticated, no role yet -> 403 on /documents =="
code="$(curl -s -o /dev/null -w '%{http_code}' -b "$WORKDIR/ada.jar" "$BASE_URL/documents")"
expect_code "GET /documents (ada, no role)" "403" "$code"

echo "== 5. grant ada the 'member' role =="
ada_id="$(node -e "const D=require('better-sqlite3');const db=new D('tmp/db.sqlite3');console.log(db.prepare(\"SELECT id FROM app_users WHERE email='ada@example.com'\").get().id)")"
echo "  ada id = $ada_id"
node ace authz:assign member "$ada_id" > /dev/null 2>&1
pass "assigned 'member' to $ada_id"

echo "== 6. authenticated + 'member' -> 200 on /documents =="
code="$(curl -s -o /dev/null -w '%{http_code}' -b "$WORKDIR/ada.jar" "$BASE_URL/documents")"
expect_code "GET /documents (ada, member)" "200" "$code"

echo "== 7. create a document with an attached file =="
echo "hello from the agora end-to-end example" > "$WORKDIR/testfile.txt"
csrf="$(csrf_from_page "$WORKDIR/ada.jar" "/")"
resp="$(curl -s -b "$WORKDIR/ada.jar" -c "$WORKDIR/ada.jar" \
  -F "_csrf=$csrf" -F "title=Smoke test document" -F "file=@$WORKDIR/testfile.txt;type=text/plain" \
  "$BASE_URL/documents")"
doc_id="$(echo "$resp" | grep -oP '(?<="id":")[^"]+' | head -1)"
if [ -z "$doc_id" ]; then doc_id="$(echo "$resp" | grep -oP '(?<="id":)[0-9]+' | head -1)"; fi
echo "  created document id=$doc_id ($resp)"

echo "== 8. ada downloads her own file -> 200 =="
code="$(curl -s -o "$WORKDIR/downloaded.txt" -w '%{http_code}' -b "$WORKDIR/ada.jar" "$BASE_URL/documents/$doc_id/file")"
expect_code "GET /documents/$doc_id/file (owner)" "200" "$code"
diff -q "$WORKDIR/testfile.txt" "$WORKDIR/downloaded.txt" > /dev/null && pass "downloaded bytes match the upload"

echo "== 9. a second user (no 'manage' grant) cannot download ada's file =="
login_flow "$WORKDIR/bob.jar" "bob@example.com" "othersecret123" "Bob Babbage"
node ace authz:assign member "$(node -e "const D=require('better-sqlite3');const db=new D('tmp/db.sqlite3');console.log(db.prepare(\"SELECT id FROM app_users WHERE email='bob@example.com'\").get().id)")" > /dev/null 2>&1
code="$(curl -s -o /dev/null -w '%{http_code}' -b "$WORKDIR/bob.jar" "$BASE_URL/documents/$doc_id/file")"
expect_code "GET /documents/$doc_id/file (non-owner)" "403" "$code"

echo "== 10. non-admin -> Telescope dashboard is still denied =="
# NOTE: telescope's dashboard guard (ui/guard.js's runGuard) picks 401 vs 403
# by whether the REQUEST presented a credential — an Authorization header or
# a ?token= query param — not by what authorize() concluded. That heuristic
# fits telescope's own built-in `credentials: {token, basic}` gate, but
# authorizeByRoles authenticates via the app's session COOKIE, which this
# heuristic never inspects — so with authorizeByRoles wired in (as here),
# an authenticated-but-wrong-role denial and a genuinely anonymous one both
# come back as 401, never the 403 the authz-side docs describe. Access is
# correctly denied either way; only the status code is imprecise in this
# specific composition. Accepting either code here rather than asserting one.
code="$(curl -s -o /dev/null -w '%{http_code}' -b "$WORKDIR/ada.jar" "$BASE_URL/telescope")"
if [ "$code" = "401" ] || [ "$code" = "403" ]; then
  pass "GET /telescope (ada, member only) denied ($code)"
else
  fail "GET /telescope (ada, member only)" "401 or 403" "$code"
fi

echo "== 11. promote ada to ADMIN -> Telescope dashboard 200 =="
node ace authz:assign ADMIN "$ada_id" > /dev/null 2>&1
code="$(curl -s -o /dev/null -w '%{http_code}' -b "$WORKDIR/ada.jar" "$BASE_URL/telescope")"
expect_code "GET /telescope (ada, ADMIN)" "200" "$code"

echo
echo "All smoke-test checks passed."
