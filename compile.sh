#Bundlers are evil, and bash is forever.

shopt -s extglob

bash ./deleteAll.sh

#bash ./src_buildSys/execute.sh    ### ne treba nam vise codegen

# (cat -s ./src/*.{ts,js} ./src/client/*.{ts,js} ./src/client/*/*.{ts,js} ./src/client/*/*/*.{ts,js} > 
( deno run --allow-read concatDeno.ts ./src/ --extensions .ts.js --depth 4 --excludePaths ./src/server ./src/external > ./built/client/CLIENT.ts ;\
npx swc ./built/client/CLIENT.ts -o ./built/client/CLIENT.js ) &

# (cat -s ./src/*.{ts,js} ./src/server/*.{ts,js} ./src/server/*/*.{ts,js} ./src/server/*/*/*.{ts,js} > ./built/server/SERVER.ts ;\
( deno run --allow-read concatDeno.ts ./src/ --extensions .ts.js --depth 4 --excludePaths ./src/client ./src/external > ./built/server/SERVER.ts ;\
npx swc ./built/server/SERVER.ts -o ./built/server/SERVER.js ) &


(cp ./src/client/*.!(ts|js) ./built/client/) &

wait #for above & to finish


shopt -u extglob


#############################
# rmdir built &&

#npx swc ./src/ --ignore ./src/server --ignore ./src/external --strip-leading-paths --copy-files \
#-d built


# &&
#cp -r ./src/external ./built/external
# -o ./src/client/ALL_BUILT.js #\

# -d built \
#   --no-swcrc \
#   -C jsc.target=esnext \
#   -C module.resolveFully=true \
#   -C module.type="nodenext"

# --strip-leading-paths   da se ne iskopira src folder unutar dist (vec samo unutar njega sta je)