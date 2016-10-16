#!/bin/sh

export npm_config_target=1.4.3
export npm_config_arch=x64
export npm_config_disturl=https://atom.io/download/atom-shell
export npm_config_runtime=electron
export npm_config_build_from_source=true

npm install
