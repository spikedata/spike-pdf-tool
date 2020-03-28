#!/bin/bash
set -e # Exit immediately if a command exits with a non-zero status

CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m' # No Color

BASEDIR=$(dirname $0)
cd $BASEDIR/..

# run build here to catch build errors before `npm version patch` is run
printf "${CYAN}npm run build${NC}\n"
npm run build

# update semver
printf "${CYAN}npm version patch${NC}\n"
npm version patch

# git tag - `npm version` does this already
# ver=`jq .version ./package.json`
# git tag $ver
# git push --tags

# run run build here in order for `spike-pdf-tool --version` to show the version number created by `npm version patch` above
printf "${CYAN}npm run build${NC}\n"
npm run build

printf "${CYAN}npm publish${NC}\n"
npm publish
