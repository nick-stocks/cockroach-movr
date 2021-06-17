#!/usr/bin/env bash
set -o allexport; source .env; set +o allexport

# The directory that contains the source code for the react.js front end
FRONTEND_SRC_DIR=../movr_frontend_comp_col

rm -r $FRONTEND_SRC_DIR/build
(cd $FRONTEND_SRC_DIR && yarn && yarn build)

rm -r $STATIC_FRONTEND_DIR
mkdir -p $STATIC_FRONTEND_DIR
cp -r $FRONTEND_SRC_DIR/build/. $STATIC_FRONTEND_DIR
