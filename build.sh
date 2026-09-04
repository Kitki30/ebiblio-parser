#!/bin/bash
npm i
npx esbuild --bundle --format=esm --target=es2020 --outfile=dist/bundle.js --inject:./qjs_fix.js --external:std index.js