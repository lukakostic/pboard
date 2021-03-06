class Tag {
    id :string;
    name :string;
    parentTags :string[]; /*ids*/
    

    constructor(name = "",id :string|null =null){
        if (id === null) id = Board.makeId(16);
        this.id = id;

        this.name = name;
        this.parentTags = [];
    }

    static makeId(maxLength :number) :string{
		let id = randomStr(maxLength);
		while(id in pb.tags)
			id = randomStr(maxLength);
		return id;
  	}
    
    static findTagByName(name :string) :string|null{
        let k = Object.keys(pb.tags);
        for(let j = 0; j < k.length; j++){
            if(pb.tags[k[j]].name == name)return k[j];
        }
        return null;
    }

    static AllUpstreamParents(tagChild /*id*/ :string, oldLst :{[index:string]:number} = {}){ /////////*TODO*///// Idk what this does or is xd, how does it work
        let lst = oldLst;

        for(let i = 0; i < pb.tags[tagChild].parentTags.length; i++){
            if(lst[pb.tags[tagChild].parentTags[i]] == null){ //////////////////////////////////////////////////// Should it say != null ??????????????????
                let k = Object.keys(Tag.AllUpstreamParents(pb.tags[tagChild].parentTags[i],lst));
                for(let j = 0; j < k.length; j++){
                    lst[k[j]] = 1;
                }
            }
            lst[pb.tags[tagChild].parentTags[i]] = 1;
        }
        
        return lst;
    }
}
