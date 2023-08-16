import { nodeResolve } from '@rollup/plugin-node-resolve';
import copy from 'rollup-plugin-copy'
import commonjs from '@rollup/plugin-commonjs';
import outputSize from 'rollup-plugin-output-size';
import { visualizer } from "rollup-plugin-visualizer";

const outputDir = 'dist/legacy-runtime/esm';
const nodePlugin = nodeResolve(
    { browser: true 
    , resolveOnly: module => !module.includes('@emurgo/cardano-serialization-lib-browser')
    });

// const wasmPlugin = wasm({targetEnv: 'browser', sync: ['**/*.wasm']});

const copyWasm = copy({
    targets: [
        { src: 'node_modules/@emurgo/cardano-serialization-lib-browser/*.wasm', dest: `${outputDir}/` }
    ]
});
export default {
    // input: 'packages/language/core/v1/dist/semantics/contract/index.js',
    // input: 'packages/legacy-adapter/dist/index.js',
    input: 'packages/legacy-runtime/dist/index.js',
    output: {
        dir: outputDir,
        format: 'esm',
    },
    plugins: 
        [ copyWasm
        , nodePlugin
        , commonjs()
        , outputSize()
        , visualizer()],
}