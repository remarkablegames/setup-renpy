#!/usr/bin/env bash

CURRENT_VERSION=$(yq .inputs.cli-version.default action.yml)

echo "Current version: $CURRENT_VERSION"

LATEST_VERSION=$(
  gh release list \
    --repo renpy/renpy \
    --limit 1 \
    --exclude-pre-releases \
    --json name \
    --jq '.[0].name' | \
  awk '{print $2}'
)

echo "Latest version: $LATEST_VERSION"

if [[ $CURRENT_VERSION == $LATEST_VERSION ]]; then
  echo "Ren'Py version has not changed. Exiting"
  exit
fi

git stash

FILES=$(git grep -l "$CURRENT_VERSION" -- ':!CHANGELOG.md' ':!package*.json')

if [[ $(uname) == 'Darwin' ]]; then
  echo "$FILES" | xargs sed -i '' -e "s/$CURRENT_VERSION/$LATEST_VERSION/g"
else
  echo "$FILES" | xargs sed -i -e "s/$CURRENT_VERSION/$LATEST_VERSION/g"
fi

npm run build

echo 'Creating PR...'
BRANCH="build/version-$LATEST_VERSION"
git checkout -b $BRANCH
git commit -am \
  "build(deps): bump renpy from $CURRENT_VERSION to $LATEST_VERSION" \
  -m "Release-As: $(jq -r .version package.json | awk -F. '/[0-9]+\./{$NF++;print}' OFS=.)" \
  -m "https://www.renpy.org/release/$LATEST_VERSION"
git push --force origin $BRANCH
gh pr create --assignee remarkablemark --fill --reviewer remarkablemark

git stash pop || true
