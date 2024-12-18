import { serve } from "https://deno.land/std@0.177.0/http/mod.ts";
import { serveDirWithTs } from "https://deno.land/x/ts_serve@v1.4.4/mod.ts";
//https://github.com/ayame113/ts-serve
serve((request) => serveDirWithTs(request));