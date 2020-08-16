#! /bin/bash

npm install -g yarn
yarn install
npx serverless deploy --stage $env --package \
$CODEBUILD_SRC_DIR/target/$env -v -r us-east-1