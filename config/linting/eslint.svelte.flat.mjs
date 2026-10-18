import svelte from "eslint-plugin-svelte";
import svelteParser from "svelte-eslint-parser";
import ts from "typescript-eslint";
import svelteConfig from "../../svelte.config.mjs";

// Flat-config replacement for config/linting/eslint.svelte.js, which this file supersedes.
// eslint-plugin-svelte@3 is flat-config only, so the job runs as:
//     ESLINT_USE_FLAT_CONFIG=true eslint -c config/linting/eslint.svelte.flat.mjs src/frontend --fix
//
// Three deliberate choices, each guarding a check that would otherwise be lost silently:
//
// 1. `svelte.configs.base`, NOT `recommended`/`all`. The recommended preset ships 37 `svelte/*` rules
//    (svelte/require-each-key, svelte/no-at-html-tags, svelte/no-reactive-reassign, …) that
//    eslint-plugin-svelte3 never enabled either. Applying them to 464 source-unchanged components would
//    fail `npm run lint` and force `.svelte` edits. Those 37 rules are Phase 6's remit, not this phase's.
//    `base` wires the parser, the `svelte/svelte` processor and `svelte/comment-directive` + `svelte/system`
//    only — exactly what svelte3's processor provided.
// 2. `ts.configs.recommendedTypeChecked`, NOT `ts.configs.recommended`. The replaced config extended BOTH
//    `plugin:@typescript-eslint/recommended` and `plugin:@typescript-eslint/recommended-requiring-type-checking`.
//    typescript-eslint v8's non-type-checked flat `recommended` contains ZERO type-aware rules, so building on
//    it would silently prune the type-aware rule population that is not among the verbatim overrides below.
//    `recommendedTypeChecked` includes the `recommended` rules plus those type-aware rules.
// 3. `svelte/valid-compile` is enabled by hand. eslint-plugin-svelte@3 ships it in NO preset
//    (verified against the installed package: it appears zero times in base.js, recommended.js and all.js —
//    it exists only as lib/rules/valid-compile.js). It is the one check eslint-plugin-svelte3 was really
//    providing — Svelte compiler diagnostics surfaced as lint problems — and a preset-only swap would drop it
//    while still reporting "0 problems". That is the silent check loss TOOL-03 forbids.
export default [
    ...svelte.configs.base,
    // The `eslint-recommended` entry inside the preset carries `files: ["**/*.ts", "**/*.tsx", …]`, and flat config
    // lints every file matched by ANY config's `files` patterns — with `--ext` gone, that entry alone would make this
    // job lint `.ts` files (and fail, because no parserOptions.project is configured for them). Its rules only turn
    // ESLint core rules off for TypeScript files, which an `.svelte`-only job never lints, so it is dropped rather
    // than worked around. The remaining entries supply the plugin, the parser base and the 50 type-aware rules.
    ...ts.configs.recommendedTypeChecked.filter((config) => config.name !== "typescript-eslint/eslint-recommended"),
    {
        // flat config has no `--ext`: this is the glob the replaced `lint:svelte` passed on the command line.
        // Patterns resolve relative to the CWD, which is the repo root for every npm script.
        files: ["**/*.svelte"],
        languageOptions: {
            // `ts.configs.recommendedTypeChecked`'s first entry sets the TypeScript parser for ALL files,
            // and it is spread after `svelte.configs.base` — so the Svelte parser has to be re-stated here,
            // in the last config that matches `.svelte` (outer parser = Svelte, inner parser = TypeScript).
            parser: svelteParser,
            parserOptions: {
                parser: ts.parser,
                extraFileExtensions: [".svelte"],
                project: "config/typescript/tsconfig.svelte.json",
                svelteConfig
            }
        },
        rules: {
            // Svelte compiler diagnostics: compile ERRORS are fatal, a11y warnings stay muted until Phase 6
            // re-enables a11y as a formal requirement.
            "svelte/valid-compile": ["error", { ignoreWarnings: true }],

            // ---- overrides re-applied verbatim from config/linting/eslint.svelte.js ----
            "@typescript-eslint/no-floating-promises": "off",
            "@typescript-eslint/no-misused-promises": "off",
            "@typescript-eslint/no-implied-eval": "off", // only in the Svelte config — eslint.frontend.json does not carry it
            "@typescript-eslint/no-unused-vars": ["error", { varsIgnorePattern: "^_", argsIgnorePattern: "^_" }],
            "@typescript-eslint/restrict-plus-operands": "off",
            "@typescript-eslint/no-non-null-assertion": "off",
            "@typescript-eslint/naming-convention": "off",
            "@typescript-eslint/restrict-template-expressions": "off",
            "@typescript-eslint/no-unsafe-member-access": "off",
            "@typescript-eslint/no-unsafe-assignment": "off",
            "@typescript-eslint/no-unsafe-argument": "off",
            "@typescript-eslint/no-unsafe-return": "off",
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/no-unsafe-call": "off",
            "@typescript-eslint/ban-ts-comment": "off",

            // ---- restored checks: present in typescript-eslint v5's `recommended`, absent from v8's presets ----
            // v8's `recommended`/`recommendedTypeChecked` dropped these two rules, and the replaced config got them
            // from `plugin:@typescript-eslint/recommended` (v5). They are NOT deprecated in v8, just no longer in a
            // preset. Without them the migration would report 111 fewer findings (96 + 15 at baseline) while looking
            // green — the same silent check loss TOOL-03 forbids for `svelte/valid-compile`. Re-enabling them keeps
            // the pre-migration rule population. (The preset also gained rules v5 did not have, e.g.
            // no-redundant-type-constituents and no-unsafe-unary-minus; those stay on.)
            "@typescript-eslint/no-inferrable-types": "error",
            "@typescript-eslint/no-empty-function": "error",

            // added in the migration so `.svelte` files are guarded under the coming `verbatimModuleSyntax`,
            // matching config/linting/eslint.frontend.json
            "@typescript-eslint/consistent-type-imports": ["error", { prefer: "type-imports", disallowTypeAnnotations: true }]
        }
    },
    {
        // Global ignore (an object whose only key is `ignores`). Flat config lints `.js`/`.mjs`/`.cjs` files by
        // default when a directory is passed, and `--ext` no longer exists to narrow that — so this job declares
        // its own scope here: `.svelte` files only, exactly what `--ext .svelte` used to select. Without this the
        // job would also try to lint plain TypeScript files, which the type-aware rules reject for lack of a project.
        ignores: ["**/*.js", "**/*.jsx", "**/*.mjs", "**/*.cjs", "**/*.ts", "**/*.tsx", "**/*.mts", "**/*.cts"]
    }
];
