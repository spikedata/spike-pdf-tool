#!/bin/bash
set -e # Exit immediately if a command exits with a non-zero status

CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m' # No Color

BASEDIR=$(dirname $0)
cd $BASEDIR/..

printf "${CYAN}npm run build${NC}\n"
npm run build

# update semver
printf "${CYAN}npm version patch${NC}\n"
npm version patch

# git tag - `npm version` does this already
# ver=`jq .version ./package.json`
# git tag $ver
# git push --tags

printf "${CYAN}npm publish${NC}\n"
npm publish

# update to latest @spikedata/api version
# npm install -S @spikedata/api@latest
