#!/usr/bin/env bash

echo "Running copy-frontend.sh at location $(pwd)"
# The directory that contains the source code for the react.js front end
LAB_NAME=complete
FRONTEND_SRC_DIR=$(pwd)/movr_frontend_$LAB_NAME
if [ ${FRONTEND_SRC_DIR: -8} != $LAB_NAME ]; then exit; fi
STATIC_FRONTEND_DIR=$(pwd)/movr_java_$LAB_NAME/src/main/resources/static

if [ -d $FRONTEND_SRC_DIR/build ]; then rm -r $FRONTEND_SRC_DIR/build; fi
(cd $FRONTEND_SRC_DIR && yarn && yarn build)

if [ -d $STATIC_FRONTEND_DIR ]; then rm -r $STATIC_FRONTEND_DIR; fi
mkdir -p $STATIC_FRONTEND_DIR
cp -r $FRONTEND_SRC_DIR/build/. $STATIC_FRONTEND_DIR

