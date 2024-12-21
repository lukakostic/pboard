rmdir dist &&
npx swc . -d dist \
#   --no-swcrc \
  -C jsc.target=esnext \
  -C module.resolveFully=true \
  -C module.type="nodenext"