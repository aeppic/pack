aeppic Packaging Tool
=====================

Tool to package a node package including its production dependencies as a binary.

## Usage

Run the pack command in the package root (where pnpm-lock.yaml or package-lock reside)

`npx @aeppic/pack`

or install it globally

```
npm i -g @aeppic/pack
aeppic-pack
```

Help for options is available via `--help` and use `-v` to see what Docker is doing during the build. 

## Requirements

Local Docker is required and it needs to support `DOCKER_BUILDKIT=1` to passthrough SSH and NPM credentials into the Docker container. `Docker version 20.10.11, build dea9396` was used during development.

Two Dockerfiles are included. One for pnpm (Default) and one using npm, but that can be overwritten from the command line. By default an `ubuntu:16.04` image is used as a builder image (`FROM ubuntu:16.04 as builder`)

## Way it works

1) Gather all production files via `npm pack` using its JSON output
2) Create a Docker image copy the pnpm/npm lock and run a production level as part of the build
3) Copy the resulting node_modules folder from inside the container back into the host
4) Create a new tgz containing the files from step 1 and the node_modules from step 2/3

Important: Make sure the package.json files field includes all files required for runtime
