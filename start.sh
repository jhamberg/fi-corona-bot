#!/usr/bin/env bash

# Install dependencies 
if [ ! -d "node_modules" ]; then
    echo "Installing local dependencies..."
    npm install --quiet
    echo "Done!"
fi

# Run with all locales and pretty printing
node --icu-data-dir=node_modules/full-icu src/index.js | ./node_modules/.bin/pino-pretty --translateTime SYS:standard