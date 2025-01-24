
let $CL=true;
const BlkFn = {
async RemoveTagFromBlock (blockId, tagId) {
    (await rpc(`BlkFn.RemoveTagFromBlock`,blockId,tagId));  
    const t = _TAGS[tagId];
    if ($CL && !t) return;
    t._blocks.splice(t._blocks.indexOf(blockId), 1); //remove block from tag
    const b = _BLOCKS[blockId];
    if ($CL && !b) return;
    b._tags.splice(b._tags.indexOf(tagId), 1); //remove tag from block
  },
async RemoveAllTagsFromBlock (blockId) {
    (await rpc(`BlkFn.RemoveAllTagsFromBlock`,blockId));  
    const b = _BLOCKS[blockId];
    if ($CL && !b) return;
    for(let i = 0; i < b._tags.length; i++){
      const t = _TAGS[b._tags[i]];
      if ($CL && !t) continue;
      t._blocks.splice(t._blocks.indexOf(blockId), 1); //remove block from tag
    }
    b._tags = []; //    b._tags.splice(b._tags.indexOf(tagId),1); //remove tag from block
  },
async DeleteBlockOnce (id){
	(await rpc(`BlkFn.DeleteBlockOnce`,id));
	await ReLoadAllData();
},
async DeleteBlockEverywhere (id){
	(await rpc(`BlkFn.DeleteBlockEverywhere`,id));
	await ReLoadAllData();
},
async InsertBlockChild (parent, child, index) /*:Id[]*/ {
    (await rpc(`BlkFn.InsertBlockChild`,parent,child,index));  
    const p = _BLOCKS[parent];
    if ($CL && !p) return;
    const l = p._children;
    if (index >= l.length) {
      l.push(child);
    } else {
      l.splice(index, 0, child);
    }
  // return l;
  },
async SearchPages (title, mode = 'exact'){
	return (await rpc(`BlkFn.SearchPages`,title,mode));
},
async SearchTags (title, mode = 'exact'){
	return (await rpc(`BlkFn.SearchTags`,title,mode));
},
async HasTagBlock (tagId, blockId, $CL = false) {
      
    if (!$CL) return _TAGS[tagId]._blocks.indexOf(blockId) != -1;
    if ($CL) {
      if (_TAGS[tagId]) return _TAGS[tagId]._blocks.indexOf(blockId) != -1;
      if (_BLOCKS[blockId]) return _BLOCKS[blockId]._tags.indexOf(tagId) != -1;
      return (await rpc(`BlkFn.HasTagBlock`,tagId,blockId,$CL));
    }
  },
async TagBlock (tagId, blockId) /*:boolean*/ {
    (await rpc(`BlkFn.TagBlock`,tagId,blockId));  
    if (await this.HasTagBlock(tagId, blockId, $CL)) return; // false;
    _TAGS[tagId]._blocks.push(blockId);
    _BLOCKS[blockId]._tags.push(tagId);
  // return true;
  },
async RemoveTagBlock (tagId, blockId) /*:boolean*/ {
    (await rpc(`BlkFn.RemoveTagBlock`,tagId,blockId));  
    if (await this.HasTagBlock(tagId, blockId, $CL) == false) return; // false;
    _TAGS[tagId]._blocks.splice(_TAGS[tagId]._blocks.indexOf(blockId), 1);
    _BLOCKS[blockId]._tags.splice(_BLOCKS[blockId]._tags.indexOf(tagId), 1);
  // return true;
  },
};
