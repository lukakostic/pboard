/************* 
Messages are mostly client -> server.
Msg = code of message
TCMsg = type of client request
TSMsg = type of server response
CMsg = send client -> server
**************/
/** */

const _MakeMsg = <Req,Resp> (msg_code:string) => 
    (async (d:Req) : Promise<Resp> => 
        (await Server.sendMsg({n:msg_code,d})) as Resp  );

type TCMsg_saveAll__DataOrDeleted = {path:[string,Id|undefined]} & ({data:string} | {deleted:true});
const Msg_saveAll = 'saveAll';
type TCMsg_saveAll = {hash:string,data:TCMsg_saveAll__DataOrDeleted[]};
type TSMsg_saveAll = Error|true;
const CMsg_saveAll = _MakeMsg<TCMsg_saveAll,TSMsg_saveAll>(Msg_saveAll);

const Msg_eval = 'eval';
type TCMsg_eval = {code:string};
type TSMsg_eval = Error|any;
const CMsg_eval = _MakeMsg<TCMsg_eval,TSMsg_eval>(Msg_eval);

const Msg_loadInitial = 'loadInitial';
type TCMsg_loadInitial = null;
type TSMsg_loadInitial = Error|false|{ // false if nothing already saved (fresh install)
    PROJECT : JSONstr<ProjectClass>,
    SEARCH_STATISTICS : JSONstr<SearchStatistics>,
    PAGES : JSONstr<TPAGES>,

    ids_BLOCKS : Id[],
    ids_TAGS : Id[],
};
const CMsg_loadInitial = _MakeMsg<TCMsg_loadInitial,TSMsg_loadInitial>(Msg_loadInitial);

const Msg_loadBlock = 'loadBlock';
type TCMsg_loadBlock = {id:Id,depth:number};
type TSMsg_loadBlock = Error|{[index:Id]:string};//JSONstr<Block>};
const CMsg_loadBlock = _MakeMsg<TCMsg_loadBlock,TSMsg_loadBlock>(Msg_loadBlock);

const Msg_loadTag = 'loadTag';
type TCMsg_loadTag = {id:Id,depth:number};
type TSMsg_loadTag = Error|{[index:Id]:string};//JSONstr<Tag>};
const CMsg_loadTag = _MakeMsg<TCMsg_loadTag,TSMsg_loadTag>(Msg_loadTag);
