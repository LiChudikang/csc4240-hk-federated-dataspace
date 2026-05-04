#!/bin/bash
# Federated Catalog Crawler
# Demonstrates Part 2 "ideally, configurable to crawl the catalogs of providers".
#
# Configurable provider list, queries each via DSP catalog/request, aggregates
# all assets + offers into one unified federation-wide index. Optionally
# filters by keyword.

set -uo pipefail
API_KEY="password"
CONSUMER_MGMT="http://127.0.0.1/consumer/cp/api/management/v3"
PROVIDER_DID_BOB="did:web:provider-identityhub%3A7083:provider"
PROVIDER_DID_HKU="did:web:hku-identityhub%3A7083:hku"

# Configurable provider list - add more by appending lines
PROVIDERS=(
  "qna|http://provider-qna-controlplane:8082/api/dsp|$PROVIDER_DID_BOB"
  "manufacturing|http://provider-manufacturing-controlplane:8082/api/dsp|$PROVIDER_DID_BOB"
  "catalog-server|http://provider-catalog-server-controlplane:8082/api/dsp|$PROVIDER_DID_BOB"
  "hku|http://hku-controlplane:8082/api/dsp|$PROVIDER_DID_HKU"
)

KEYWORD="${1:-}"

OUT=/Users/lichudikang/MVD/final/screenshots
bold() { printf "\n\033[1;36m===== %s =====\033[0m\n" "$*"; }

bold "Federated Crawler (run from HKTaxi/alice)"
echo "Crawling ${#PROVIDERS[@]} providers..."
[[ -n "$KEYWORD" ]] && echo "Filter: keyword='$KEYWORD'"
echo

declare -a ALL_ASSETS=()

for ENTRY in "${PROVIDERS[@]}"; do
  IFS='|' read -r NAME DSP DID <<< "$ENTRY"
  printf "▶ Crawling provider %-22s ... " "$NAME"
  CAT=$(curl -sS -H "X-Api-Key: $API_KEY" -X POST "$CONSUMER_MGMT/catalog/request" -H 'Content-Type: application/json' -d "{
    \"@context\": [\"https://w3id.org/edc/connector/management/v0.0.1\"],
    \"counterPartyAddress\": \"$DSP\",
    \"counterPartyId\": \"$DID\",
    \"protocol\": \"dataspace-protocol-http\"
  }")

  if echo "$CAT" | jq -e '.["dcat:dataset"]' > /dev/null 2>&1; then
    ASSET_LIST=$(echo "$CAT" | jq -r '
      .["dcat:dataset"] |
      (if type=="array" then . else [.] end) |
      .[] |
      [.["@id"], (.["@type"] // "Asset"), (.description // .["dct:title"] // "")] | @tsv
    ')
    COUNT=$(echo "$ASSET_LIST" | grep -c .)
    printf "%d asset(s)\n" "$COUNT"
    while IFS=$'\t' read -r AID ATYPE TITLE; do
      [[ -z "$AID" ]] && continue
      if [[ -n "$KEYWORD" ]] && ! echo "$AID $ATYPE $TITLE" | grep -qi "$KEYWORD"; then
        continue
      fi
      ALL_ASSETS+=("$NAME|$AID|$ATYPE")
    done <<< "$ASSET_LIST"
  else
    ERR=$(echo "$CAT" | jq -r '. | if type=="array" then .[0].message else .message end' 2>/dev/null | head -c 150)
    printf "ERROR: %s\n" "${ERR:-unreachable}"
  fi
done

bold "Federation-wide Index (${#ALL_ASSETS[@]} assets aggregated)"
printf "%-20s %-32s %s\n" "PROVIDER" "ASSET-ID" "TYPE"
printf "%-20s %-32s %s\n" "--------------------" "--------------------------------" "----"
for ENTRY in "${ALL_ASSETS[@]}"; do
  IFS='|' read -r P AID T <<< "$ENTRY"
  printf "%-20s %-32s %s\n" "$P" "$AID" "$T"
done

# Save evidence
{
  echo "=== Federated Catalog Crawler Output ==="
  echo "Demonstrates Part 2 'configurable to crawl' requirement"
  echo "Run timestamp: $(date)"
  echo "Providers configured: ${#PROVIDERS[@]}"
  echo
  for ENTRY in "${PROVIDERS[@]}"; do
    IFS='|' read -r N D _ <<< "$ENTRY"
    echo "  • $N -> $D"
  done
  echo
  echo "=== Aggregated Federation Index ==="
  printf "%-20s %-32s %s\n" "PROVIDER" "ASSET-ID" "TYPE"
  printf "%-20s %-32s %s\n" "--------------------" "--------------------------------" "----"
  for ENTRY in "${ALL_ASSETS[@]}"; do
    IFS='|' read -r P AID T <<< "$ENTRY"
    printf "%-20s %-32s %s\n" "$P" "$AID" "$T"
  done
} > "$OUT/14-federated-crawler.txt"
echo
echo "Saved: $OUT/14-federated-crawler.txt"
