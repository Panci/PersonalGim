#!/bin/sh
set -eu

while IFS= read -r filename; do
  if [ ! -s "/srv/exercise-library/media/$filename" ]; then
    echo "Missing exercise resource: $filename. Install the library before deploying web." >&2
    exit 1
  fi
done < /etc/nginx/exercise-library-required.txt
