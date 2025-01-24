# awk '/INSERT_HERE/ {sub(/,/,"&Tomas_proxy.lt/")} 1' file
sed '/\/\/INSERT_HERE/r ./src/server/1BlkFn_server.ts'\
 ./src_buildSys/BlkFn_transformer.ts > ./built_buildSys/BlkFn.ts
deno run --allow-all ./built_buildSys/BlkFn.ts > ./src/client/1BlkFn_GENERATED.js