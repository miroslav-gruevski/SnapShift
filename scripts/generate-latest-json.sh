#!/usr/bin/env bash
set -euo pipefail

TAG="${1:?usage: generate-latest-json.sh <tag> [repo]}"
REPO="${2:-miroslav-gruevski/SnapShift}"

version="${TAG#v}"
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

gh release download "$TAG" -R "$REPO" -D "$tmp" -p "*.sig" || true

asset_name() {
  local pattern="$1"
  gh release view "$TAG" -R "$REPO" --json assets -q '.assets[].name' \
    | grep -E "$pattern" \
    | head -n1
}

sig_for() {
  local pattern="$1"
  local file
  file=$(ls "$tmp" 2>/dev/null | grep -E "$pattern" | head -n1 || true)
  if [ -n "$file" ]; then
    tr -d '\n' < "$tmp/$file"
  else
    echo ""
  fi
}

base="https://github.com/${REPO}/releases/download/${TAG}"

mac_arm_asset=$(asset_name 'SnapShift_aarch64\.app\.tar\.gz$')
mac_x64_asset=$(asset_name 'SnapShift_x64\.app\.tar\.gz$')
linux_asset=$(asset_name 'SnapShift_.*_amd64\.AppImage$')
win_asset=$(asset_name 'SnapShift_.*_x64-setup\.exe$')

mac_arm_url="${base}/${mac_arm_asset}"
mac_x64_url="${base}/${mac_x64_asset}"
linux_url="${base}/${linux_asset}"
win_url="${base}/${win_asset}"

mac_arm_sig=$(sig_for "${mac_arm_asset}\\.sig$")
mac_x64_sig=$(sig_for "${mac_x64_asset}\\.sig$")
linux_sig=$(sig_for "${linux_asset}\\.sig$")
win_sig=$(sig_for "${win_asset}\\.sig$")

cat > latest.json <<JSON
{
  "version": "${version}",
  "notes": "See https://github.com/${REPO}/releases/tag/${TAG}",
  "pub_date": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "platforms": {
    "darwin-aarch64": { "url": "${mac_arm_url}", "signature": "${mac_arm_sig}" },
    "darwin-x86_64":  { "url": "${mac_x64_url}", "signature": "${mac_x64_sig}" },
    "linux-x86_64":   { "url": "${linux_url}",   "signature": "${linux_sig}" },
    "windows-x86_64": { "url": "${win_url}",     "signature": "${win_sig}" }
  }
}
JSON

echo "Wrote latest.json for ${TAG}"
echo "  darwin-aarch64: ${mac_arm_asset}"
echo "  darwin-x86_64:  ${mac_x64_asset}"
echo "  linux-x86_64:   ${linux_asset}"
echo "  windows-x86_64: ${win_asset}"
