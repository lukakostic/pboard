//import { Quill } from "../../external/quill-js/quill.js";

const Embed = Quill.import('blots/embed')
// const Block = Quill.import('blots/block');
const BlockEmbed = Quill.import('blots/block/embed');
const Inline = Quill.import('blots/inline');
const InlineBlot = Quill.import('blots/block');


class InlineBtnBlot extends Embed {
  static create(value) {
    let node = super.create();

    node.setAttribute('onclick', value.url);
    // node.setAttribute('target', '_blank')
    node.innerText = value.text;
    node.classList.add('btn','btn-primary');

    return node;
  }

  // let value be hash containing both href and text
  static value(node) {
    return { url: node.getAttribute('onclick'), text: node.innerText };
  }

//   static formats(node) {
//     return node.getAttribute('href')
//   }
}
InlineBtnBlot.blotName = 'inlineBtn';
InlineBtnBlot.tagName = 'button';
InlineBtnBlot.className = 'inlineBtn'; // cant have multiple :(

Quill.register(InlineBtnBlot);

function getBlockElement(node:Node) :HTMLElement|null{
    return getElement(node).nearest('[data-b-id]');
}
function getBtn(eventTarget:Node){
    return getElement(eventTarget).closest('button');
}
function getNodeData(node:Node){
    node = getElement(node).closest('data-node-data');
    let data = node.getAttribute('data-node-data');
}



class LineBtnBlot extends BlockEmbed {
    static blotName = 'lineBtn';
    static tagName = 'button';
    static className = 'lineBtn';
  
    static create(value) {
        let node = super.create();
    
        node.setAttribute('onclick', value.url);
        // node.setAttribute('target', '_blank')
        node.innerText = value.text;
        node.classList.add('btn','btn-primary');
    
        return node;
      }
    
      // let value be hash containing both href and text
      static value(node) {
        return { url: node.getAttribute('onclick'), text: node.innerText };
      }

    // static create(value) {
    //   const node = super.create();
    // //   node.dataset.id = id;

    //   // Allow twitter library to modify our contents
    // //   twttr.widgets.createTweet(id, node);
    //   return node;
    // }
  
    // static value(node) {
    //   return node.dataset.id;
    // }
}
Quill.register(LineBtnBlot);



type BlockEmbed_LineBtnBlot_Value = {
  text:string|'',
  id:Id
};
class BlockEmbed_LineBtnBlot extends BlockEmbed {
  static blotName = 'blockEmbed_lineBtn';
  static tagName = 'button';
  static className = 'blockEmbed_lineBtn';

  static create(value:BlockEmbed_LineBtnBlot_Value) {
      let node = super.create();
  
      node.setAttribute('onclick', `alert("${value.id}");`);
      // node.setAttribute('target', '_blank')
  // //   node.dataset.id = id;
      node.setAttribute('data-id', value.id);
      node.setAttribute('data-text', value.text || "");
      node.innerText = value.text || "<null>";
      node.classList.add('btn','btn-primary');
  
      return node;
    }
  
    // let value be hash containing both href and text
    static value(node) :BlockEmbed_LineBtnBlot_Value{
      return { id: node.getAttribute('data-id'), text: node.getAttribute('data-text') };
    }
}
Quill.register(BlockEmbed_LineBtnBlot);




class ExpandableTextBlot extends BlockEmbed {
  static blotName = 'expandable';
  static tagName = 'div';
  static className = 'expandable-text';

  // constructor(node2) {
  //   console.log("constructor!!!!!!!",node2);
  //   // super(node);
  //   let node = super.create(node2);
  //   this.button = document.createElement('span');
  //   this.button.classList.add('expand-button');
  //   this.button.innerHTML = '\u25C0'; // Arrow left (collapsed)
  //   this.button.contentEditable = 'false';
  //   this.button.addEventListener('click', this.toggleExpand.bind(this));
    
  //   this.contentSpan = document.createElement('span');
  //   this.contentSpan.classList.add('expandable-content');
    
  //   while (node.firstChild) {
  //     this.contentSpan.appendChild(node.firstChild);
  //   }
    
  //   node.appendChild(this.button);
  //   node.appendChild(this.contentSpan);
    
  //   this.expanded = node.dataset.expanded === 'true';
  //   this.updateVisibility();
  // }

  // toggleExpand() {
  //   this.expanded = !this.expanded;
  //   this.domNode.dataset.expanded = this.expanded;
  //   this.updateVisibility();
  // }

  // updateVisibility() {
  //   this.contentSpan.contentEditable = this.expanded.toString();
  //   this.contentSpan.style.display = this.expanded ? 'inline' : 'none';
  //   this.button.innerHTML = this.expanded ? '\u25B2' : '\u25C0'; // Arrow up when expanded
  // }

  static create(value) {
    console.log("Static create",value);
    let node = super.create(value);
    node.dataset.expanded = value.collapsed ? 'false' : 'true';
    
    let button = document.createElement('div');
    node.appendChild(button);

    button.classList.add('expand-button');
    button.innerHTML = '[\u25C0]'; // Arrow left (collapsed)
    button.contentEditable = 'false';
    
    //button.addEventListener('click', this.toggleExpand.bind(this));
    // button.addEventListener('click', this.toggleExpand.bind(this));
    

    let contentSpan = document.createElement('span');
    contentSpan.classList.add('expandable-content');
    contentSpan.appendChild(document.createTextNode(value.text));
    contentSpan.contentEditable = 'true'; // Allow editing the content
    contentSpan.style.display = value.collapsed ? 'none' : 'inline'; // Hide content if collapsed
    node.appendChild(contentSpan);

    node.setAttribute('contenteditable', 'false'); // Make the whole node non-editable

    button.addEventListener('click', () => {
      // Toggle the collapsed state
      value.collapsed = !value.collapsed;
      node.dataset.expanded = value.collapsed ? 'false' : 'true';
      // Update the content visibility
      contentSpan.style.display = value.collapsed ? 'none' : 'inline';
      // Update the button text
      button.innerHTML = value.collapsed ? '[\u25C0]' : '[\u25B2]'; // Arrow up when expanded
    });

    node.style = `display: inline-block; padding: 5px; border: 1px solid #ccc; border-radius: 4px; background-color: #f9f9f9;`;
    return node;
  }

  static formats(node) {
    return {
      collapsed: node.dataset.expanded !== 'true',
      text: node.querySelector('.expandable-content')?.textContent || '',
    };
  }
  //static formats() { return false; }

  // format(name, value) {
  //   if (name === 'expandable' && typeof value === 'object') {
  //     this.domNode.dataset.expanded = value.collapsed ? 'false' : 'true';
  //     this.contentSpan.textContent = value.text;
  //     this.updateVisibility();
  //   } else {
  //     super.format(name, value);
  //   }
  // }

  static value(node) {
    return {
      collapsed: node.dataset.expanded !== 'true',
      text: node.querySelector('.expandable-content')?.textContent || '',
    };
  }
}
Quill.register({ 'formats/expandable': ExpandableTextBlot });
//Quill.register(ExpandableTextBlot);




class PboardInlineBlock extends Embed {
  static blotName = 'inline-pboard-block';
  static tagName = 'div';
  static className = 'inline-pboard-block';


  static create(value) {
    console.log("Static create",value);
    let node = super.create(value);
    node.dataset.expanded = value.collapsed ? 'false' : 'true';
    node.setAttribute('data-pboard-board-id',value.id); //node.setAttribute('pboard-board-id', value.id);
    //node.setAttribute('contenteditable', 'false'); // Make the whole node non-editable
    node.contentEditable = 'false'; // Make the whole node non-editable

    let button = document.createElement('div');
    node.appendChild(button);
    button.classList.add('expand-button');
    button.innerHTML = '[\u25C0]'; // Arrow left (collapsed)
    button.style.userSelect = 'none';
  
    
    let content = document.createElement('div');
    node.appendChild(content);
    content.classList.add('pboard-board-content');
    content.style.userSelect = 'text';
    content.contentEditable = 'false'; // Make the content non-editable

    button.addEventListener('click', () => {
      // Toggle the collapsed state
      value.collapsed = !value.collapsed;
      node.dataset.expanded = value.collapsed ? 'false' : 'true';
      // Update the content visibility
      //contentSpan.style.display = value.collapsed ? 'none' : 'inline';
      // Update the button text
      button.innerHTML = value.collapsed ? '[\u25C0]' : '[\u25B2]'; // Arrow up when expanded

      if(value.collapsed){
        content.innerHTML = "";
        node.style.display = "inline-block";
        node.style.width = "auto";
        // node.style.lineHeight = "0px";
      }else{
        node.style.display = "block";
        node.style.width = "100%";
        // node.style.lineHeight = "normal";

        (async ()=>{
          let bv = new Block_Visual( await BLOCKS(value.id), content );
          bv.updateAll();
          content.querySelector('.ql-editor').contentEditable = 'false';
        })();

        // content.innerHTML = `Loading board ${value.id}...`;
        // setTimeout(() => {  content.innerHTML = `Board ${value.id} content loaded.`;}, 1000);
      }
    });
    content.addEventListener('mousedown', (ev)=>{
      let editor = content.querySelector('.ql-editor');
      if(editor) editor.contentEditable = 'true';
      console.log("CLIIIIIIIIIIIIIIIIIIIIIIIICK");
    });
    content.addEventListener('focusout', (ev)=>{
      let editor = content.querySelector('.ql-editor');
      if(editor) editor.contentEditable = 'false';
      console.log("BLUUUUUUUUUUUUUR");
    });

    node.style = `display: inline-block; line-height: 0px; user-select: none; padding: 5px; border: 1px solid #ccc; border-radius: 4px; background-color: #f9f9f9;`;
    //node.style = `padding: 5px; border: 1px solid #ccc; border-radius: 4px; background-color: #f9f9f9;`;
    console.log("Created node",node,"content",content);
    
    return node;
  }

  static formats(node) {
    return {
      collapsed: node.dataset.expanded !== 'true',
      id: node.getAttribute('data-pboard-board-id'),
    };
  }

  static value(node) {
    return {
      collapsed: node.dataset.expanded !== 'true',
      id: node.getAttribute('data-pboard-board-id'),
    };
  }
}
Quill.register({ 'formats/inline-pboard-block': PboardInlineBlock });
